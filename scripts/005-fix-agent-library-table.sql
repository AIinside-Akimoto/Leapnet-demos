-- Drop and recreate agent_library table with correct schema
DROP TABLE IF EXISTS agent_library;

CREATE TABLE agent_library (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  comment TEXT,
  likes INTEGER DEFAULT 0,
  created_by INTEGER NOT NULL REFERENCES app_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for sorting by likes and updated_at
CREATE INDEX idx_agent_library_sort ON agent_library (likes DESC, updated_at DESC);
