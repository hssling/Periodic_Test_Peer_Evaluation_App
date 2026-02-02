-- Migration: Relax profile self-update constraints for batch/section/roll_no

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id AND
        role = (SELECT role FROM profiles WHERE user_id = auth.uid())
    );
