-- MyPasswordChecker.com - Cloudflare D1 Schema
-- SOC 2 Type 2 Compliant Database Schema
-- SQLite syntax for Cloudflare D1

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key TEXT UNIQUE NOT NULL,
    customer_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    plan TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    subscription_status TEXT DEFAULT 'active',
    allow_overage INTEGER DEFAULT 1,  -- 1 = block overages (default), 0 = allow overages (charge)
    notify_at_80_percent INTEGER DEFAULT 1,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    last_used_at TEXT
);

CREATE INDEX idx_api_keys_api_key ON api_keys(api_key);
CREATE INDEX idx_api_keys_customer_id ON api_keys(customer_id);
CREATE INDEX idx_api_keys_email ON api_keys(email);
CREATE INDEX idx_api_keys_status ON api_keys(status);

-- Usage logs table (monthly aggregation for quota tracking)
CREATE TABLE IF NOT EXISTS usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT NOT NULL,
    month TEXT NOT NULL,
    tier1_requests INTEGER DEFAULT 0,
    tier2_requests INTEGER DEFAULT 0,
    phonetic_generations INTEGER DEFAULT 0,
    pq_key_generations INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(customer_id, month)
);

CREATE INDEX idx_usage_logs_customer_month ON usage_logs(customer_id, month);
CREATE INDEX idx_usage_logs_month ON usage_logs(month);

-- Audit logs table (comprehensive audit trail for SOC 2)
-- Keep 90 days in D1, archive older to R2
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    customer_id TEXT,
    ip_address TEXT,
    country TEXT,
    user_agent TEXT,
    request_method TEXT,
    request_path TEXT,
    response_status INTEGER,
    error_message TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_customer_id ON audit_logs(customer_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_request_id ON audit_logs(request_id);

-- Security events table (for monitoring and alerting)
CREATE TABLE IF NOT EXISTS security_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    customer_id TEXT,
    ip_address TEXT,
    description TEXT,
    metadata TEXT,
    resolved INTEGER DEFAULT 0,
    resolved_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_security_events_event_type ON security_events(event_type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_resolved ON security_events(resolved);
CREATE INDEX idx_security_events_created_at ON security_events(created_at);

-- Payments table (Stripe integration)
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT NOT NULL,
    stripe_payment_intent_id TEXT UNIQUE,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL,
    description TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT NOT NULL,
    stripe_subscription_id TEXT UNIQUE,
    plan TEXT NOT NULL,
    status TEXT NOT NULL,
    current_period_start TEXT,
    current_period_end TEXT,
    cancel_at TEXT,
    canceled_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Domain verifications table (for fraud prevention)
CREATE TABLE IF NOT EXISTS domain_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT NOT NULL,
    domain TEXT NOT NULL,
    verification_token TEXT UNIQUE NOT NULL,
    domain_secret TEXT UNIQUE NOT NULL,
    verification_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    ip_allowlist TEXT DEFAULT NULL,
    verified_at TEXT,
    last_used_at TEXT,
    last_ip_check_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(customer_id, domain)
);

CREATE INDEX idx_domain_verifications_customer_id ON domain_verifications(customer_id);
CREATE INDEX idx_domain_verifications_domain ON domain_verifications(domain);
CREATE INDEX idx_domain_verifications_token ON domain_verifications(verification_token);
CREATE INDEX idx_domain_verifications_status ON domain_verifications(status);

-- Sessions table (for dashboard authentication)
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token TEXT UNIQUE NOT NULL,
    customer_id TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_customer_id ON sessions(customer_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Insert your existing API key
INSERT OR IGNORE INTO api_keys (
    api_key,
    customer_id,
    email,
    name,
    plan,
    status,
    subscription_status,
    allow_overage,
    created_at
) VALUES (
    'mpc_b0de98710dde52ac78eed1af991ef4bb4fac10ec5f69e399',
    'cust_d2997813265326f89414757d132c8978',
    'jack@aac2.com',
    'Jack',
    'quantum_monthly',
    'active',
    'active',
    1,
    datetime('now')
);

-- Triggers for updated_at (SQLite doesn't have ON UPDATE CASCADE)
CREATE TRIGGER IF NOT EXISTS update_api_keys_timestamp
AFTER UPDATE ON api_keys
BEGIN
    UPDATE api_keys SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_usage_logs_timestamp
AFTER UPDATE ON usage_logs
BEGIN
    UPDATE usage_logs SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_subscriptions_timestamp
AFTER UPDATE ON subscriptions
BEGIN
    UPDATE subscriptions SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_domain_verifications_timestamp
AFTER UPDATE ON domain_verifications
BEGIN
    UPDATE domain_verifications SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Ad click tracking (privacy-respecting — no IP, no identifiers, no cookies)
CREATE TABLE IF NOT EXISTS ad_clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    banner_id TEXT NOT NULL,          -- 'flowguideai' or 'forgemcp'
    placement TEXT NOT NULL,          -- page the ad was on (e.g. 'homepage', 'premium')
    timestamp TEXT NOT NULL,          -- client ISO timestamp of the click
    user_agent_type TEXT,             -- 'desktop' | 'mobile' | 'tablet' | 'bot'
    traffic_source TEXT,              -- origin category (google, claude_ai, direct, ...)
    time_on_site INTEGER,             -- seconds on site before the click
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ad_clicks_banner ON ad_clicks(banner_id);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_placement ON ad_clicks(placement);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_source ON ad_clicks(traffic_source);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_banner_source ON ad_clicks(banner_id, traffic_source);
