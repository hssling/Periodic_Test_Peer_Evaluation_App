# Row Level Security (RLS) Policies

## Overview

All tables have RLS enabled. Policies follow the principle of least privilege.

## Policy Summary

| Table | Role | SELECT | INSERT | UPDATE | DELETE |
|-------|------|--------|--------|--------|--------|
| profiles | student | Own only | - | Own limited | - |
| profiles | admin | All | All | All | All |
| tests | student | Published/Active | - | - | - |
| tests | admin | All | All | All | All |
| questions | student | Own test's | - | - | - |
| questions | admin | All | All | All | All |
| attempts | student | Own only | Own only | Own only | - |
| attempts | admin | All | All | All | All |
| responses | student | Own only | Own only | Own only | - |
| responses | admin | All | All | All | - |
| allocations | student | Assigned to self | - | - | - |
| allocations | admin | All | All | All | All |
| evaluations | student | Own evals + received (masked) | Own allocations | Own drafts | - |
| evaluations | admin | All | All | All | All |
| evaluation_items | student | Via evaluation access | Via evaluation | Via evaluation | - |
| evaluation_items | admin | All | All | All | All |
| audit_logs | student | - | Auto only | - | - |
| audit_logs | admin | All | All | - | - |
| announcements | student | Active + target | - | - | - |
| announcements | admin | All | All | All | All |

## Detailed Policies

### profiles

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Students can view their own profile
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Students can update limited fields on their own profile
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id AND
        -- Cannot change role, roll_no
        role = (SELECT role FROM profiles WHERE user_id = auth.uid()) AND
        roll_no = (SELECT roll_no FROM profiles WHERE user_id = auth.uid())
    );

-- Admins have full access
CREATE POLICY "profiles_admin_all" ON profiles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'faculty')
        )
    );

-- Allow profile creation during signup (service role handles this)
CREATE POLICY "profiles_insert_self" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

### tests

```sql
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;

-- Students can view published/active tests
CREATE POLICY "tests_select_published" ON tests
    FOR SELECT
    USING (
        status IN ('published', 'active', 'closed') OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'faculty')
        )
    );

-- Only admins can modify tests
CREATE POLICY "tests_admin_modify" ON tests
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'faculty')
        )
    );
```

### questions

```sql
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Students can view questions for tests they can access
CREATE POLICY "questions_select_via_test" ON questions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tests t
            WHERE t.id = questions.test_id
            AND t.status IN ('published', 'active', 'closed')
        ) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'faculty')
        )
    );

-- Only admins can modify questions
CREATE POLICY "questions_admin_modify" ON questions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'faculty')
        )
    );
```

### attempts

```sql
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;

-- Students can view their own attempts
CREATE POLICY "attempts_select_own" ON attempts
    FOR SELECT
    USING (
        student_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'faculty')
        )
    );

-- Students can create attempts for themselves
CREATE POLICY "attempts_insert_own" ON attempts
    FOR INSERT
    WITH CHECK (
        student_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) AND
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
        student_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) AND
        status = 'in_progress'
    )
    WITH CHECK (
        student_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    );

-- Admins have full access
CREATE POLICY "attempts_admin_all" ON attempts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'faculty')
        )
    );
```

### responses

```sql
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Students can view their own responses
CREATE POLICY "responses_select_own" ON responses
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM attempts a
            WHERE a.id = responses.attempt_id
            AND a.student_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'faculty')
        )
    );

-- Students can insert responses for their own in-progress attempts
CREATE POLICY "responses_insert_own" ON responses
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM attempts a
            WHERE a.id = attempt_id
            AND a.student_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
            AND a.status = 'in_progress'
        )
    );

-- Students can update their own responses while attempt is in progress
CREATE POLICY "responses_update_own" ON responses
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM attempts a
            WHERE a.id = responses.attempt_id
            AND a.student_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
            AND a.status = 'in_progress'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM attempts a
            WHERE a.id = responses.attempt_id
            AND a.student_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
            AND a.status = 'in_progress'
        )
    );

-- Admins have full access
CREATE POLICY "responses_admin_all" ON responses
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'faculty')
        )
    );
```

### allocations

```sql
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;

-- Students can view allocations assigned to them
CREATE POLICY "allocations_select_assigned" ON allocations
    FOR SELECT
    USING (
        evaluator_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'faculty')
        )
    );

-- Only admins/system can create allocations
CREATE POLICY "allocations_admin_modify" ON allocations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'faculty')
        )
    );
```

### evaluations (Critical for blinding)

```sql
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

-- Students can view:
-- 1. Evaluations they have created (as evaluator)
-- 2. Evaluations for their own attempts (as evaluated student, via view)
CREATE POLICY "evaluations_select_own_created" ON evaluations
    FOR SELECT
    USING (
        -- Evaluator can see their own evaluations
        EXISTS (
            SELECT 1 FROM allocations a
            WHERE a.id = evaluations.allocation_id
            AND a.evaluator_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        ) OR
        -- Admin sees all
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'faculty')
        )
    );

-- NOTE: Students see received evaluations through evaluation_results_view
-- which strips evaluator identity

-- Students can insert/update evaluations for their allocations
CREATE POLICY "evaluations_insert_own" ON evaluations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM allocations a
            WHERE a.id = allocation_id
            AND a.evaluator_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
            AND a.status != 'completed'
        )
    );

CREATE POLICY "evaluations_update_own" ON evaluations
    FOR UPDATE
    USING (
        is_draft = true AND
        EXISTS (
            SELECT 1 FROM allocations a
            WHERE a.id = evaluations.allocation_id
            AND a.evaluator_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        )
    );

-- Admins have full access
CREATE POLICY "evaluations_admin_all" ON evaluations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'faculty')
        )
    );
```

### evaluation_items

```sql
ALTER TABLE evaluation_items ENABLE ROW LEVEL SECURITY;

-- Access controlled via parent evaluation
CREATE POLICY "evaluation_items_via_evaluation" ON evaluation_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM evaluations e
            JOIN allocations a ON a.id = e.allocation_id
            WHERE e.id = evaluation_items.evaluation_id
            AND (
                a.evaluator_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE user_id = auth.uid() 
                    AND role IN ('admin', 'faculty')
                )
            )
        )
    );
```

### audit_logs

```sql
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "audit_logs_admin_select" ON audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'faculty')
        )
    );

-- Logs are inserted via triggers/functions (SECURITY DEFINER)
-- No direct user insert policy needed
```

### announcements

```sql
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Students can view active announcements targeted to them
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

-- Admins have full access
CREATE POLICY "announcements_admin_all" ON announcements
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'faculty')
        )
    );
```

## View Security

Views respect RLS of underlying tables. For anonymized views, we use SECURITY DEFINER functions to control access:

```sql
-- Function to get anonymized submission for evaluation
CREATE OR REPLACE FUNCTION get_anonymized_submission(p_allocation_id UUID)
RETURNS TABLE (
    allocation_id UUID,
    submission_code TEXT,
    test_title TEXT,
    submitted_at TIMESTAMPTZ,
    questions JSONB,
    responses JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify caller is the assigned evaluator
    IF NOT EXISTS (
        SELECT 1 FROM allocations a
        WHERE a.id = p_allocation_id
        AND a.evaluator_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    ) THEN
        RAISE EXCEPTION 'Not authorized to view this submission';
    END IF;
    
    RETURN QUERY
    SELECT 
        al.id as allocation_id,
        'Submission-' || SUBSTRING(at.id::text, 1, 8) as submission_code,
        t.title as test_title,
        at.submitted_at,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', q.id,
                    'type', q.type,
                    'prompt', q.prompt,
                    'options', q.options,
                    'max_marks', q.max_marks,
                    'order_num', q.order_num
                ) ORDER BY q.order_num
            )
            FROM questions q WHERE q.test_id = t.id
        ) as questions,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'question_id', r.question_id,
                    'answer_text', r.answer_text,
                    'selected_options', r.selected_options
                )
            )
            FROM responses r WHERE r.attempt_id = at.id
        ) as responses
    FROM allocations al
    JOIN attempts at ON al.attempt_id = at.id
    JOIN tests t ON at.test_id = t.id
    WHERE al.id = p_allocation_id;
END;
$$;
```

## Testing RLS

```sql
-- Test as student user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'student-user-uuid';

-- Should only see own attempts
SELECT * FROM attempts;

-- Should not see other students' data
SELECT * FROM profiles WHERE role = 'student';

-- Reset
RESET ROLE;
```
