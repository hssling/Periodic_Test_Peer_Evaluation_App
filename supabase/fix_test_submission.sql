-- Improvements to Peer Evaluation Allocation and Test Submission

-- 1. Fix Null-safe batch comparison in allocation
-- If batch is null for both (e.g. guest students), they should still be paired if same_batch_only is true
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
            AND (NOT v_same_batch_only OR p.batch IS NOT DISTINCT FROM v_student_batch)
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

-- 2. Update responses_update_own policy to be more robust
-- Explicitly handle cases where multiple responses are submitted at once
DROP POLICY IF EXISTS "responses_update_own" ON responses;
CREATE POLICY "responses_update_own" ON responses
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM attempts a
            WHERE a.id = responses.attempt_id
            AND a.student_id = get_current_profile_id()
            AND a.status IN ('in_progress', 'reopened')
        )
    );

-- 3. Improve submit_test to be more descriptive
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
    
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'User profile not found. Please log in again.';
    END IF;

    -- Verify ownership and status
    SELECT * INTO v_attempt
    FROM attempts
    WHERE id = p_attempt_id
    AND student_id = v_profile_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Attempt not found for your account.';
    END IF;

    IF v_attempt.status NOT IN ('in_progress', 'reopened') THEN
        RAISE EXCEPTION 'Cannot submit: This test has already been %.', v_attempt.status;
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
    -- We wrap this in a safe block so submission doesn't fail even if allocation fails
    BEGIN
        PERFORM allocate_peer_evaluators(p_attempt_id);
    EXCEPTION WHEN OTHERS THEN
        -- Log allocation error but don't prevent submission
        INSERT INTO audit_logs (user_id, action_type, payload)
        VALUES (v_profile_id, 'allocation_failed', jsonb_build_object(
            'attempt_id', p_attempt_id,
            'error', SQLERRM
        ));
    END;
    
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

-- 4. Improve submit_evaluation to calculate final_score
CREATE OR REPLACE FUNCTION submit_evaluation(p_evaluation_id UUID)
RETURNS evaluations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_evaluation evaluations%ROWTYPE;
    v_allocation allocations%ROWTYPE;
    v_total_score INTEGER;
    v_profile_id UUID;
    v_avg_score NUMERIC;
BEGIN
    v_profile_id := get_current_profile_id();
    
    -- Verify ownership and draft status
    SELECT e.* INTO v_evaluation
    FROM evaluations e
    JOIN allocations al ON al.id = e.allocation_id
    WHERE e.id = p_evaluation_id
    AND al.evaluator_id = v_profile_id
    AND e.is_draft = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Evaluation not found, not a draft, or not yours.';
    END IF;
    
    -- Calculate total score from items
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
    WHERE id = v_evaluation.allocation_id
    RETURNING * INTO v_allocation;
    
    -- Check if all evaluations for this attempt are complete
    IF NOT EXISTS (
        SELECT 1 FROM allocations
        WHERE attempt_id = v_allocation.attempt_id
        AND status != 'completed'
    ) THEN
        -- Calculate the average score from all COMPLETED allocations for this attempt
        SELECT AVG(e.total_score) INTO v_avg_score
        FROM allocations al
        JOIN evaluations e ON e.allocation_id = al.id
        WHERE al.attempt_id = v_allocation.attempt_id
        AND al.status = 'completed'
        AND e.is_draft = false;

        -- Finalize the attempt
        UPDATE attempts
        SET 
            status = 'evaluated',
            final_score = v_avg_score
        WHERE id = v_allocation.attempt_id;
    END IF;
    
    -- Log submission
    INSERT INTO audit_logs (user_id, action_type, payload)
    VALUES (v_profile_id, 'evaluation_submitted', jsonb_build_object(
        'evaluation_id', p_evaluation_id,
        'allocation_id', v_allocation.id,
        'total_score', v_total_score,
        'attempt_id', v_allocation.attempt_id
    ));
    
    RETURN v_evaluation;
END;
$$;

