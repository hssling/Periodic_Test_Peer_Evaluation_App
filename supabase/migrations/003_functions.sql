-- Migration: 003_functions
-- Description: Database functions for allocation, analytics, and secure operations
-- Created: 2024-01-01

-- =====================================================
-- FUNCTION: Allocate Peer Evaluators
-- Triggered when a student submits their test
-- =====================================================
CREATE OR REPLACE FUNCTION allocate_peer_evaluators(p_attempt_id UUID)
RETURNS SETOF allocations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_test_id UUID;
    v_student_id UUID;
    v_student_batch TEXT;
    v_evaluators_needed INTEGER;
    v_same_batch_only BOOLEAN;
    v_no_repeat_horizon INTEGER;
    v_eval_end_at TIMESTAMPTZ;
    v_evaluator_id UUID;
    v_allocation allocations%ROWTYPE;
BEGIN
    -- Get attempt and test details
    SELECT 
        a.test_id, a.student_id, p.batch,
        t.evaluators_per_submission, t.same_batch_only, 
        t.no_repeat_horizon, t.eval_end_at
    INTO 
        v_test_id, v_student_id, v_student_batch,
        v_evaluators_needed, v_same_batch_only,
        v_no_repeat_horizon, v_eval_end_at
    FROM attempts a
    JOIN profiles p ON p.id = a.student_id
    JOIN tests t ON t.id = a.test_id
    WHERE a.id = p_attempt_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Attempt not found: %', p_attempt_id;
    END IF;
    
    -- Find and allocate evaluators
    FOR v_evaluator_id IN (
        WITH recent_tests AS (
            -- Get recent test IDs within horizon
            SELECT id FROM tests
            WHERE id != v_test_id
            ORDER BY created_at DESC
            LIMIT v_no_repeat_horizon
        ),
        recent_pairs AS (
            -- Get evaluator-author pairs from recent tests
            SELECT DISTINCT al.evaluator_id, att.student_id
            FROM allocations al
            JOIN attempts att ON att.id = al.attempt_id
            WHERE att.test_id IN (SELECT id FROM recent_tests)
        ),
        evaluator_loads AS (
            -- Count pending allocations per evaluator
            SELECT 
                evaluator_id,
                COUNT(*) as pending_count
            FROM allocations
            WHERE status IN ('pending', 'in_progress')
            GROUP BY evaluator_id
        ),
        candidates AS (
            -- Find eligible candidates
            SELECT 
                p.id,
                COALESCE(el.pending_count, 0) as load
            FROM profiles p
            LEFT JOIN evaluator_loads el ON el.evaluator_id = p.id
            WHERE p.role = 'student'
            AND p.is_active = true
            AND p.id != v_student_id
            AND (NOT v_same_batch_only OR p.batch = v_student_batch)
            AND NOT EXISTS (
                -- Exclude recent pairs
                SELECT 1 FROM recent_pairs rp
                WHERE rp.evaluator_id = p.id
                AND rp.student_id = v_student_id
            )
            AND NOT EXISTS (
                -- Exclude already allocated for this attempt
                SELECT 1 FROM allocations al
                WHERE al.attempt_id = p_attempt_id
                AND al.evaluator_id = p.id
            )
        )
        SELECT id
        FROM candidates
        ORDER BY load ASC, RANDOM()
        LIMIT v_evaluators_needed
    )
    LOOP
        INSERT INTO allocations (
            attempt_id, evaluator_id, allocated_at, 
            status, deadline
        )
        VALUES (
            p_attempt_id, v_evaluator_id, NOW(),
            'pending', v_eval_end_at
        )
        RETURNING * INTO v_allocation;
        
        RETURN NEXT v_allocation;
    END LOOP;
    
    -- Log allocation event
    INSERT INTO audit_logs (action_type, payload)
    VALUES ('allocation_created', jsonb_build_object(
        'attempt_id', p_attempt_id,
        'test_id', v_test_id,
        'allocations_count', (SELECT COUNT(*) FROM allocations WHERE attempt_id = p_attempt_id)
    ));
    
    RETURN;
END;
$$;

-- =====================================================
-- FUNCTION: Get Anonymized Submission for Evaluation
-- =====================================================
CREATE OR REPLACE FUNCTION get_anonymized_submission(p_allocation_id UUID)
RETURNS TABLE (
    allocation_id UUID,
    submission_code TEXT,
    test_title TEXT,
    test_total_marks INTEGER,
    submitted_at TIMESTAMPTZ,
    questions JSONB,
    responses JSONB,
    rubrics JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify caller is the assigned evaluator or admin
    IF NOT EXISTS (
        SELECT 1 FROM allocations a
        WHERE a.id = p_allocation_id
        AND (
            a.evaluator_id = get_current_profile_id() OR
            is_admin()
        )
    ) THEN
        RAISE EXCEPTION 'Not authorized to view this submission';
    END IF;
    
    RETURN QUERY
    SELECT 
        al.id as allocation_id,
        'Submission-' || SUBSTRING(at.id::text, 1, 8) as submission_code,
        t.title as test_title,
        t.total_marks as test_total_marks,
        at.submitted_at,
        (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', q.id,
                    'type', q.type,
                    'prompt', q.prompt,
                    'options', q.options,
                    'max_marks', q.max_marks,
                    'order_num', q.order_num
                ) ORDER BY q.order_num
            ), '[]'::jsonb)
            FROM questions q WHERE q.test_id = t.id
        ) as questions,
        (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'question_id', r.question_id,
                    'answer_text', r.answer_text,
                    'selected_options', r.selected_options
                )
            ), '[]'::jsonb)
            FROM responses r WHERE r.attempt_id = at.id
        ) as responses,
        (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', rb.id,
                    'question_id', rb.question_id,
                    'criterion', rb.criterion,
                    'max_score', rb.max_score,
                    'descriptors', rb.descriptors,
                    'order_num', rb.order_num
                ) ORDER BY rb.order_num
            ), '[]'::jsonb)
            FROM rubrics rb WHERE rb.test_id = t.id
        ) as rubrics
    FROM allocations al
    JOIN attempts at ON al.attempt_id = at.id
    JOIN tests t ON at.test_id = t.id
    WHERE al.id = p_allocation_id;
END;
$$;

-- =====================================================
-- FUNCTION: Submit Test (with allocation trigger)
-- =====================================================
CREATE OR REPLACE FUNCTION submit_test(p_attempt_id UUID)
RETURNS attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_attempt attempts%ROWTYPE;
    v_profile_id UUID;
BEGIN
    v_profile_id := get_current_profile_id();
    
    -- Verify ownership and status
    SELECT * INTO v_attempt
    FROM attempts
    WHERE id = p_attempt_id
    AND student_id = v_profile_id
    AND status IN ('in_progress', 'reopened');
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cannot submit: attempt not found or not in progress';
    END IF;
    
    -- Update attempt status
    UPDATE attempts
    SET 
        status = 'submitted',
        submitted_at = NOW()
    WHERE id = p_attempt_id
    RETURNING * INTO v_attempt;
    
    -- Mark all responses as final
    UPDATE responses
    SET is_final = true
    WHERE attempt_id = p_attempt_id;
    
    -- Trigger peer allocation
    PERFORM allocate_peer_evaluators(p_attempt_id);
    
    -- Log submission
    INSERT INTO audit_logs (user_id, action_type, payload)
    VALUES (v_profile_id, 'test_submitted', jsonb_build_object(
        'attempt_id', p_attempt_id,
        'test_id', v_attempt.test_id,
        'time_spent_seconds', v_attempt.time_spent_seconds
    ));
    
    RETURN v_attempt;
END;
$$;

-- =====================================================
-- FUNCTION: Submit Evaluation
-- =====================================================
CREATE OR REPLACE FUNCTION submit_evaluation(p_evaluation_id UUID)
RETURNS evaluations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_evaluation evaluations%ROWTYPE;
    v_allocation allocations%ROWTYPE;
    v_allocation_id UUID;
    v_total_score INTEGER;
    v_profile_id UUID;
BEGIN
    v_profile_id := get_current_profile_id();
    
    -- First get the evaluation
    SELECT * INTO v_evaluation
    FROM evaluations
    WHERE id = p_evaluation_id
    AND is_draft = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cannot submit: evaluation not found or already submitted';
    END IF;
    
    -- Then get the allocation and verify ownership
    SELECT * INTO v_allocation
    FROM allocations
    WHERE id = v_evaluation.allocation_id
    AND evaluator_id = v_profile_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cannot submit: not authorized to submit this evaluation';
    END IF;
    
    -- Calculate total score
    SELECT COALESCE(SUM(score), 0) INTO v_total_score
    FROM evaluation_items
    WHERE evaluation_id = p_evaluation_id;
    
    -- Update evaluation
    UPDATE evaluations
    SET 
        is_draft = false,
        submitted_at = NOW(),
        total_score = v_total_score
    WHERE id = p_evaluation_id
    RETURNING * INTO v_evaluation;
    
    -- Update allocation status
    UPDATE allocations
    SET status = 'completed'
    WHERE id = v_allocation.id;
    
    -- Check if all evaluations for the attempt are complete
    IF NOT EXISTS (
        SELECT 1 FROM allocations
        WHERE attempt_id = v_allocation.attempt_id
        AND status != 'completed'
    ) THEN
        UPDATE attempts
        SET status = 'evaluated'
        WHERE id = v_allocation.attempt_id;
    END IF;
    
    -- Log evaluation submission
    INSERT INTO audit_logs (user_id, action_type, payload)
    VALUES (v_profile_id, 'evaluation_submitted', jsonb_build_object(
        'evaluation_id', p_evaluation_id,
        'allocation_id', v_allocation.id,
        'total_score', v_total_score
    ));
    
    RETURN v_evaluation;
END;
$$;

-- =====================================================
-- FUNCTION: Calculate Evaluator Metrics
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_evaluator_metrics(p_evaluator_id UUID)
RETURNS TABLE (
    leniency_score DECIMAL,
    reliability_score DECIMAL,
    total_evaluations INTEGER,
    avg_score_given DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_evals INTEGER;
    v_avg_score DECIMAL;
    v_global_avg DECIMAL;
    v_std_dev DECIMAL;
    v_leniency DECIMAL;
BEGIN
    -- Count total evaluations
    SELECT COUNT(*), AVG(e.total_score)
    INTO v_total_evals, v_avg_score
    FROM evaluations e
    JOIN allocations a ON a.id = e.allocation_id
    WHERE a.evaluator_id = p_evaluator_id
    AND e.is_draft = false;
    
    IF v_total_evals = 0 THEN
        RETURN QUERY SELECT 0::DECIMAL, 0::DECIMAL, 0, 0::DECIMAL;
        RETURN;
    END IF;
    
    -- Calculate global average and std dev
    SELECT AVG(total_score), STDDEV(total_score)
    INTO v_global_avg, v_std_dev
    FROM evaluations
    WHERE is_draft = false;
    
    -- Calculate leniency (z-score of evaluator's average)
    IF v_std_dev > 0 THEN
        v_leniency := (v_avg_score - v_global_avg) / v_std_dev;
    ELSE
        v_leniency := 0;
    END IF;
    
    -- For reliability, we'd need multiple evaluators per submission
    -- Simplified: use consistency of scores
    
    RETURN QUERY
    SELECT 
        ROUND(v_leniency, 2),
        0.8::DECIMAL, -- Placeholder for reliability
        v_total_evals,
        ROUND(v_avg_score, 2);
END;
$$;

-- =====================================================
-- FUNCTION: Get Test Analytics
-- =====================================================
CREATE OR REPLACE FUNCTION get_test_analytics(p_test_id UUID)
RETURNS TABLE (
    total_submissions INTEGER,
    pending_evaluations INTEGER,
    completed_evaluations INTEGER,
    avg_score DECIMAL,
    min_score INTEGER,
    max_score INTEGER,
    score_distribution JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH submission_stats AS (
        SELECT 
            COUNT(DISTINCT a.id) as submissions,
            COUNT(DISTINCT CASE WHEN al.status = 'pending' THEN al.id END) as pending,
            COUNT(DISTINCT CASE WHEN al.status = 'completed' THEN al.id END) as completed
        FROM attempts a
        LEFT JOIN allocations al ON al.attempt_id = a.id
        WHERE a.test_id = p_test_id
        AND a.status = 'submitted'
    ),
    score_stats AS (
        SELECT 
            AVG(e.total_score) as avg_s,
            MIN(e.total_score) as min_s,
            MAX(e.total_score) as max_s
        FROM evaluations e
        JOIN allocations al ON al.id = e.allocation_id
        JOIN attempts a ON a.id = al.attempt_id
        WHERE a.test_id = p_test_id
        AND e.is_draft = false
    ),
    distribution AS (
        SELECT jsonb_object_agg(
            score_range,
            count
        ) as dist
        FROM (
            SELECT 
                CASE 
                    WHEN e.total_score < 40 THEN '0-39'
                    WHEN e.total_score < 60 THEN '40-59'
                    WHEN e.total_score < 80 THEN '60-79'
                    ELSE '80-100'
                END as score_range,
                COUNT(*) as count
            FROM evaluations e
            JOIN allocations al ON al.id = e.allocation_id
            JOIN attempts a ON a.id = al.attempt_id
            WHERE a.test_id = p_test_id
            AND e.is_draft = false
            GROUP BY score_range
        ) ranges
    )
    SELECT 
        ss.submissions::INTEGER,
        ss.pending::INTEGER,
        ss.completed::INTEGER,
        ROUND(sc.avg_s, 2),
        sc.min_s::INTEGER,
        sc.max_s::INTEGER,
        COALESCE(d.dist, '{}'::jsonb)
    FROM submission_stats ss
    CROSS JOIN score_stats sc
    CROSS JOIN distribution d;
END;
$$;

-- =====================================================
-- FUNCTION: Get MCQ Item Analysis
-- =====================================================
CREATE OR REPLACE FUNCTION get_mcq_item_analysis(p_question_id UUID)
RETURNS TABLE (
    question_id UUID,
    total_responses INTEGER,
    option_distribution JSONB,
    difficulty_index DECIMAL,
    correct_percentage DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_question questions%ROWTYPE;
    v_total INTEGER;
    v_correct INTEGER;
BEGIN
    SELECT * INTO v_question
    FROM questions
    WHERE id = p_question_id
    AND type IN ('mcq_single', 'mcq_multi');
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Question not found or not MCQ type';
    END IF;
    
    -- Count responses
    SELECT COUNT(*) INTO v_total
    FROM responses
    WHERE question_id = p_question_id
    AND is_final = true;
    
    IF v_total = 0 THEN
        RETURN QUERY SELECT 
            p_question_id,
            0,
            '{}'::jsonb,
            0::DECIMAL,
            0::DECIMAL;
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        p_question_id,
        v_total,
        (
            SELECT jsonb_object_agg(opt_id, opt_count)
            FROM (
                SELECT 
                    opt::text as opt_id,
                    COUNT(*) as opt_count
                FROM responses r,
                     jsonb_array_elements(r.selected_options) as opt
                WHERE r.question_id = p_question_id
                AND r.is_final = true
                GROUP BY opt::text
            ) opt_counts
        ),
        ROUND(
            (
                SELECT COUNT(*)::DECIMAL / v_total
                FROM responses r
                WHERE r.question_id = p_question_id
                AND r.is_final = true
                AND r.selected_options = v_question.correct_answer
            ), 2
        ),
        ROUND(
            (
                SELECT COUNT(*)::DECIMAL * 100 / v_total
                FROM responses r
                WHERE r.question_id = p_question_id
                AND r.is_final = true
                AND r.selected_options = v_question.correct_answer
            ), 2
        );
END;
$$;

-- =====================================================
-- FUNCTION: Reopen Attempt (Admin only)
-- =====================================================
CREATE OR REPLACE FUNCTION reopen_attempt(
    p_attempt_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_attempt attempts%ROWTYPE;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can reopen attempts';
    END IF;
    
    UPDATE attempts
    SET 
        status = 'reopened',
        submitted_at = NULL
    WHERE id = p_attempt_id
    RETURNING * INTO v_attempt;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Attempt not found: %', p_attempt_id;
    END IF;
    
    -- Mark responses as non-final
    UPDATE responses
    SET is_final = false
    WHERE attempt_id = p_attempt_id;
    
    -- Expire existing allocations
    UPDATE allocations
    SET status = 'expired'
    WHERE attempt_id = p_attempt_id;
    
    -- Log action
    INSERT INTO audit_logs (user_id, action_type, payload)
    VALUES (get_current_profile_id(), 'attempt_reopened', jsonb_build_object(
        'attempt_id', p_attempt_id,
        'reason', p_reason
    ));
    
    RETURN v_attempt;
END;
$$;
