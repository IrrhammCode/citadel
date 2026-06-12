-- Citadel production store (single JSONB document + optimistic versioning)
CREATE TABLE IF NOT EXISTS citadel_store (
  id TEXT PRIMARY KEY DEFAULT 'main',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  version BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO citadel_store (id, data)
VALUES ('main', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS citadel_store_updated_at_idx ON citadel_store (updated_at DESC);
