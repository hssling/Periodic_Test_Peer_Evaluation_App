-- =====================================================
-- ADD STUDENT PROFILES FOR EXISTING AUTH USERS
-- Run this in Supabase SQL Editor after creating users
-- =====================================================

-- First, get the user IDs from auth.users and create profiles
-- Replace the UUIDs below with actual user IDs from your auth.users table

-- Check existing auth users
SELECT id, email, raw_user_meta_data FROM auth.users;

-- Add profile for student@simsrh.com
-- Replace 'YOUR-USER-ID-1' with the actual UUID from auth.users
INSERT INTO profiles (user_id, email, name, role, roll_no, batch, section, is_active)
SELECT 
    id as user_id,
    email,
    COALESCE(raw_user_meta_data->>'name', 'Student 1') as name,
    'student' as role,
    COALESCE(raw_user_meta_data->>'roll_no', 'SIMS2024001') as roll_no,
    COALESCE(raw_user_meta_data->>'batch', '2024') as batch,
    COALESCE(raw_user_meta_data->>'section', 'A') as section,
    true as is_active
FROM auth.users 
WHERE email = 'student@simsrh.com'
ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    roll_no = EXCLUDED.roll_no,
    batch = EXCLUDED.batch,
    section = EXCLUDED.section;

-- Add profile for student2@simsrh.com
INSERT INTO profiles (user_id, email, name, role, roll_no, batch, section, is_active)
SELECT 
    id as user_id,
    email,
    COALESCE(raw_user_meta_data->>'name', 'Student 2') as name,
    'student' as role,
    COALESCE(raw_user_meta_data->>'roll_no', 'SIMS2024002') as roll_no,
    COALESCE(raw_user_meta_data->>'batch', '2024') as batch,
    COALESCE(raw_user_meta_data->>'section', 'A') as section,
    true as is_active
FROM auth.users 
WHERE email = 'student2@simsrh.com'
ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    roll_no = EXCLUDED.roll_no,
    batch = EXCLUDED.batch,
    section = EXCLUDED.section;

-- Add profile for admin user (if exists)
INSERT INTO profiles (user_id, email, name, role, is_active)
SELECT 
    id as user_id,
    email,
    COALESCE(raw_user_meta_data->>'name', 'Dr. Siddalingaiah H S') as name,
    'admin' as role,
    true as is_active
FROM auth.users 
WHERE email = 'hssling@yahoo.com'
ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    role = 'admin';

-- Verify profiles were created
SELECT * FROM profiles ORDER BY created_at DESC;

-- =====================================================
-- UPDATE USER METADATA (Optional - run if you want to 
-- store additional info in auth.users)
-- =====================================================

-- Update metadata for student@simsrh.com
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
    'name', 'Student One',
    'roll_no', 'SIMS2024001',
    'batch', '2024',
    'section', 'A',
    'phone', ''
)
WHERE email = 'student@simsrh.com';

-- Update metadata for student2@simsrh.com
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
    'name', 'Student Two',
    'roll_no', 'SIMS2024002',
    'batch', '2024',
    'section', 'A',
    'phone', ''
)
WHERE email = 'student2@simsrh.com';

-- Update metadata for admin
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
    'name', 'Dr. Siddalingaiah H S',
    'role', 'admin',
    'department', 'Community Medicine',
    'phone', '8941087719'
)
WHERE email = 'hssling@yahoo.com';
