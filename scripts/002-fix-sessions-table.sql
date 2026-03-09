-- Fix sessions table to match application code
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS token VARCHAR(255);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Migrate: copy id to token if needed, then make token the lookup field
UPDATE sessions SET token = id WHERE token IS NULL;

-- Create index on token for fast lookups
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
