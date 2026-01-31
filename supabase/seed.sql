-- Seed Data for Development and Testing
-- Run this after migrations are applied

-- Note: Auth users must be created through Supabase Auth API
-- This script creates the associated profiles and test data

-- =====================================================
-- SAMPLE PROFILES (IDs to match auth.users created separately)
-- =====================================================

-- These profiles will be linked to auth users created via API
-- For testing, we'll insert with placeholder user_ids

-- Create admin profile (Dr. Siddalingaiah H S)
INSERT INTO profiles (id, user_id, role, name, email, is_active)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 
     '00000000-0000-0000-0000-000000000001', 
     'admin', 
     'Dr. Siddalingaiah H S', 
     'hssling@yahoo.com', 
     true)
ON CONFLICT (id) DO NOTHING;

-- Create faculty profile (Dr. Siddalingaiah as Faculty)
INSERT INTO profiles (id, user_id, role, name, email, is_active)
VALUES 
    ('00000000-0000-0000-0000-000000000002', 
     '00000000-0000-0000-0000-000000000002', 
     'faculty', 
     'Dr. Siddalingaiah H S', 
     'hssling@yahoo.com', 
     true)
ON CONFLICT (id) DO NOTHING;

-- Create student profiles
INSERT INTO profiles (id, user_id, role, roll_no, name, email, batch, section, is_active)
VALUES 
    ('00000000-0000-0000-0000-000000000003', 
     '00000000-0000-0000-0000-000000000003', 
     'student', 
     '2023MBBS001', 
     'Rahul Sharma', 
     'student1@example.com', 
     '2023', 
     'A',
     true),
    ('00000000-0000-0000-0000-000000000004', 
     '00000000-0000-0000-0000-000000000004', 
     'student', 
     '2023MBBS002', 
     'Priya Patel', 
     'student2@example.com', 
     '2023', 
     'A',
     true),
    ('00000000-0000-0000-0000-000000000005', 
     '00000000-0000-0000-0000-000000000005', 
     'student', 
     '2023MBBS003', 
     'Amit Kumar', 
     'student3@example.com', 
     '2023', 
     'B',
     true),
    ('00000000-0000-0000-0000-000000000006', 
     '00000000-0000-0000-0000-000000000006', 
     'student', 
     '2023MBBS004', 
     'Sneha Reddy', 
     'student4@example.com', 
     '2023', 
     'B',
     true),
    ('00000000-0000-0000-0000-000000000007', 
     '00000000-0000-0000-0000-000000000007', 
     'student', 
     '2023MBBS005', 
     'Vikram Singh', 
     'student5@example.com', 
     '2023', 
     'A',
     true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SAMPLE TESTS
-- =====================================================

-- Community Medicine Periodic Test 1
INSERT INTO tests (id, title, description, start_at, end_at, duration_minutes, total_marks, status, evaluators_per_submission, same_batch_only, no_repeat_horizon, eval_start_at, eval_end_at, created_by)
VALUES (
    '10000000-0000-0000-0000-000000000001',
    'Community Medicine - Periodic Test 1',
    'This test covers topics from Unit 1 & 2: Introduction to Community Medicine, Biostatistics basics, and Epidemiology fundamentals. Read all questions carefully before answering.',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '6 days',
    60,
    50,
    'closed',
    1,
    true,
    3,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '3 days',
    '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (id) DO NOTHING;

-- Anatomy Periodic Test 2 (Active)
INSERT INTO tests (id, title, description, start_at, end_at, duration_minutes, total_marks, status, evaluators_per_submission, same_batch_only, no_repeat_horizon, eval_start_at, eval_end_at, created_by)
VALUES (
    '10000000-0000-0000-0000-000000000002',
    'General Anatomy - Upper Limb',
    'This test focuses on the anatomy of the upper limb including bones, muscles, nerves, and blood vessels. Diagrams may be required for some questions.',
    NOW() - INTERVAL '1 hour',
    NOW() + INTERVAL '23 hours',
    45,
    40,
    'active',
    1,
    true,
    3,
    NOW() + INTERVAL '24 hours',
    NOW() + INTERVAL '48 hours',
    '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (id) DO NOTHING;

-- Upcoming Physiology Test
INSERT INTO tests (id, title, description, start_at, end_at, duration_minutes, total_marks, status, evaluators_per_submission, same_batch_only, no_repeat_horizon, eval_start_at, eval_end_at, created_by)
VALUES (
    '10000000-0000-0000-0000-000000000003',
    'Physiology - General Physiology & Blood',
    'Topics covered: Cell physiology, Body fluids, Blood composition, Hemoglobin, Blood groups, and Hemostasis.',
    NOW() + INTERVAL '3 days',
    NOW() + INTERVAL '4 days',
    60,
    60,
    'published',
    2,
    true,
    3,
    NOW() + INTERVAL '5 days',
    NOW() + INTERVAL '7 days',
    '00000000-0000-0000-0000-000000000002'
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SAMPLE QUESTIONS - Community Medicine Test
-- =====================================================

INSERT INTO questions (id, test_id, type, prompt, options, correct_answer, max_marks, order_num, explanation)
VALUES 
    ('20000000-0000-0000-0000-000000000001',
     '10000000-0000-0000-0000-000000000001',
     'mcq_single',
     'Which of the following is the most appropriate measure of central tendency for skewed data?',
     '[{"id": "A", "text": "Mean"}, {"id": "B", "text": "Median"}, {"id": "C", "text": "Mode"}, {"id": "D", "text": "Standard Deviation"}]',
     '["B"]',
     2,
     1,
     'Median is preferred for skewed data as it is not affected by extreme values unlike mean.'),
    
    ('20000000-0000-0000-0000-000000000002',
     '10000000-0000-0000-0000-000000000001',
     'mcq_multi',
     'Which of the following are levels of disease prevention? (Select all that apply)',
     '[{"id": "A", "text": "Primordial"}, {"id": "B", "text": "Primary"}, {"id": "C", "text": "Secondary"}, {"id": "D", "text": "Tertiary"}, {"id": "E", "text": "Quaternary"}]',
     '["A", "B", "C", "D"]',
     3,
     2,
     'There are four levels of prevention: Primordial, Primary, Secondary, and Tertiary. Quaternary prevention is sometimes considered a fifth level.'),
    
    ('20000000-0000-0000-0000-000000000003',
     '10000000-0000-0000-0000-000000000001',
     'short',
     'Define Epidemiology in one sentence.',
     NULL,
     NULL,
     5,
     3,
     'Epidemiology is the study of distribution and determinants of health-related states or events in specified populations, and the application of this study to control health problems.'),
    
    ('20000000-0000-0000-0000-000000000004',
     '10000000-0000-0000-0000-000000000001',
     'long',
     'Explain the concept of Herd Immunity with suitable examples. Discuss factors affecting herd immunity threshold.',
     NULL,
     NULL,
     10,
     4,
     NULL)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SAMPLE QUESTIONS - Anatomy Test
-- =====================================================

INSERT INTO questions (id, test_id, type, prompt, options, correct_answer, max_marks, order_num)
VALUES 
    ('20000000-0000-0000-0000-000000000005',
     '10000000-0000-0000-0000-000000000002',
     'mcq_single',
     'The clavicle ossifies by which type of ossification?',
     '[{"id": "A", "text": "Intramembranous"}, {"id": "B", "text": "Endochondral"}, {"id": "C", "text": "Both intramembranous and endochondral"}, {"id": "D", "text": "Perichondral"}]',
     '["C"]',
     2,
     1),
    
    ('20000000-0000-0000-0000-000000000006',
     '10000000-0000-0000-0000-000000000002',
     'mcq_single',
     'Which nerve is commonly injured in fracture of the shaft of humerus?',
     '[{"id": "A", "text": "Median nerve"}, {"id": "B", "text": "Ulnar nerve"}, {"id": "C", "text": "Radial nerve"}, {"id": "D", "text": "Musculocutaneous nerve"}]',
     '["C"]',
     2,
     2),
    
    ('20000000-0000-0000-0000-000000000007',
     '10000000-0000-0000-0000-000000000002',
     'short',
     'Name the muscles forming the rotator cuff.',
     NULL,
     NULL,
     4,
     3),
    
    ('20000000-0000-0000-0000-000000000008',
     '10000000-0000-0000-0000-000000000002',
     'long',
     'Describe the anatomy of the brachial plexus. Include: roots, trunks, divisions, cords, and major terminal branches.',
     NULL,
     NULL,
     12,
     4)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SAMPLE RUBRICS
-- =====================================================

INSERT INTO rubrics (id, test_id, question_id, criterion, max_score, descriptors, order_num)
VALUES 
    ('30000000-0000-0000-0000-000000000001',
     '10000000-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000004',
     'Definition & Understanding',
     3,
     '{"0": "No understanding shown", "1": "Basic mention of immunity", "2": "Clear definition with partial understanding", "3": "Comprehensive definition with excellent understanding"}',
     1),
    
    ('30000000-0000-0000-0000-000000000002',
     '10000000-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000004',
     'Examples',
     3,
     '{"0": "No examples", "1": "One relevant example", "2": "Two appropriate examples", "3": "Multiple well-explained examples"}',
     2),
    
    ('30000000-0000-0000-0000-000000000003',
     '10000000-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000004',
     'Factors Discussion',
     4,
     '{"0": "No discussion", "1": "1-2 factors mentioned", "2": "3-4 factors with brief explanation", "3": "Comprehensive discussion of factors", "4": "Excellent analysis with clinical relevance"}',
     3)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SAMPLE ANNOUNCEMENTS
-- =====================================================

INSERT INTO announcements (id, title, content, target_role, created_by, is_active, expires_at)
VALUES 
    ('40000000-0000-0000-0000-000000000001',
     'Welcome to the New Semester',
     'Welcome back students! This semester we will be using the new Periodic Test Platform for all internal assessments. Please ensure you complete your profile and familiarize yourself with the test-taking interface before your first test.',
     NULL,
     '00000000-0000-0000-0000-000000000001',
     true,
     NOW() + INTERVAL '30 days'),
    
    ('40000000-0000-0000-0000-000000000002',
     'Upcoming Anatomy Test Reminder',
     'Reminder: General Anatomy - Upper Limb test is now open. Please complete it within the allotted time. Ensure stable internet connection before starting.',
     'student',
     '00000000-0000-0000-0000-000000000001',
     true,
     NOW() + INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SAMPLE ATTEMPTS & RESPONSES (Completed test)
-- =====================================================

-- Student 1 attempt for Community Medicine test
INSERT INTO attempts (id, test_id, student_id, started_at, submitted_at, status, time_spent_seconds)
VALUES (
    '50000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    NOW() - INTERVAL '7 days' + INTERVAL '1 hour',
    NOW() - INTERVAL '7 days' + INTERVAL '1 hour 45 minutes',
    'evaluated',
    2700
)
ON CONFLICT (id) DO NOTHING;

-- Student 1 responses
INSERT INTO responses (id, attempt_id, question_id, answer_text, selected_options, is_final)
VALUES 
    ('60000000-0000-0000-0000-000000000001',
     '50000000-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000001',
     NULL,
     '["B"]',
     true),
    ('60000000-0000-0000-0000-000000000002',
     '50000000-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000002',
     NULL,
     '["A", "B", "C", "D"]',
     true),
    ('60000000-0000-0000-0000-000000000003',
     '50000000-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000003',
     'Epidemiology is the study of how diseases spread and affect populations, including their distribution, causes, and control measures.',
     NULL,
     true),
    ('60000000-0000-0000-0000-000000000004',
     '50000000-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000004',
     'Herd immunity refers to the indirect protection from infectious diseases when a large percentage of the population becomes immune, either through vaccination or previous infection. When enough people are immune, the spread of the disease slows because there are fewer susceptible individuals for it to infect.

Examples include:
1. Measles - requires about 95% immunity for herd protection
2. Polio - eradicated in many countries through vaccination programs
3. COVID-19 - vaccines helped achieve partial herd immunity

Factors affecting herd immunity threshold:
1. Basic reproduction number (R0) - higher R0 means higher threshold needed
2. Vaccine efficacy - lower efficacy means more people need vaccination
3. Population density - denser populations may need higher coverage
4. Mixing patterns - how different groups interact affects transmission',
     NULL,
     true)
ON CONFLICT (id) DO NOTHING;

-- Student 2 attempt for Community Medicine test
INSERT INTO attempts (id, test_id, student_id, started_at, submitted_at, status, time_spent_seconds)
VALUES (
    '50000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000004',
    NOW() - INTERVAL '7 days' + INTERVAL '2 hours',
    NOW() - INTERVAL '7 days' + INTERVAL '2 hours 50 minutes',
    'evaluated',
    3000
)
ON CONFLICT (id) DO NOTHING;

-- Allocations
INSERT INTO allocations (id, attempt_id, evaluator_id, status, deadline)
VALUES 
    ('70000000-0000-0000-0000-000000000001',
     '50000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000004',
     'completed',
     NOW() - INTERVAL '3 days'),
    ('70000000-0000-0000-0000-000000000002',
     '50000000-0000-0000-0000-000000000002',
     '00000000-0000-0000-0000-000000000003',
     'completed',
     NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- Evaluations
INSERT INTO evaluations (id, allocation_id, submitted_at, overall_feedback, total_score, is_draft)
VALUES 
    ('80000000-0000-0000-0000-000000000001',
     '70000000-0000-0000-0000-000000000001',
     NOW() - INTERVAL '4 days',
     'Good attempt overall. The long answer showed good understanding but could include more specific examples.',
     16,
     false),
    ('80000000-0000-0000-0000-000000000002',
     '70000000-0000-0000-0000-000000000002',
     NOW() - INTERVAL '4 days',
     'Well-structured responses with clear explanations.',
     18,
     false)
ON CONFLICT (id) DO NOTHING;

-- Evaluation Items
INSERT INTO evaluation_items (id, evaluation_id, question_id, score, feedback)
VALUES 
    ('90000000-0000-0000-0000-000000000001',
     '80000000-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000001',
     2,
     'Correct'),
    ('90000000-0000-0000-0000-000000000002',
     '80000000-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000002',
     3,
     'All correct options selected'),
    ('90000000-0000-0000-0000-000000000003',
     '80000000-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000003',
     4,
     'Good definition but could be more precise'),
    ('90000000-0000-0000-0000-000000000004',
     '80000000-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000004',
     7,
     'Good understanding shown. Examples were relevant. Could expand on factors discussion.')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SAMPLE AUDIT LOGS
-- =====================================================

INSERT INTO audit_logs (action_type, payload)
VALUES 
    ('system_initialized', '{"version": "1.0.0", "timestamp": "2024-01-01T00:00:00Z"}'),
    ('test_created', '{"test_id": "10000000-0000-0000-0000-000000000001", "title": "Community Medicine - Periodic Test 1"}'),
    ('test_published', '{"test_id": "10000000-0000-0000-0000-000000000001"}');
