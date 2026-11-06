-- Deconstruct.ai Layer 2 schema (Neon Postgres)
-- Run once via Neon SQL console, psql $DATABASE_URL -f lib/db/schema.sql,
-- or `npx drizzle-kit push`.

CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash TEXT NOT NULL UNIQUE,
  blueprint JSONB NOT NULL,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analyses_code_hash_idx ON analyses (code_hash);

CREATE TABLE IF NOT EXISTS uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  blob_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usage (
  user_key TEXT NOT NULL,
  day DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_key, day)
);
