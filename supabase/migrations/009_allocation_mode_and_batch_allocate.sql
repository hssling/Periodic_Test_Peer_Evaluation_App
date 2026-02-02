-- Migration: Allocation mode + batch allocation RPC

ALTER TABLE tests
ADD COLUMN IF NOT EXISTS auto_allocate_on_end BOOLEAN DEFAULT true;

CREATE OR REPLACE FUNCTION allocate_pending_evaluations(
    p_test_id UUID,
    p_force BOOLEAN DEFAULT false
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER := 0;
    v_attempt RECORD;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can allocate evaluations.';
    END IF;

    FOR v_attempt IN (
        SELECT a.id
        FROM attempts a
        WHERE a.test_id = p_test_id
        AND a.status IN ('submitted', 'evaluated')
        AND (
            p_force
            OR NOT EXISTS (
                SELECT 1 FROM allocations al
                WHERE al.attempt_id = a.id
            )
        )
    )
    LOOP
        BEGIN
            PERFORM allocate_peer_evaluators(v_attempt.id);
            v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
            INSERT INTO audit_logs (action_type, payload)
            VALUES ('allocation_failed', jsonb_build_object(
                'attempt_id', v_attempt.id,
                'test_id', p_test_id,
                'error', SQLERRM
            ));
        END;
    END LOOP;

    RETURN v_count;
END;
$$;
