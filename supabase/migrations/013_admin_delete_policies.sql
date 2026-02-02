-- Migration: Allow admins to delete test-related data

CREATE POLICY "attempts_delete_admin" ON attempts
    FOR DELETE
    USING (is_admin());

CREATE POLICY "responses_delete_admin" ON responses
    FOR DELETE
    USING (is_admin());

CREATE POLICY "allocations_delete_admin" ON allocations
    FOR DELETE
    USING (is_admin());

CREATE POLICY "evaluations_delete_admin" ON evaluations
    FOR DELETE
    USING (is_admin());

CREATE POLICY "evaluation_items_delete_admin" ON evaluation_items
    FOR DELETE
    USING (is_admin());

CREATE POLICY "attempt_files_delete_admin" ON attempt_files
    FOR DELETE
    USING (is_admin());

CREATE POLICY "questions_delete_admin" ON questions
    FOR DELETE
    USING (is_admin());

CREATE POLICY "rubrics_delete_admin" ON rubrics
    FOR DELETE
    USING (is_admin());
