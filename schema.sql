-- Database Schema for MyPasswordChecker API Worker
--
-- File: /Users/jack/Projects - Xcode/mypasswordchecker/schema.sql
-- Action: NEW FILE
-- Dependencies: D1 database (mypasswordchecker-db)
--
-- Purpose: Define tables for premium sessions, API keys, and usage tracking
-- Supports: Dual payment processing (PayPal + Stripe)
--
-- Load with: wrangler d1 execute mypasswordchecker-db --file=schema.sql

-- ═══════════════════════════════════════════════════════════════
-- PREMIUM SESSIONS TABLE
-- ═══════════════════════════════════════════════════════════════
-- Stores 24-hour premium access purchases ($1.00 via PayPal)
-- Features: phonetic generator, quantum analysis, breach checker

CREATE TABLE IF NOT EXISTS sessions (
    -- Primary key
    session_id TEXT PRIMARY KEY,

    -- User info
    user_ip TEXT,
    user_email TEXT,

    -- Timestamps
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,

    -- Payment details
    payment_processor TEXT NOT NULL,  -- 'paypal' or 'stripe'
    payment_id TEXT NOT NULL,         -- PayPal order_id or Stripe payment_intent_id
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',

    -- Session details
    features TEXT,                    -- JSON array: ["phonetic", "quantum", "breach"]
    status TEXT DEFAULT 'active',     -- 'active', 'expired', 'refunded'

    -- Constraints
    UNIQUE(payment_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_payment_id ON sessions(payment_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);

-- ═══════════════════════════════════════════════════════════════
-- API KEYS TABLE (ENHANCED WITH SECURITY FEATURES)
-- ═══════════════════════════════════════════════════════════════
-- Stores developer API subscriptions (monthly, via Stripe)
-- Tiers: 1 ($10/mo, 10K req), 2 ($20/mo, 100K req), 3 ($50/mo, 1M req)
-- Security: Email verification, domain whitelisting, IP filtering, abuse detection

CREATE TABLE IF NOT EXISTS api_keys (
    -- Primary key
    api_key TEXT PRIMARY KEY,

    -- User info
    user_email TEXT NOT NULL,
    user_name TEXT,

    -- Subscription tier
    tier INTEGER NOT NULL,                -- 1, 2, or 3
    created_at INTEGER NOT NULL,

    -- Quota management
    quota_limit INTEGER NOT NULL,          -- Requests per billing cycle
    quota_used INTEGER DEFAULT 0,
    billing_cycle_start INTEGER NOT NULL,
    billing_cycle_end INTEGER,

    -- Payment details
    payment_processor TEXT NOT NULL,       -- Always 'stripe' for API subs
    stripe_subscription_id TEXT,           -- Stripe subscription ID
    stripe_payment_intent_id TEXT,         -- Initial payment intent
    stripe_customer_id TEXT,               -- Stripe customer ID

    -- Security features (NEW)
    email_verified INTEGER DEFAULT 0,      -- 0 = pending, 1 = verified
    allowed_domains TEXT,                  -- JSON array: ["example.com", "app.example.com"]
    allowed_ips TEXT,                      -- JSON array: ["1.2.3.4", "5.6.7.8"] (optional)
    require_signature INTEGER DEFAULT 0,   -- 1 = require HMAC signatures on requests
    api_secret TEXT,                       -- Secret for HMAC signature verification (32 bytes hex)

    -- Usage tracking (NEW)
    total_requests INTEGER DEFAULT 0,      -- Lifetime request count
    last_abuse_check INTEGER,              -- Timestamp of last abuse score calculation
    abuse_score INTEGER DEFAULT 0,         -- 0-100, auto-suspend at >70

    -- Rate limiting (NEW)
    rate_limit_per_minute INTEGER,         -- Tier-based: T1=10, T2=100, T3=1000
    last_rate_limit_reset INTEGER,         -- Timestamp of last rate window reset

    -- Status
    status TEXT DEFAULT 'pending',         -- CHANGED: 'pending', 'active', 'canceled', 'expired', 'suspended'
    canceled_at INTEGER,
    last_used_at INTEGER,
    suspended_reason TEXT,                 -- NEW: Reason if status = 'suspended'

    -- Metadata
    metadata TEXT,                         -- JSON for additional data

    -- Constraints
    UNIQUE(user_email, tier)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_email ON api_keys(user_email);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_stripe_sub ON api_keys(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_tier ON api_keys(tier);
CREATE INDEX IF NOT EXISTS idx_api_keys_billing_cycle ON api_keys(billing_cycle_start, billing_cycle_end);
CREATE INDEX IF NOT EXISTS idx_api_keys_email_verified ON api_keys(email_verified);
CREATE INDEX IF NOT EXISTS idx_api_keys_abuse_score ON api_keys(abuse_score);

-- ═══════════════════════════════════════════════════════════════
-- USAGE TRACKING TABLE
-- ═══════════════════════════════════════════════════════════════
-- Analytics for all API usage and premium feature access
-- Used for: billing, quota enforcement, analytics, debugging

CREATE TABLE IF NOT EXISTS usage_tracking (
    -- Primary key
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Timestamp
    timestamp INTEGER NOT NULL,

    -- Associated session or API key
    session_id TEXT,
    api_key TEXT,

    -- Usage details
    feature TEXT NOT NULL,               -- 'phonetic', 'quantum', 'breach', 'api_call'
    endpoint TEXT,                       -- API endpoint called ('/api/...')

    -- Request details
    user_ip TEXT,
    user_agent TEXT,
    request_duration_ms INTEGER,

    -- Response details
    success INTEGER DEFAULT 1,           -- 1 = success, 0 = error
    error_message TEXT,
    http_status INTEGER,

    -- Metadata
    metadata TEXT                        -- JSON for additional context
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_tracking(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_feature ON usage_tracking(feature);
CREATE INDEX IF NOT EXISTS idx_usage_api_key ON usage_tracking(api_key);
CREATE INDEX IF NOT EXISTS idx_usage_session ON usage_tracking(session_id);
CREATE INDEX IF NOT EXISTS idx_usage_success ON usage_tracking(success);
CREATE INDEX IF NOT EXISTS idx_usage_endpoint ON usage_tracking(endpoint);

-- ═══════════════════════════════════════════════════════════════
-- PAYMENT TRANSACTIONS TABLE (Optional - for reconciliation)
-- ═══════════════════════════════════════════════════════════════
-- Complete record of all payment transactions (both processors)
-- Used for: accounting, reconciliation, refund processing

CREATE TABLE IF NOT EXISTS payment_transactions (
    -- Primary key
    transaction_id TEXT PRIMARY KEY,

    -- Timestamp
    created_at INTEGER NOT NULL,

    -- Payer info
    payer_email TEXT,
    payer_name TEXT,

    -- Amount
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    fee REAL,                            -- Processing fee charged
    net REAL,                            -- Amount after fee

    -- Processor details
    payment_processor TEXT NOT NULL,     -- 'paypal' or 'stripe'
    processor_transaction_id TEXT NOT NULL,  -- PayPal order_id or Stripe payment_intent_id
    processor_fee REAL,                  -- Actual fee charged by processor

    -- Transaction type
    transaction_type TEXT NOT NULL,      -- 'premium_purchase', 'api_subscription', 'refund'

    -- Associated records
    session_id TEXT,                     -- If premium purchase
    api_key TEXT,                        -- If API subscription

    -- Status
    status TEXT NOT NULL,                -- 'pending', 'completed', 'failed', 'refunded'

    -- Refund details
    refunded INTEGER DEFAULT 0,
    refund_amount REAL,
    refund_reason TEXT,
    refunded_at INTEGER,

    -- Metadata
    metadata TEXT,                       -- JSON for additional data

    -- Constraints
    UNIQUE(processor_transaction_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_created ON payment_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_email ON payment_transactions(payer_email);
CREATE INDEX IF NOT EXISTS idx_transactions_processor ON payment_transactions(payment_processor);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON payment_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_processor_id ON payment_transactions(processor_transaction_id);

-- ═══════════════════════════════════════════════════════════════
-- EMAIL VERIFICATIONS TABLE (NEW - SECURITY)
-- ═══════════════════════════════════════════════════════════════
-- Tracks email verification workflow for API key activation
-- Prevents fake accounts and ensures valid contact info

CREATE TABLE IF NOT EXISTS email_verifications (
    -- Primary key
    verification_id TEXT PRIMARY KEY,

    -- Associated API key
    api_key TEXT NOT NULL,
    user_email TEXT NOT NULL,

    -- Verification details
    verification_code TEXT NOT NULL,      -- 6-digit code sent via email
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,          -- Code valid for 24 hours
    verified_at INTEGER,

    -- Tracking
    attempts INTEGER DEFAULT 0,           -- Failed verification attempts
    ip_address TEXT,                      -- IP that requested verification

    -- Status
    status TEXT DEFAULT 'pending',        -- 'pending', 'verified', 'expired', 'failed'

    -- Constraints
    FOREIGN KEY (api_key) REFERENCES api_keys(api_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_verif_api_key ON email_verifications(api_key);
CREATE INDEX IF NOT EXISTS idx_email_verif_email ON email_verifications(user_email);
CREATE INDEX IF NOT EXISTS idx_email_verif_status ON email_verifications(status);
CREATE INDEX IF NOT EXISTS idx_email_verif_expires ON email_verifications(expires_at);

-- ═══════════════════════════════════════════════════════════════
-- DOMAIN VERIFICATIONS TABLE (NEW - SECURITY)
-- ═══════════════════════════════════════════════════════════════
-- Tracks domain ownership verification for API key whitelisting
-- Supports 3 methods: DNS TXT record, HTML file upload, meta tag

CREATE TABLE IF NOT EXISTS domain_verifications (
    -- Primary key
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Associated API key
    api_key TEXT NOT NULL,
    domain TEXT NOT NULL,                 -- e.g., "example.com"

    -- Verification method
    verification_method TEXT NOT NULL,    -- 'dns', 'file', 'meta'
    verification_token TEXT NOT NULL,     -- Unique token to verify

    -- Timestamps
    created_at INTEGER NOT NULL,
    verified_at INTEGER,
    last_check_at INTEGER,

    -- Status
    status TEXT DEFAULT 'pending',        -- 'pending', 'verified', 'failed'
    failure_reason TEXT,

    -- Constraints
    UNIQUE(api_key, domain),
    FOREIGN KEY (api_key) REFERENCES api_keys(api_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_domain_verif_api_key ON domain_verifications(api_key);
CREATE INDEX IF NOT EXISTS idx_domain_verif_domain ON domain_verifications(domain);
CREATE INDEX IF NOT EXISTS idx_domain_verif_status ON domain_verifications(status);

-- ═══════════════════════════════════════════════════════════════
-- API REQUEST LOGS TABLE (NEW - SECURITY)
-- ═══════════════════════════════════════════════════════════════
-- Detailed logging of all API requests for abuse detection
-- Used for: fraud detection, debugging, compliance, analytics

CREATE TABLE IF NOT EXISTS api_request_logs (
    -- Primary key
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Timestamp
    timestamp INTEGER NOT NULL,

    -- Request details
    api_key TEXT NOT NULL,
    endpoint TEXT NOT NULL,               -- e.g., "/api/verify-session"
    method TEXT NOT NULL,                 -- GET, POST, etc.

    -- Client details
    ip_address TEXT,
    user_agent TEXT,
    referer TEXT,                         -- Origin domain

    -- Request validation
    signature_valid INTEGER,              -- 1 = valid, 0 = invalid, NULL = not required
    domain_whitelisted INTEGER,           -- 1 = yes, 0 = no, NULL = not configured
    ip_whitelisted INTEGER,               -- 1 = yes, 0 = no, NULL = not configured

    -- Response
    http_status INTEGER NOT NULL,
    response_time_ms INTEGER,
    error_message TEXT,

    -- Abuse detection flags
    suspicious_pattern INTEGER DEFAULT 0, -- 1 = flagged as suspicious
    abuse_type TEXT,                      -- 'rate_limit', 'invalid_signature', 'geo_anomaly', etc.

    -- Constraints
    FOREIGN KEY (api_key) REFERENCES api_keys(api_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_logs_timestamp ON api_request_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_logs_api_key ON api_request_logs(api_key);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_request_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_ip ON api_request_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_api_logs_status ON api_request_logs(http_status);
CREATE INDEX IF NOT EXISTS idx_api_logs_suspicious ON api_request_logs(suspicious_pattern);

-- ═══════════════════════════════════════════════════════════════
-- ABUSE EVENTS TABLE (NEW - SECURITY)
-- ═══════════════════════════════════════════════════════════════
-- Tracks security incidents and abuse events
-- Used for: admin alerts, auto-suspension, compliance reporting

CREATE TABLE IF NOT EXISTS abuse_events (
    -- Primary key
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Timestamp
    created_at INTEGER NOT NULL,

    -- Associated API key
    api_key TEXT NOT NULL,
    user_email TEXT,

    -- Event details
    event_type TEXT NOT NULL,             -- 'rate_limit_exceeded', 'invalid_signature', 'quota_exceeded', etc.
    severity TEXT NOT NULL,               -- 'low', 'medium', 'high', 'critical'
    description TEXT NOT NULL,

    -- Evidence
    ip_address TEXT,
    endpoint TEXT,
    request_count INTEGER,                -- Number of requests in violation
    time_window_minutes INTEGER,          -- Time period for the violation

    -- Response
    action_taken TEXT,                    -- 'flagged', 'suspended', 'blocked', 'none'
    resolved INTEGER DEFAULT 0,           -- 0 = unresolved, 1 = resolved
    resolved_at INTEGER,
    resolved_by TEXT,                     -- Admin who resolved
    resolution_notes TEXT,

    -- Constraints
    FOREIGN KEY (api_key) REFERENCES api_keys(api_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_abuse_events_created ON abuse_events(created_at);
CREATE INDEX IF NOT EXISTS idx_abuse_events_api_key ON abuse_events(api_key);
CREATE INDEX IF NOT EXISTS idx_abuse_events_severity ON abuse_events(severity);
CREATE INDEX IF NOT EXISTS idx_abuse_events_resolved ON abuse_events(resolved);
CREATE INDEX IF NOT EXISTS idx_abuse_events_type ON abuse_events(event_type);

-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════

-- After loading schema, verify tables were created:
-- SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;

-- Expected output:
-- - abuse_events
-- - api_keys
-- - api_request_logs
-- - domain_verifications
-- - email_verifications
-- - payment_transactions
-- - sessions
-- - usage_tracking

-- ═══════════════════════════════════════════════════════════════
-- SAMPLE QUERIES
-- ═══════════════════════════════════════════════════════════════

-- Count active premium sessions:
-- SELECT COUNT(*) FROM sessions WHERE status = 'active' AND expires_at > strftime('%s', 'now') * 1000;

-- Count active API keys by tier:
-- SELECT tier, COUNT(*) as count FROM api_keys WHERE status = 'active' GROUP BY tier;

-- Get usage in last 24 hours:
-- SELECT feature, COUNT(*) as count FROM usage_tracking
-- WHERE timestamp > (strftime('%s', 'now') - 86400) * 1000
-- GROUP BY feature;

-- Find API keys exceeding quota:
-- SELECT api_key, user_email, quota_used, quota_limit
-- FROM api_keys
-- WHERE quota_used >= quota_limit AND status = 'active';

-- Count pending email verifications:
-- SELECT COUNT(*) FROM email_verifications WHERE status = 'pending' AND expires_at > strftime('%s', 'now') * 1000;

-- Find API keys with high abuse scores:
-- SELECT api_key, user_email, abuse_score, status
-- FROM api_keys
-- WHERE abuse_score > 50
-- ORDER BY abuse_score DESC;

-- Get unresolved abuse events:
-- SELECT ae.id, ae.created_at, ae.event_type, ae.severity, ae.description, ak.user_email
-- FROM abuse_events ae
-- JOIN api_keys ak ON ae.api_key = ak.api_key
-- WHERE ae.resolved = 0
-- ORDER BY ae.severity DESC, ae.created_at DESC;

-- Count verified domains per API key:
-- SELECT api_key, COUNT(*) as verified_domains
-- FROM domain_verifications
-- WHERE status = 'verified'
-- GROUP BY api_key;

-- Get request logs with suspicious patterns in last hour:
-- SELECT timestamp, api_key, endpoint, ip_address, abuse_type
-- FROM api_request_logs
-- WHERE suspicious_pattern = 1
--   AND timestamp > (strftime('%s', 'now') - 3600) * 1000
-- ORDER BY timestamp DESC;

-- ═══════════════════════════════════════════════════════════════
-- MAINTENANCE QUERIES
-- ═══════════════════════════════════════════════════════════════

-- Clean up expired sessions (run periodically):
-- UPDATE sessions SET status = 'expired'
-- WHERE expires_at < strftime('%s', 'now') * 1000 AND status = 'active';

-- Reset monthly API quotas (run on billing cycle):
-- UPDATE api_keys SET quota_used = 0, billing_cycle_start = strftime('%s', 'now') * 1000
-- WHERE billing_cycle_end < strftime('%s', 'now') * 1000;

-- Clean up expired email verifications:
-- UPDATE email_verifications SET status = 'expired'
-- WHERE expires_at < strftime('%s', 'now') * 1000 AND status = 'pending';

-- Auto-suspend API keys with high abuse scores:
-- UPDATE api_keys SET status = 'suspended', suspended_reason = 'Auto-suspended due to high abuse score'
-- WHERE abuse_score > 70 AND status = 'active';

-- Clean up old request logs (keep last 90 days):
-- DELETE FROM api_request_logs
-- WHERE timestamp < (strftime('%s', 'now') - 7776000) * 1000;

-- Archive resolved abuse events older than 1 year:
-- DELETE FROM abuse_events
-- WHERE resolved = 1 AND resolved_at < (strftime('%s', 'now') - 31536000) * 1000;

-- ═══════════════════════════════════════════════════════════════
-- END OF SCHEMA
-- ═══════════════════════════════════════════════════════════════
