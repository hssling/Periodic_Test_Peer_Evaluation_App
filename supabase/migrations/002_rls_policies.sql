-- Migration: 002_rls_policies
-- Description: Row Level Security policies for all tables
-- Created: 2024-01-01

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "profiles_select_admin" ON profiles
    FOR SELECT
    USING (is_admin());

-- Users can update limited fields on their own profile
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id AND
        role = (SELECT role FROM profiles WHERE user_id = auth.uid()) AND
        roll_no IS NOT DISTINCT FROM (SELECT roll_no FROM profiles WHERE user_id = auth.uid())
    );

-- Admins can update all profiles
CREATE POLICY "profiles_update_admin" ON profiles
    FOR UPDATE
    USING (is_admin());

-- Admins can insert profiles
CREATE POLICY "profiles_insert_admin" ON profiles
    FOR INSERT
    WITH CHECK (is_admin());

-- Allow profile creation during signup (handled by trigger, but needed for service role)
CREATE POLICY "profiles_insert_service" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Admins can delete profiles
CREATE POLICY "profiles_delete_admin" ON profiles
    FOR DELETE
    USING (is_admin());

-- =====================================================
-- TESTS POLICIES
-- =====================================================

-- Everyone can view published/active/closed tests
CREATE POLICY "tests_select_published" ON tests
    FOR SELECT
    USING (
        status IN ('published', 'active', 'closed') OR
        is_admin()
    );

-- Admins can insert tests
CREATE POLICY "tests_insert_admin" ON tests
    FOR INSERT
    WITH CHECK (is_admin());

-- Admins can update tests
CREATE POLICY "tests_update_admin" ON tests
    FOR UPDATE
    USING (is_admin());

-- Admins can delete tests
CREATE POLICY "tests_delete_admin" ON tests
    FOR DELETE
    USING (is_admin());

-- =====================================================
-- QUESTIONS POLICIES
-- =====================================================

-- Users can view questions for tests they can access
CREATE POLICY "questions_select_via_test" ON questions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tests t
            WHERE t.id = questions.test_id
            AND (t.status IN ('published', 'active', 'closed') OR is_admin())
        )
    );

-- Admins can manage questions
CREATE POLICY "questions_insert_admin" ON questions
    FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "questions_update_admin" ON questions
    FOR UPDATE
    USING (is_admin());

CREATE POLICY "questions_delete_admin" ON questions
    FOR DELETE
    USING (is_admin());

-- =====================================================
-- RUBRICS POLICIES
-- =====================================================

-- Users can view rubrics for accessible tests
CREATE POLICY "rubrics_select_via_test" ON rubrics
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tests t
            WHERE t.id = rubrics.test_id
            AND (t.status IN ('published', 'active', 'closed') OR is_admin())
        )
    );

-- Admins can manage rubrics
CREATE POLICY "rubrics_admin_all" ON rubrics
    FOR ALL
    USING (is_admin());

-- =====================================================
-- ATTEMPTS POLICIES
-- =====================================================

-- Students can view their own attempts
CREATE POLICY "attempts_select_own" ON attempts
    FOR SELECT
    USING (
        student_id = get_current_profile_id() OR
        is_admin()
    );

-- Students can create attempts for themselves
CREATE POLICY "attempts_insert_own" ON attempts
    FOR INSERT
    WITH CHECK (
        student_id = get_current_profile_id() AND
        EXISTS (
            SELECT 1 FROM tests t
            WHERE t.id = test_id
            AND t.status = 'active'
            AND NOW() BETWEEN t.start_at AND t.end_at
        )
    );

-- Students can update their own in-progress attempts
CREATE POLICY "attempts_update_own" ON attempts
    FOR UPDATE
    USING (
        student_id = get_current_profile_id() AND
        status IN ('in_progress', 'reopened')
    )
    WITH CHECK (student_id = get_current_profile_id());

-- Admins can update any attempt (for reopening)
CREATE POLICY "attempts_update_admin" ON attempts
    FOR UPDATE
    USING (is_admin());

-- Admins can insert attempts (for testing)
CREATE POLICY "attempts_insert_admin" ON attempts
    FOR INSERT
    WITH CHECK (is_admin());

-- =====================================================
-- RESPONSES POLICIES
-- =====================================================

-- Students can view their own responses
CREATE POLICY "responses_select_own" ON responses
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM attempts a
            WHERE a.id = responses.attempt_id
            AND a.student_id = get_current_profile_id()
        ) OR
        is_admin()
    );

-- Evaluators can view responses for their allocations (via function)
CREATE POLICY "responses_select_evaluator" ON responses
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM allocations al
            WHERE al.attempt_id = responses.attempt_id
            AND al.evaluator_id = get_current_profile_id()
        )
    );

-- Students can insert responses for their own in-progress attempts
CREATE POLICY "responses_insert_own" ON responses
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM attempts a
            WHERE a.id = attempt_id
            AND a.student_id = get_current_profile_id()
            AND a.status IN ('in_progress', 'reopened')
        )
    );

-- Students can update their own responses while attempt is in progress
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

-- Admins can manage all responses
CREATE POLICY "responses_admin_all" ON responses
    FOR ALL
    USING (is_admin());

-- =====================================================
-- ALLOCATIONS POLICIES
-- =====================================================

-- Evaluators can view their own allocations
CREATE POLICY "allocations_select_own" ON allocations
    FOR SELECT
    USING (
        evaluator_id = get_current_profile_id() OR
        is_admin()
    );

-- Students can view allocations for their attempts (to see status)
CREATE POLICY "allocations_select_student" ON allocations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM attempts a
            WHERE a.id = allocations.attempt_id
            AND a.student_id = get_current_profile_id()
        )
    );

-- Evaluators can update their allocation status
CREATE POLICY "allocations_update_evaluator" ON allocations
    FOR UPDATE
    USING (evaluator_id = get_current_profile_id())
    WITH CHECK (evaluator_id = get_current_profile_id());

-- Admins can manage all allocations
CREATE POLICY "allocations_admin_all" ON allocations
    FOR ALL
    USING (is_admin());

-- =====================================================
-- EVALUATIONS POLICIES
-- =====================================================

-- Evaluators can view their own evaluations
CREATE POLICY "evaluations_select_own" ON evaluations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM allocations a
            WHERE a.id = evaluations.allocation_id
            AND a.evaluator_id = get_current_profile_id()
        ) OR
        is_admin()
    );

-- Students can view evaluations for their attempts (feedback only)
CREATE POLICY "evaluations_select_student" ON evaluations
    FOR SELECT
    USING (
        NOT is_draft AND
        EXISTS (
            SELECT 1 FROM allocations al
            JOIN attempts at ON at.id = al.attempt_id
            WHERE al.id = evaluations.allocation_id
            AND at.student_id = get_current_profile_id()
        )
    );

-- Evaluators can insert evaluations for their allocations
CREATE POLICY "evaluations_insert_own" ON evaluations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM allocations a
            WHERE a.id = allocation_id
            AND a.evaluator_id = get_current_profile_id()
            AND a.status != 'completed'
        )
    );

-- Evaluators can update their own draft evaluations
CREATE POLICY "evaluations_update_own" ON evaluations
    FOR UPDATE
    USING (
        is_draft = true AND
        EXISTS (
            SELECT 1 FROM allocations a
            WHERE a.id = evaluations.allocation_id
            AND a.evaluator_id = get_current_profile_id()
        )
    );

-- Admins can manage all evaluations
CREATE POLICY "evaluations_admin_all" ON evaluations
    FOR ALL
    USING (is_admin());

-- =====================================================
-- EVALUATION_ITEMS POLICIES
-- =====================================================

-- Access controlled via parent evaluation
CREATE POLICY "evaluation_items_via_evaluation" ON evaluation_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM evaluations e
            JOIN allocations a ON a.id = e.allocation_id
            WHERE e.id = evaluation_items.evaluation_id
            AND (
                a.evaluator_id = get_current_profile_id() OR
                is_admin()
            )
        )
    );

-- Students can view items for their evaluations
CREATE POLICY "evaluation_items_select_student" ON evaluation_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM evaluations e
            JOIN allocations al ON al.id = e.allocation_id
            JOIN attempts at ON at.id = al.attempt_id
            WHERE e.id = evaluation_items.evaluation_id
            AND e.is_draft = false
            AND at.student_id = get_current_profile_id()
        )
    );

-- Evaluators can manage items for their evaluations
CREATE POLICY "evaluation_items_evaluator_all" ON evaluation_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM evaluations e
            JOIN allocations a ON a.id = e.allocation_id
            WHERE e.id = evaluation_items.evaluation_id
            AND a.evaluator_id = get_current_profile_id()
            AND e.is_draft = true
        )
    );

-- Admins can manage all evaluation items
CREATE POLICY "evaluation_items_admin_all" ON evaluation_items
    FOR ALL
    USING (is_admin());

-- =====================================================
-- AUDIT_LOGS POLICIES
-- =====================================================

-- Only admins can read audit logs
CREATE POLICY "audit_logs_select_admin" ON audit_logs
    FOR SELECT
    USING (is_admin());

-- Everyone can insert audit logs (for their own actions)
CREATE POLICY "audit_logs_insert_all" ON audit_logs
    FOR INSERT
    WITH CHECK (
        user_id IS NULL OR 
        user_id = get_current_profile_id() OR
        is_admin()
    );

-- =====================================================
-- ANNOUNCEMENTS POLICIES
-- =====================================================

-- Users can view active announcements targeted to them
CREATE POLICY "announcements_select_active" ON announcements
    FOR SELECT
    USING (
        is_active = true AND
        (expires_at IS NULL OR expires_at > NOW()) AND
        (
            target_role IS NULL OR
            target_role = (SELECT role FROM profiles WHERE user_id = auth.uid())
        )
    );

-- Admins can view all announcements
CREATE POLICY "announcements_select_admin" ON announcements
    FOR SELECT
    USING (is_admin());

-- Admins can manage announcements
CREATE POLICY "announcements_admin_all" ON announcements
    FOR ALL
    USING (is_admin());
