-- Migration 004: Add Email Verification
-- This migration adds email verification functionality to the API

-- Add email verification columns to api_keys table
ALTER TABLE api_keys ADD COLUMN email_verified INTEGER DEFAULT 0;
ALTER TABLE api_keys ADD COLUMN email_verification_token TEXT;
ALTER TABLE api_keys ADD COLUMN email_verification_sent_at TEXT;
ALTER TABLE api_keys ADD COLUMN email_verification_verified_at TEXT;

-- Create index for email verification lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_verification_token ON api_keys(email_verification_token);

-- Create domain_mismatch_alerts table for tracking suspicious API usage
CREATE TABLE IF NOT EXISTS domain_mismatch_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT NOT NULL,
    api_key_prefix TEXT NOT NULL,
    email TEXT NOT NULL,
    email_domain TEXT NOT NULL,
    request_domain TEXT NOT NULL,
    request_ip TEXT,
    request_country TEXT,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    occurrence_count INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending', -- pending, reviewed, ignored, blocked
    reviewed_by TEXT,
    reviewed_at TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_domain_alerts_customer ON domain_mismatch_alerts(customer_id);
CREATE INDEX IF NOT EXISTS idx_domain_alerts_status ON domain_mismatch_alerts(status);
CREATE INDEX IF NOT EXISTS idx_domain_alerts_created ON domain_mismatch_alerts(created_at);

-- Notes on email verification:
--
-- Email verification workflow:
-- 1. User registers with email
-- 2. API key created with email_verified = 0
-- 3. Verification email sent with token
-- 4. User clicks link with token
-- 5. Email marked as verified
--
-- Domain mismatch detection:
-- 1. On each API request, extract domain from Referer or Origin header
-- 2. Compare request domain with email domain
-- 3. If mismatch detected, log to domain_mismatch_alerts
-- 4. Admin can review and take action
--
-- Example scenarios:
-- - Email: user@company.com, Request from: company.com → OK
-- - Email: user@company.com, Request from: hacker.com → ALERT
-- - Email: user@gmail.com, Request from: myapp.com → OK (personal email)
-- - Email: user@gmail.com, Request from: different-app.com → POTENTIAL ALERT
