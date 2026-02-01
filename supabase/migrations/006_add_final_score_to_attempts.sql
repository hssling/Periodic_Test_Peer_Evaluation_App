-- Migration: Add final_score to attempts
-- Description: Stores average peer evaluation score for an attempt

ALTER TABLE attempts
  ADD COLUMN IF NOT EXISTS final_score NUMERIC;

CREATE INDEX IF NOT EXISTS idx_attempts_final_score ON attempts(final_score);
