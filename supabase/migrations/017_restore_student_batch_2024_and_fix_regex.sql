-- Migration: Restore student batches to 2024 and fix regex extraction behavior

CREATE OR REPLACE FUNCTION normalize_batch_year(p_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT substring(COALESCE(p_value, '') from '19[0-9]{2}|20[0-9]{2}');
$$;

-- One-time correction requested: make all existing students batch 2024
UPDATE profiles
SET
  batch = '2024',
  updated_at = NOW()
WHERE role = 'student'
  AND batch IS DISTINCT FROM '2024';

-- Repair corrupted target batches produced by previous regex capture behavior
UPDATE tests
SET target_batch = '2024'
WHERE target_batch IN ('19', '20');
