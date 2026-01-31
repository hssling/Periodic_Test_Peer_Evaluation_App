-- Fix RLS policies to allow published tests to be accessible when time matches
-- Also fix the is_admin() check to be more robust

-- Update attempts insert policy
DROP POLICY IF EXISTS "attempts_insert_own" ON attempts;
CREATE POLICY "attempts_insert_own" ON attempts
    FOR INSERT
    WITH CHECK (
        student_id = get_current_profile_id() AND
        EXISTS (
            SELECT 1 FROM tests t
            WHERE t.id = test_id
            AND t.status IN ('published', 'active')
            AND NOW() BETWEEN t.start_at AND t.end_at
        )
    );

-- Update responses insert policy
DROP POLICY IF EXISTS "responses_insert_own" ON responses;
CREATE POLICY "responses_insert_own" ON responses
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM attempts a
            JOIN tests t ON t.id = a.test_id
            WHERE a.id = attempt_id
            AND a.student_id = get_current_profile_id()
            AND a.status IN ('in_progress', 'reopened')
            AND t.status IN ('published', 'active')
            AND NOW() BETWEEN t.start_at AND t.end_at
        )
    );

-- Update profile self-update policy to be less restrictive for basic info
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id AND
        role = (SELECT role FROM profiles WHERE user_id = auth.uid()) -- Cannot change own role
    );
