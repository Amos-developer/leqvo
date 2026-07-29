CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level INT NOT NULL CHECK (level BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, member_id)
);

CREATE INDEX IF NOT EXISTS teams_user_id_level_index
  ON teams (user_id, level);
