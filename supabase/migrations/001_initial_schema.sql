-- Migration: 001_initial_schema
-- Description: Create initial database schema for Periodic Test Peer Evaluation App
-- Created: 2024-01-01

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE
-- =====================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('student', 'admin', 'faculty')),
    roll_no TEXT UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    batch TEXT,
    section TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_batch ON profiles(batch);
CREATE INDEX idx_profiles_roll_no ON profiles(roll_no);

-- =====================================================
-- TESTS TABLE
-- =====================================================
CREATE TABLE tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    total_marks INTEGER NOT NULL CHECK (total_marks > 0),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'active', 'closed', 'archived')),
    evaluators_per_submission INTEGER DEFAULT 1 CHECK (evaluators_per_submission >= 1),
    same_batch_only BOOLEAN DEFAULT true,
    no_repeat_horizon INTEGER DEFAULT 3,
    eval_start_at TIMESTAMPTZ,
    eval_end_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tests_status ON tests(status);
CREATE INDEX idx_tests_dates ON tests(start_at, end_at);
CREATE INDEX idx_tests_created_by ON tests(created_by);

-- =====================================================
-- QUESTIONS TABLE
-- =====================================================
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('mcq_single', 'mcq_multi', 'short', 'long')),
    prompt TEXT NOT NULL,
    options JSONB, -- Array of {id, text} for MCQ
    correct_answer JSONB, -- Correct option ID(s) or expected answer
    max_marks INTEGER NOT NULL CHECK (max_marks > 0),
    order_num INTEGER NOT NULL,
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_questions_test_id ON questions(test_id);
CREATE INDEX idx_questions_order ON questions(test_id, order_num);

-- =====================================================
-- RUBRICS TABLE (Optional per-question criteria)
-- =====================================================
CREATE TABLE rubrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    criterion TEXT NOT NULL,
    max_score INTEGER NOT NULL CHECK (max_score > 0),
    descriptors JSONB, -- {score: description} mapping
    order_num INTEGER NOT NULL DEFAULT 0
);

-- Indexes
CREATE INDEX idx_rubrics_test_id ON rubrics(test_id);
CREATE INDEX idx_rubrics_question_id ON rubrics(question_id);

-- =====================================================
-- ATTEMPTS TABLE
-- =====================================================
CREATE TABLE attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES tests(id) NOT NULL,
    student_id UUID REFERENCES profiles(id) NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'evaluated', 'reopened')),
    time_spent_seconds INTEGER DEFAULT 0,
    tab_switches INTEGER DEFAULT 0,
    paste_attempts INTEGER DEFAULT 0,
    violations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One attempt per student per test (except reopened)
    UNIQUE(test_id, student_id)
);

-- Indexes
CREATE INDEX idx_attempts_test_id ON attempts(test_id);
CREATE INDEX idx_attempts_student_id ON attempts(student_id);
CREATE INDEX idx_attempts_status ON attempts(status);

-- =====================================================
-- RESPONSES TABLE
-- =====================================================
CREATE TABLE responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES attempts(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES questions(id) NOT NULL,
    answer_text TEXT,
    selected_options JSONB, -- Array of selected option IDs
    saved_at TIMESTAMPTZ DEFAULT NOW(),
    is_final BOOLEAN DEFAULT false,
    
    -- One response per question per attempt
    UNIQUE(attempt_id, question_id)
);

-- Indexes
CREATE INDEX idx_responses_attempt_id ON responses(attempt_id);
CREATE INDEX idx_responses_question_id ON responses(question_id);

-- =====================================================
-- ALLOCATIONS TABLE
-- =====================================================
CREATE TABLE allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES attempts(id) NOT NULL,
    evaluator_id UUID REFERENCES profiles(id) NOT NULL,
    allocated_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'expired')),
    deadline TIMESTAMPTZ,
    
    -- One allocation per evaluator per attempt
    UNIQUE(attempt_id, evaluator_id)
);

-- Indexes
CREATE INDEX idx_allocations_attempt_id ON allocations(attempt_id);
CREATE INDEX idx_allocations_evaluator_id ON allocations(evaluator_id);
CREATE INDEX idx_allocations_status ON allocations(status);

-- =====================================================
-- EVALUATIONS TABLE
-- =====================================================
CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_id UUID REFERENCES allocations(id) ON DELETE CASCADE NOT NULL UNIQUE,
    submitted_at TIMESTAMPTZ,
    overall_feedback TEXT,
    total_score INTEGER,
    is_draft BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_evaluations_allocation_id ON evaluations(allocation_id);

-- =====================================================
-- EVALUATION_ITEMS TABLE
-- =====================================================
CREATE TABLE evaluation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID REFERENCES evaluations(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES questions(id) NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0),
    feedback TEXT,
    
    -- One item per question per evaluation
    UNIQUE(evaluation_id, question_id)
);

-- Indexes
CREATE INDEX idx_evaluation_items_evaluation_id ON evaluation_items(evaluation_id);

-- =====================================================
-- AUDIT_LOGS TABLE
-- =====================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    action_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =====================================================
-- ANNOUNCEMENTS TABLE
-- =====================================================
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_role TEXT, -- null = all users
    created_by UUID REFERENCES profiles(id) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_announcements_active ON announcements(is_active, expires_at);

-- =====================================================
-- TRIGGER: Update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tests_updated_at
    BEFORE UPDATE ON tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluations_updated_at
    BEFORE UPDATE ON evaluations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TRIGGER: Create profile on user signup
-- =====================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- FUNCTION: Get profile ID for current user
-- =====================================================
CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM profiles WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Check if current user is admin
-- =====================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'faculty')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
