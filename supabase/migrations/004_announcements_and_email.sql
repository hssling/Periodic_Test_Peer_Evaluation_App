-- Migration: 004_announcements_and_email
-- Description: Add announcements table and email queue for the app
-- Created: 2024

-- =====================================================
-- ANNOUNCEMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_role TEXT, -- NULL means all users
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);

-- =====================================================
-- EMAIL QUEUE TABLE (for scheduled/pending emails)
-- =====================================================
CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_to TEXT[] NOT NULL,
    email_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_text TEXT NOT NULL,
    body_html TEXT,
    metadata JSONB,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    error_message TEXT,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_at);

-- =====================================================
-- AI GENERATION LOGS (track AI usage)
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    generation_type TEXT NOT NULL, -- 'question_generation', 'answer_feedback', etc.
    provider TEXT NOT NULL, -- 'openai', 'google', etc.
    input_tokens INTEGER,
    output_tokens INTEGER,
    cost_usd DECIMAL(10, 6),
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_logs_user ON ai_generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_date ON ai_generation_logs(created_at);

-- =====================================================
-- RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_logs ENABLE ROW LEVEL SECURITY;

-- Announcements: Anyone can read active announcements, admins can manage
CREATE POLICY "Active announcements are viewable by everyone" 
ON announcements FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage announcements" 
ON announcements FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.role IN ('admin', 'faculty')
    )
);

-- Email queue: Only admins can access
CREATE POLICY "Only admins can access email queue" 
ON email_queue FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- AI logs: Users can see their own, admins can see all
CREATE POLICY "Users can view own AI logs" 
ON ai_generation_logs FOR SELECT 
USING (
    user_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all AI logs" 
ON ai_generation_logs FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Users can insert their own AI logs
CREATE POLICY "Users can create AI logs" 
ON ai_generation_logs FOR INSERT 
WITH CHECK (
    user_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
    )
);
