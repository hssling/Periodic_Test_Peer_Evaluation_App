-- Migration: Harden auth profile creation and backfill missing student fields

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_name TEXT;
    v_role TEXT;
    v_roll_no TEXT;
    v_batch TEXT;
    v_section TEXT;
BEGIN
    v_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
        split_part(COALESCE(NEW.email, ''), '@', 1),
        'Student'
    );

    v_role := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''),
        'student'
    );

    IF v_role NOT IN ('student', 'admin', 'faculty') THEN
        v_role := 'student';
    END IF;

    v_roll_no := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'roll_no'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'rollNo'), '')
    );

    v_batch := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'batch'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'joining_year'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'joiningYear'), '')
    );

    IF v_batch IS NOT NULL THEN
        v_batch := substring(v_batch from '(19|20)[0-9]{2}');
    END IF;

    IF v_batch IS NULL AND v_roll_no IS NOT NULL THEN
        v_batch := substring(v_roll_no from '(19|20)[0-9]{2}');
    END IF;

    v_section := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'section'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'group'), '')
    );

    INSERT INTO public.profiles (
        user_id,
        email,
        name,
        role,
        roll_no,
        batch,
        section,
        is_active
    )
    VALUES (
        NEW.id,
        NEW.email,
        v_name,
        v_role,
        v_roll_no,
        v_batch,
        v_section,
        true
    )
    ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(NULLIF(profiles.name, ''), EXCLUDED.name),
        roll_no = COALESCE(profiles.roll_no, EXCLUDED.roll_no),
        batch = COALESCE(profiles.batch, EXCLUDED.batch),
        section = COALESCE(profiles.section, EXCLUDED.section),
        is_active = COALESCE(profiles.is_active, true),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

UPDATE profiles p
SET
    email = COALESCE(p.email, u.email),
    roll_no = COALESCE(
        NULLIF(p.roll_no, ''),
        NULLIF(TRIM(u.raw_user_meta_data->>'roll_no'), ''),
        NULLIF(TRIM(u.raw_user_meta_data->>'rollNo'), '')
    ),
    batch = COALESCE(
        substring(NULLIF(p.batch, '') from '(19|20)[0-9]{2}'),
        substring(NULLIF(TRIM(u.raw_user_meta_data->>'batch'), '') from '(19|20)[0-9]{2}'),
        substring(NULLIF(TRIM(u.raw_user_meta_data->>'joining_year'), '') from '(19|20)[0-9]{2}'),
        substring(NULLIF(TRIM(u.raw_user_meta_data->>'joiningYear'), '') from '(19|20)[0-9]{2}'),
        substring(COALESCE(
            NULLIF(TRIM(u.raw_user_meta_data->>'roll_no'), ''),
            NULLIF(TRIM(u.raw_user_meta_data->>'rollNo'), '')
        ) from '(19|20)[0-9]{2}')
    ),
    section = COALESCE(
        NULLIF(p.section, ''),
        NULLIF(TRIM(u.raw_user_meta_data->>'section'), ''),
        NULLIF(TRIM(u.raw_user_meta_data->>'group'), '')
    ),
    updated_at = NOW()
FROM auth.users u
WHERE p.user_id = u.id
AND (
    p.roll_no IS NULL OR
    p.batch IS NULL OR
    p.section IS NULL OR
    p.email IS NULL
);
