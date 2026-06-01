-- Migration: add the quantum / phonetic / breach per-tier limit + used counters
-- to api_keys. The worker's paid-tier-creation INSERT references these columns
-- but they were never added in production, so every paid-key creation silently
-- failed with "no such column" — which is why aac2.com's API stopped working
-- and the customer base collapsed.
--
-- Apply with:
--   npx wrangler d1 execute mypasswordchecker-db --remote \
--     --file=migrations/d1-add-pq-quotas.sql --config wrangler.toml -y
--
-- Additive ALTER TABLE statements only. Existing rows get 0 for each new
-- counter and limit (matching the worker's default for free-tier keys).
-- Not idempotent: running twice will fail on duplicate column — that's
-- the intended safety net.

ALTER TABLE api_keys ADD COLUMN quantum_limit  INTEGER DEFAULT 0;
ALTER TABLE api_keys ADD COLUMN quantum_used   INTEGER DEFAULT 0;
ALTER TABLE api_keys ADD COLUMN phonetic_limit INTEGER DEFAULT 0;
ALTER TABLE api_keys ADD COLUMN phonetic_used  INTEGER DEFAULT 0;
ALTER TABLE api_keys ADD COLUMN breach_limit   INTEGER DEFAULT 0;
ALTER TABLE api_keys ADD COLUMN breach_used    INTEGER DEFAULT 0;
