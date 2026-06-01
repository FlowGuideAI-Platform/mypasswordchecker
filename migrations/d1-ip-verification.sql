-- Migration: per-key IP allowlist verification (spec §Phase 2).
--
-- `api_keys.allowed_ips` (JSON array) already exists (added in the
-- legacy security-features round). What we lacked was the proof-of-
-- ownership pending/verified workflow that mirrors domain_verifications.
-- This table holds that workflow.
--
-- Apply with:
--   npx wrangler d1 execute mypasswordchecker-db --remote \
--     --file=migrations/d1-ip-verification.sql --config wrangler.toml -y
--
-- Not idempotent: running twice will fail on duplicate object — that's
-- the intended safety net.

CREATE TABLE ip_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key TEXT NOT NULL,
    ip TEXT NOT NULL,                       -- IPv4 dotted-quad or IPv6
    verification_token TEXT NOT NULL,       -- mypwdckr_<32 random>
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'verified'
    created_at INTEGER NOT NULL,            -- epoch ms
    verified_at INTEGER,                    -- epoch ms, NULL until verified
    UNIQUE(api_key, ip)
);

CREATE INDEX idx_ip_verifications_api_key ON ip_verifications(api_key);
CREATE INDEX idx_ip_verifications_token ON ip_verifications(verification_token);
