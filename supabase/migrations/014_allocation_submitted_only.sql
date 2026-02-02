-- Migration: Allocate only among submitted students and allow partial allocations

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
    v_target_batch TEXT;
    v_evaluators_needed INTEGER;
    v_same_batch_only BOOLEAN;
    v_no_repeat_horizon INTEGER;
    v_eval_end_at TIMESTAMPTZ;
    v_evaluator_id UUID;
    v_allocation allocations%ROWTYPE;
    v_available INTEGER;
    v_limit INTEGER;
BEGIN
    SELECT 
        a.test_id, a.student_id, p.batch,
        t.target_batch, t.evaluators_per_submission, t.same_batch_only, 
        t.no_repeat_horizon, t.eval_end_at
    INTO 
        v_test_id, v_student_id, v_student_batch,
        v_target_batch, v_evaluators_needed, v_same_batch_only,
        v_no_repeat_horizon, v_eval_end_at
    FROM attempts a
    JOIN profiles p ON p.id = a.student_id
    JOIN tests t ON t.id = a.test_id
    WHERE a.id = p_attempt_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Attempt not found: %', p_attempt_id;
    END IF;

    WITH recent_tests AS (
        SELECT id FROM tests
        WHERE id != v_test_id
        ORDER BY created_at DESC
        LIMIT v_no_repeat_horizon
    ),
    recent_pairs AS (
        SELECT DISTINCT al.evaluator_id, att.student_id
        FROM allocations al
        JOIN attempts att ON att.id = al.attempt_id
        WHERE att.test_id IN (SELECT id FROM recent_tests)
    ),
    evaluator_loads AS (
        SELECT evaluator_id, COUNT(*) as pending_count
        FROM allocations
        WHERE status IN ('pending', 'in_progress')
        GROUP BY evaluator_id
    ),
    submitted_students AS (
        SELECT DISTINCT a.student_id
        FROM attempts a
        WHERE a.test_id = v_test_id
        AND a.status IN ('submitted', 'evaluated')
    ),
    candidates AS (
        SELECT p.id
        FROM profiles p
        JOIN submitted_students ss ON ss.student_id = p.id
        LEFT JOIN evaluator_loads el ON el.evaluator_id = p.id
        WHERE p.role = 'student'
        AND p.is_active = true
        AND p.id != v_student_id
        AND (v_target_batch IS NULL OR p.batch IS NOT DISTINCT FROM v_target_batch)
        AND (NOT v_same_batch_only OR p.batch IS NOT DISTINCT FROM v_student_batch)
        AND NOT EXISTS (
            SELECT 1 FROM recent_pairs rp
            WHERE rp.evaluator_id = p.id
            AND rp.student_id = v_student_id
        )
        AND NOT EXISTS (
            SELECT 1 FROM allocations al
            WHERE al.attempt_id = p_attempt_id
            AND al.evaluator_id = p.id
        )
    )
    SELECT COUNT(*) INTO v_available FROM candidates;

    IF v_available = 0 THEN
        INSERT INTO audit_logs (action_type, payload)
        VALUES ('allocation_insufficient', jsonb_build_object(
            'attempt_id', p_attempt_id,
            'test_id', v_test_id,
            'needed', v_evaluators_needed,
            'available', v_available
        ));
        RETURN;
    END IF;

    v_limit := LEAST(v_evaluators_needed, v_available);
    v_limit := GREATEST(v_limit, 1);
    
    FOR v_evaluator_id IN (
        WITH recent_tests AS (
            SELECT id FROM tests
            WHERE id != v_test_id
            ORDER BY created_at DESC
            LIMIT v_no_repeat_horizon
        ),
        recent_pairs AS (
            SELECT DISTINCT al.evaluator_id, att.student_id
            FROM allocations al
            JOIN attempts att ON att.id = al.attempt_id
            WHERE att.test_id IN (SELECT id FROM recent_tests)
        ),
        evaluator_loads AS (
            SELECT evaluator_id, COUNT(*) as pending_count
            FROM allocations
            WHERE status IN ('pending', 'in_progress')
            GROUP BY evaluator_id
        ),
        submitted_students AS (
            SELECT DISTINCT a.student_id
            FROM attempts a
            WHERE a.test_id = v_test_id
            AND a.status IN ('submitted', 'evaluated')
        ),
        candidates AS (
            SELECT 
                p.id,
                COALESCE(el.pending_count, 0) as load
            FROM profiles p
            JOIN submitted_students ss ON ss.student_id = p.id
            LEFT JOIN evaluator_loads el ON el.evaluator_id = p.id
            WHERE p.role = 'student'
            AND p.is_active = true
            AND p.id != v_student_id
            AND (v_target_batch IS NULL OR p.batch IS NOT DISTINCT FROM v_target_batch)
            AND (NOT v_same_batch_only OR p.batch IS NOT DISTINCT FROM v_student_batch)
            AND NOT EXISTS (
                SELECT 1 FROM recent_pairs rp
                WHERE rp.evaluator_id = p.id
                AND rp.student_id = v_student_id
            )
            AND NOT EXISTS (
                SELECT 1 FROM allocations al
                WHERE al.attempt_id = p_attempt_id
                AND al.evaluator_id = p.id
            )
        )
        SELECT id
        FROM candidates
        ORDER BY load ASC, RANDOM()
        LIMIT v_limit
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
    
    INSERT INTO audit_logs (action_type, payload)
    VALUES ('allocation_created', jsonb_build_object(
        'attempt_id', p_attempt_id,
        'test_id', v_test_id,
        'allocations_count', (SELECT COUNT(*) FROM allocations WHERE attempt_id = p_attempt_id)
    ));
    
    RETURN;
END;
$$;
