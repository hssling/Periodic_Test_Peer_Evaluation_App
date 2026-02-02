-- Migration: Allow admins to delete test-related data

DROP POLICY IF EXISTS "attempts_delete_admin" ON attempts;
CREATE POLICY "attempts_delete_admin" ON attempts
    FOR DELETE
    USING (is_admin());

DROP POLICY IF EXISTS "responses_delete_admin" ON responses;
CREATE POLICY "responses_delete_admin" ON responses
    FOR DELETE
    USING (is_admin());

DROP POLICY IF EXISTS "allocations_delete_admin" ON allocations;
CREATE POLICY "allocations_delete_admin" ON allocations
    FOR DELETE
    USING (is_admin());

DROP POLICY IF EXISTS "evaluations_delete_admin" ON evaluations;
CREATE POLICY "evaluations_delete_admin" ON evaluations
    FOR DELETE
    USING (is_admin());

DROP POLICY IF EXISTS "evaluation_items_delete_admin" ON evaluation_items;
CREATE POLICY "evaluation_items_delete_admin" ON evaluation_items
    FOR DELETE
    USING (is_admin());

DROP POLICY IF EXISTS "attempt_files_delete_admin" ON attempt_files;
CREATE POLICY "attempt_files_delete_admin" ON attempt_files
    FOR DELETE
    USING (is_admin());

DROP POLICY IF EXISTS "questions_delete_admin" ON questions;
CREATE POLICY "questions_delete_admin" ON questions
    FOR DELETE
    USING (is_admin());

DROP POLICY IF EXISTS "rubrics_delete_admin" ON rubrics;
CREATE POLICY "rubrics_delete_admin" ON rubrics
    FOR DELETE
    USING (is_admin());
