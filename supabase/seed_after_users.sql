-- Seed Data for Periodic Test App
-- RUN THIS AFTER creating users through Supabase Auth Dashboard
-- 
-- First, create these users in Supabase Auth → Users → Add User:
-- 1. admin@example.com (metadata: {"name": "Admin User", "role": "admin"})
-- 2. faculty@example.com (metadata: {"name": "Faculty Member", "role": "faculty"})
-- 3. student1@example.com (metadata: {"name": "Student One", "role": "student", "roll_no": "2024001", "batch": "2024", "section": "A"})
-- 4. student2@example.com (metadata: {"name": "Student Two", "role": "student", "roll_no": "2024002", "batch": "2024", "section": "A"})
-- 5. student3@example.com (metadata: {"name": "Student Three", "role": "student", "roll_no": "2024003", "batch": "2024", "section": "B"})

-- Update profiles with additional info (run after creating users)
UPDATE profiles SET roll_no = '2024001', batch = '2024', section = 'A' 
WHERE email = 'student1@example.com';

UPDATE profiles SET roll_no = '2024002', batch = '2024', section = 'A' 
WHERE email = 'student2@example.com';

UPDATE profiles SET roll_no = '2024003', batch = '2024', section = 'B' 
WHERE email = 'student3@example.com';

-- Create a sample test (uses the admin profile)
INSERT INTO tests (id, title, description, start_at, end_at, duration_minutes, total_marks, status, evaluators_per_submission, same_batch_only, created_by)
SELECT 
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'Anatomy Unit Test 1',
    'First unit test covering upper limb anatomy',
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '6 days',
    60,
    50,
    'active',
    2,
    true,
    id
FROM profiles WHERE role = 'admin' LIMIT 1;

-- Create sample questions for the test
INSERT INTO questions (test_id, type, prompt, options, correct_answer, max_marks, order_num) VALUES
('a0000000-0000-0000-0000-000000000001', 'mcq_single', 
 'Which nerve is responsible for wrist drop?',
 '[{"id": "A", "text": "Median nerve"}, {"id": "B", "text": "Ulnar nerve"}, {"id": "C", "text": "Radial nerve"}, {"id": "D", "text": "Musculocutaneous nerve"}]'::jsonb,
 '["C"]'::jsonb,
 5, 1),
 
('a0000000-0000-0000-0000-000000000001', 'mcq_single',
 'The anatomical snuffbox contains which artery?',
 '[{"id": "A", "text": "Ulnar artery"}, {"id": "B", "text": "Radial artery"}, {"id": "C", "text": "Brachial artery"}, {"id": "D", "text": "Interosseous artery"}]'::jsonb,
 '["B"]'::jsonb,
 5, 2),

('a0000000-0000-0000-0000-000000000001', 'mcq_multi',
 'Which of the following are branches of the brachial plexus?',
 '[{"id": "A", "text": "Median nerve"}, {"id": "B", "text": "Femoral nerve"}, {"id": "C", "text": "Ulnar nerve"}, {"id": "D", "text": "Radial nerve"}]'::jsonb,
 '["A", "C", "D"]'::jsonb,
 10, 3),

('a0000000-0000-0000-0000-000000000001', 'short',
 'Name the muscles of the rotator cuff.',
 NULL,
 NULL,
 10, 4),

('a0000000-0000-0000-0000-000000000001', 'long',
 'Describe the course of the median nerve from its origin to its termination, including major branches and clinical significance.',
 NULL,
 NULL,
 20, 5);

-- Create rubrics for the long answer question
INSERT INTO rubrics (test_id, question_id, criterion, max_score, descriptors, order_num)
SELECT 
    'a0000000-0000-0000-0000-000000000001',
    id,
    'Origin and Formation',
    5,
    '{"5": "Complete and accurate description", "3": "Partially correct", "1": "Major errors", "0": "Not attempted"}'::jsonb,
    1
FROM questions WHERE test_id = 'a0000000-0000-0000-0000-000000000001' AND type = 'long';

INSERT INTO rubrics (test_id, question_id, criterion, max_score, descriptors, order_num)
SELECT 
    'a0000000-0000-0000-0000-000000000001',
    id,
    'Course Description',
    5,
    '{"5": "Complete anatomical course", "3": "Major points covered", "1": "Incomplete", "0": "Not attempted"}'::jsonb,
    2
FROM questions WHERE test_id = 'a0000000-0000-0000-0000-000000000001' AND type = 'long';

INSERT INTO rubrics (test_id, question_id, criterion, max_score, descriptors, order_num)
SELECT 
    'a0000000-0000-0000-0000-000000000001',
    id,
    'Branches',
    5,
    '{"5": "All major branches named", "3": "Some branches named", "1": "Few branches", "0": "Not attempted"}'::jsonb,
    3
FROM questions WHERE test_id = 'a0000000-0000-0000-0000-000000000001' AND type = 'long';

INSERT INTO rubrics (test_id, question_id, criterion, max_score, descriptors, order_num)
SELECT 
    'a0000000-0000-0000-0000-000000000001',
    id,
    'Clinical Significance',
    5,
    '{"5": "Excellent clinical correlation", "3": "Basic clinical points", "1": "Minimal clinical relevance", "0": "Not attempted"}'::jsonb,
    4
FROM questions WHERE test_id = 'a0000000-0000-0000-0000-000000000001' AND type = 'long';

-- Create announcements
INSERT INTO announcements (title, content, target_role, created_by, is_active, expires_at)
SELECT 
    'Welcome to Periodic Test Platform',
    'Welcome to the new periodic test and peer evaluation system. Please complete your profile setup.',
    NULL,
    id,
    true,
    NOW() + INTERVAL '30 days'
FROM profiles WHERE role = 'admin' LIMIT 1;

INSERT INTO announcements (title, content, target_role, created_by, is_active, expires_at)
SELECT 
    'Anatomy Unit Test 1 Now Open',
    'The first unit test on upper limb anatomy is now available. Duration: 60 minutes. Good luck!',
    'student',
    id,
    true,
    NOW() + INTERVAL '7 days'
FROM profiles WHERE role = 'admin' LIMIT 1;

-- Output confirmation
SELECT 'Seed data created successfully!' as status;
SELECT COUNT(*) as test_count FROM tests;
SELECT COUNT(*) as question_count FROM questions;
SELECT COUNT(*) as announcement_count FROM announcements;
