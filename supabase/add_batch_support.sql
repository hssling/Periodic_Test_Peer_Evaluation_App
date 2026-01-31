-- Migration: Add target_batch to tests and rename section to user_group in terminology
-- Note: Table column names will stay for stability, but we'll use "Group" in the UI.

-- 1. Add target_batch to tests table
ALTER TABLE tests ADD COLUMN IF NOT EXISTS target_batch TEXT;

-- 2. Update allocate_peer_evaluators to prioritize batch matching
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
            -- Match batch strictly if same_batch_only or if target_batch is set
            AND (
                NOT v_same_batch_only OR 
                p.batch IS NOT DISTINCT FROM v_student_batch
            )
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
    
    RETURN;
END;
$$;
