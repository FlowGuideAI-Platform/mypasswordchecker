-- Migration: Add domain verification system
-- Run this on your existing D1 database

-- Domain verifications table (for fraud prevention)
CREATE TABLE IF NOT EXISTS domain_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT NOT NULL,
    domain TEXT NOT NULL,
    verification_token TEXT UNIQUE NOT NULL,
    domain_secret TEXT UNIQUE NOT NULL,
    verification_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    verified_at TEXT,
    last_used_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(customer_id, domain)
);

CREATE INDEX idx_domain_verifications_customer_id ON domain_verifications(customer_id);
CREATE INDEX idx_domain_verifications_domain ON domain_verifications(domain);
CREATE INDEX idx_domain_verifications_token ON domain_verifications(verification_token);
CREATE INDEX idx_domain_verifications_status ON domain_verifications(status);

-- Sessions table (if not already exists)
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token TEXT UNIQUE NOT NULL,
    customer_id TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_customer_id ON sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Update trigger
CREATE TRIGGER IF NOT EXISTS update_domain_verifications_timestamp
AFTER UPDATE ON domain_verifications
BEGIN
    UPDATE domain_verifications SET updated_at = datetime('now') WHERE id = NEW.id;
END;
