-- Migration: Add PQ features, phonetic tracking, and IP allowlist
-- Run with: wrangler d1 execute mypasswordchecker-db --file=d1-migration-pq-features.sql

-- Add phonetic_generations and pq_key_generations columns to usage_logs
ALTER TABLE usage_logs ADD COLUMN phonetic_generations INTEGER DEFAULT 0;
ALTER TABLE usage_logs ADD COLUMN pq_key_generations INTEGER DEFAULT 0;

-- Add notify_at_80_percent to api_keys
ALTER TABLE api_keys ADD COLUMN notify_at_80_percent INTEGER DEFAULT 1;

-- Add IP allowlist and tracking to domain_verifications
ALTER TABLE domain_verifications ADD COLUMN ip_allowlist TEXT DEFAULT NULL;
ALTER TABLE domain_verifications ADD COLUMN last_ip_check_at TEXT;

-- Create free Standard Quantum account for jack@aac2.com
INSERT OR REPLACE INTO api_keys (
    api_key,
    customer_id,
    email,
    name,
    plan,
    status,
    subscription_status,
    allow_overage,
    notify_at_80_percent,
    created_at
) VALUES (
    'mpc_jack_free_standard_quantum_' || lower(hex(randomblob(16))),
    'cust_jack_aac2_free',
    'jack@aac2.com',
    'Jack (Free Standard Quantum)',
    'standard_quantum',
    'active',
    'active',
    1,
    1,
    datetime('now')
);
