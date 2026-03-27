-- Create agent_library table for storing user-registered AI agents
CREATE TABLE IF NOT EXISTS agent_library (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  url VARCHAR(1000) NOT NULL,
  comment TEXT,
  user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for sorting by likes and updated_at
CREATE INDEX IF NOT EXISTS idx_agent_library_likes_updated ON agent_library(likes DESC, updated_at DESC);

-- Create index for user_id lookup
CREATE INDEX IF NOT EXISTS idx_agent_library_user_id ON agent_library(user_id);
