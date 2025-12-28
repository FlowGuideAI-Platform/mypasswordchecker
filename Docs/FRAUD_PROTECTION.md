# Fraud Protection & API Abuse Prevention

## Overview

This document outlines the fraud protection mechanisms in place and recommendations for preventing credit card fraud and API abuse.

## Current Protection (✅ Implemented)

### 1. Referer/Origin Tracking
**Status:** ✅ Deployed

Every API request now tracks:
- `Referer` header - Shows the full URL of the page making the request
- `Origin` header - Shows the domain making the request

This data is stored in the audit logs `metadata` field as JSON:
```json
{
  "referer": "https://example.com/page.html",
  "origin": "https://example.com"
}
```

**Query audit logs to detect API key theft:**
```sql
-- Find which domains are using a specific API key
SELECT
  customer_id,
  json_extract(metadata, '$.origin') as origin,
  json_extract(metadata, '$.referer') as referer,
  COUNT(*) as request_count
FROM audit_logs
WHERE customer_id = 'cust_xxxxx'
  AND event_type IN ('api_request_tier1', 'api_request_tier2')
GROUP BY origin, referer
ORDER BY request_count DESC;

-- Detect stolen keys (multiple IPs + domains)
SELECT
  customer_id,
  COUNT(DISTINCT ip_address) as unique_ips,
  COUNT(DISTINCT json_extract(metadata, '$.origin')) as unique_domains,
  COUNT(*) as total_requests
FROM audit_logs
WHERE event_type IN ('api_request_tier1', 'api_request_tier2')
  AND created_at > datetime('now', '-7 days')
GROUP BY customer_id
HAVING unique_ips > 10 OR unique_domains > 5;
```

### 2. Comprehensive Audit Logging
All requests tracked with:
- IP address (Cloudflare CF-Connecting-IP)
- Country (from Cloudflare)
- User agent
- Request method/path
- Referer/Origin
- Timestamp
- Response status
- Error messages

**Storage:**
- D1 database: 90-day queryable history
- R2 bucket: 7-year immutable archive

## Recommended Protections (⚠️ Not Yet Implemented)

### 3. Domain Allowlisting
**Priority:** HIGH

Allow customers to specify authorized domains for their API keys.

**Implementation:**
```sql
-- Add to api_keys table
ALTER TABLE api_keys ADD COLUMN allowed_domains TEXT; -- JSON array

-- Example value: ["https://example.com", "https://www.example.com"]
```

**Worker logic:**
```javascript
// In validateApiKey function
const origin = request.headers.get('Origin');
if (keyData.allowed_domains) {
  const allowedDomains = JSON.parse(keyData.allowed_domains);
  if (origin && !allowedDomains.includes(origin)) {
    return {
      valid: false,
      error: 'API key not authorized for this domain',
      code: 403
    };
  }
}
```

### 4. Rate Limiting Per IP
**Priority:** HIGH

Prevent single IPs from abusing the API.

**Implementation options:**
- Use Cloudflare Rate Limiting rules (paid feature)
- Implement in worker using KV:
```javascript
const rateLimitKey = `ratelimit:${ip}:${Math.floor(Date.now() / 60000)}`;
const count = await env.RATE_LIMIT.get(rateLimitKey);
if (count && parseInt(count) > 100) { // 100 requests per minute
  return jsonResponse({ error: 'Rate limit exceeded' }, 429);
}
await env.RATE_LIMIT.put(rateLimitKey, (parseInt(count) || 0) + 1, { expirationTtl: 120 });
```

### 5. Anomaly Detection & Alerts
**Priority:** MEDIUM

Monitor for suspicious patterns:
- Sudden usage spikes (10x normal usage)
- Requests from high-risk countries
- Multiple failed auth attempts
- New accounts with immediate high usage

**Implement with Cloudflare Workers Cron:**
```javascript
// Run every hour
export default {
  async scheduled(event, env, ctx) {
    // Check for anomalies
    const anomalies = await detectAnomalies(env);
    if (anomalies.length > 0) {
      await sendAlert(anomalies, env);
    }
  }
}
```

### 6. Payment Fraud Protection
**Priority:** HIGH

**Current risk:** Stolen credit cards can be used to subscribe, incur API costs, then charge back.

**Mitigations:**

#### A. Square Fraud Detection (✅ Already Available)
Square automatically:
- Checks AVS (Address Verification)
- CVV verification
- Fraud scoring

**Action:** Review Square dashboard for declined/risky payments

#### B. New Account Velocity Limits
```javascript
// Block if >5 new accounts from same IP in 24 hours
const signupKey = `signups:${ip}:${today}`;
const signupCount = await env.SESSION_CACHE.get(signupKey);
if (signupCount && parseInt(signupCount) >= 5) {
  return jsonResponse({ error: 'Too many signups from this IP' }, 429);
}
```

#### C. Email Verification Required
Don't activate API keys until email is verified.

#### D. Trial Period / Delayed Activation
- Free tier: Activate immediately
- Paid tier: Hold funds for 7 days before full activation
- Quantum tier: Require manual review for first purchase

### 7. Chargeback Protection
**Priority:** MEDIUM

**Square protections:**
- Chargeback monitoring
- Automated dispute handling
- Fraud detection

**Your actions:**
1. Keep detailed audit logs (✅ already doing)
2. Monitor usage patterns before chargebacks
3. Disable keys immediately on chargeback
4. Add customer to blocklist

**Blocklist implementation:**
```sql
CREATE TABLE IF NOT EXISTS blocklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  ip_address TEXT,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_blocklist_email ON blocklist(email);
CREATE INDEX idx_blocklist_ip ON blocklist(ip_address);
```

## Monitoring Queries

### Find High-Risk Usage Patterns
```sql
-- Customers using API from many different IPs (possible key theft)
SELECT
  customer_id,
  COUNT(DISTINCT ip_address) as unique_ips,
  COUNT(*) as total_requests
FROM audit_logs
WHERE event_type IN ('api_request_tier1', 'api_request_tier2')
  AND created_at > datetime('now', '-24 hours')
GROUP BY customer_id
HAVING unique_ips > 20;

-- Sudden usage spikes
SELECT
  customer_id,
  COUNT(*) as requests_last_hour,
  (SELECT COUNT(*) FROM audit_logs al2
   WHERE al2.customer_id = audit_logs.customer_id
   AND al2.created_at > datetime('now', '-24 hours', '+23 hours')) as requests_prev_hour
FROM audit_logs
WHERE created_at > datetime('now', '-1 hour')
  AND event_type IN ('api_request_tier1', 'api_request_tier2')
GROUP BY customer_id
HAVING requests_last_hour > requests_prev_hour * 10;

-- Failed auth attempts (brute force detection)
SELECT
  ip_address,
  COUNT(*) as failed_attempts,
  MIN(created_at) as first_attempt,
  MAX(created_at) as last_attempt
FROM audit_logs
WHERE event_type = 'failed_auth'
  AND created_at > datetime('now', '-1 hour')
GROUP BY ip_address
HAVING failed_attempts > 10;
```

## Cost Protection

### Current API costs (your estimates):
- Standard password check: ~$0.001 per request
- Quantum estimate: ~$0.01 per request

### Pricing vs Cost:
- **Standard Plan:** $19/mo for 12,000 requests = $0.00158/request → **58% profit margin**
- **Quantum Plan:** $49/mo for 5,000 quantum = $0.0098/request → **Good margin**
- **Overage:** $0.01/request standard, $0.0125/request quantum → **Break-even to slight profit**

### Fraud scenario:
If attacker uses stolen card and makes 100,000 requests before chargeback:
- Cost to you: 100,000 × $0.001 = $100
- Revenue lost: ~$0
- Square chargeback fee: $15-25

**Total loss:** $115-125 per fraud incident

### Protection:
1. ✅ New accounts start on Free tier (25 requests/month) - Limits exposure
2. ⚠️ **Implement:** Rate limits per IP (100 req/min max)
3. ⚠️ **Implement:** Usage alerts at 2x normal consumption
4. ⚠️ **Implement:** Auto-suspend accounts with 10x spike

## Recommended Implementation Order

1. **Week 1:** Domain allowlisting (HIGH impact, easy)
2. **Week 2:** IP rate limiting (HIGH impact, medium difficulty)
3. **Week 3:** Usage anomaly alerts (MEDIUM impact, medium difficulty)
4. **Week 4:** Email verification requirement (MEDIUM impact, easy)
5. **Month 2:** Automated fraud scoring system

## Summary

**Currently protected against:**
- ✅ API key usage tracking (IP, country, UA, domain)
- ✅ Audit trail for fraud investigation
- ✅ Square's built-in fraud detection

**Vulnerable to:**
- ⚠️ Stolen API keys used on unauthorized domains
- ⚠️ Single IP making excessive requests
- ⚠️ Stolen credit card → high usage → chargeback

**Estimated fraud risk:**
- Low tier (Free/Standard): $100-200/incident
- High tier (Quantum): $500-1000/incident

**Recommendation:** Implement domain allowlisting and IP rate limiting within 2 weeks to reduce risk by 80%+.
