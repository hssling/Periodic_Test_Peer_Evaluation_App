-- Migration: Response attachments + safer submission/allocations

-- =====================================================
-- ATTACHMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS attempt_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES attempts(id) ON DELETE CASCADE NOT NULL,
    uploader_id UUID REFERENCES profiles(id) NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attempt_files_attempt_id ON attempt_files(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_files_uploader_id ON attempt_files(uploader_id);

ALTER TABLE attempt_files ENABLE ROW LEVEL SECURITY;

-- Students can insert files for their own attempts
CREATE POLICY "attempt_files_insert_own" ON attempt_files
    FOR INSERT
    WITH CHECK (
        uploader_id = get_current_profile_id()
        AND EXISTS (
            SELECT 1 FROM attempts a
            WHERE a.id = attempt_files.attempt_id
            AND a.student_id = get_current_profile_id()
            AND a.status IN ('in_progress', 'reopened', 'submitted')
        )
    );

-- Students can view their own attempt files
CREATE POLICY "attempt_files_select_own" ON attempt_files
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM attempts a
            WHERE a.id = attempt_files.attempt_id
            AND a.student_id = get_current_profile_id()
        )
        OR is_admin()
    );

-- Evaluators can view files for allocated attempts
CREATE POLICY "attempt_files_select_evaluator" ON attempt_files
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM allocations al
            WHERE al.attempt_id = attempt_files.attempt_id
            AND al.evaluator_id = get_current_profile_id()
        )
    );

-- Admins can manage all attempt files
CREATE POLICY "attempt_files_admin_all" ON attempt_files
    FOR ALL
    USING (is_admin());

-- =====================================================
-- STORAGE BUCKET + POLICIES
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('attempt-uploads', 'attempt-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Allow students to upload their own attempt files
CREATE POLICY "attempt_uploads_insert_own" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'attempt-uploads'
        AND EXISTS (
            SELECT 1 FROM attempt_files f
            WHERE f.file_path = storage.objects.name
            AND f.uploader_id = get_current_profile_id()
        )
    );

-- Allow students/evaluators/admins to read files they are allowed to access
CREATE POLICY "attempt_uploads_select_authorized" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'attempt-uploads'
        AND EXISTS (
            SELECT 1
            FROM attempt_files f
            JOIN attempts a ON a.id = f.attempt_id
            LEFT JOIN allocations al ON al.attempt_id = f.attempt_id
            WHERE f.file_path = storage.objects.name
            AND (
                a.student_id = get_current_profile_id()
                OR al.evaluator_id = get_current_profile_id()
                OR is_admin()
            )
        )
    );

-- =====================================================
-- SAFE SUBMISSION (DO NOT FAIL ON ALLOCATION)
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

    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'User profile not found. Please log in again.';
    END IF;

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

    UPDATE attempts
    SET
        status = 'submitted',
        submitted_at = NOW()
    WHERE id = p_attempt_id
    RETURNING * INTO v_attempt;

    UPDATE responses
    SET is_final = true
    WHERE attempt_id = p_attempt_id;

    BEGIN
        PERFORM allocate_peer_evaluators(p_attempt_id);
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO audit_logs (user_id, action_type, payload)
        VALUES (v_profile_id, 'allocation_failed', jsonb_build_object(
            'attempt_id', p_attempt_id,
            'error', SQLERRM
        ));
    END;

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
-- INCLUDE ATTACHMENTS IN EVALUATION PAYLOAD
-- =====================================================
DROP FUNCTION IF EXISTS get_anonymized_submission(UUID);
CREATE OR REPLACE FUNCTION get_anonymized_submission(p_allocation_id UUID)
RETURNS TABLE (
    allocation_id UUID,
    submission_code TEXT,
    test_title TEXT,
    test_total_marks INTEGER,
    submitted_at TIMESTAMPTZ,
    questions JSONB,
    responses JSONB,
    rubrics JSONB,
    attachments JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
        ) as rubrics,
        (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', f.id,
                    'file_name', f.file_name,
                    'file_path', f.file_path,
                    'mime_type', f.mime_type,
                    'size_bytes', f.size_bytes,
                    'created_at', f.created_at
                ) ORDER BY f.created_at
            ), '[]'::jsonb)
            FROM attempt_files f WHERE f.attempt_id = at.id
        ) as attachments
    FROM allocations al
    JOIN attempts at ON al.attempt_id = at.id
    JOIN tests t ON at.test_id = t.id
    WHERE al.id = p_allocation_id;
END;
$$;
