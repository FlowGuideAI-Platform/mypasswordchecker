-- Migration: per-key overage protection toggle (spec §Phase 5).
--
-- overage_blocked = 1  → API rejects requests past quota_limit with 429
--                       (safe default; no surprise charges).
-- overage_blocked = 0  → API allows requests past quota_limit; the
--                       account is billed for overage at month-end.
--
-- Apply with:
--   npx wrangler d1 execute mypasswordchecker-db --remote \
--     --file=migrations/d1-overage.sql --config wrangler.toml -y

ALTER TABLE api_keys ADD COLUMN overage_blocked INTEGER DEFAULT 1;
