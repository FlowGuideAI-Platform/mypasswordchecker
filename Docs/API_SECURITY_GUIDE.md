# API Security Guide - MyPasswordChecker

**Complete guide to enterprise-grade security features**

## Table of Contents

1. [Security Overview](#security-overview)
2. [Email Verification](#email-verification)
3. [Domain Whitelisting](#domain-whitelisting)
4. [IP Whitelisting](#ip-whitelisting)
5. [Request Signatures](#request-signatures)
6. [Rate Limiting](#rate-limiting)
7. [Abuse Detection](#abuse-detection)
8. [Developer Dashboard](#developer-dashboard)
9. [Admin Dashboard](#admin-dashboard)
10. [Best Practices](#best-practices)

---

## Security Overview

The MyPasswordChecker API implements **8-layer security validation**:

1. ✅ **API Key Validation** - Verify key exists and is active
2. ✅ **Email Verification** - Prevent fake accounts
3. ✅ **Domain Verification** - Whitelist allowed origins
4. ✅ **IP Whitelisting** - Optional IP-based access control
5. ✅ **Rate Limiting** - Tier-based request limits
6. ✅ **Quota Enforcement** - Monthly request quotas
7. ✅ **Request Signatures** - HMAC SHA-256 verification
8. ✅ **Abuse Monitoring** - Automated threat detection (0-100 score)

**Auto-Suspension**: API keys with abuse score >70 are automatically suspended.

---

## Email Verification

### Why Email Verification?

- Prevents fake/disposable email accounts
- Ensures valid contact information
- Required before API key activation

### How It Works

1. **After Payment**: API key created with `status: 'pending'` and `email_verified: 0`
2. **Send Verification Code**:
   ```bash
   curl -X POST https://mypasswordchecker.com/api/dashboard/send-verification \
     -H "Content-Type: application/json" \
     -d '{
       "api_key": "sk_live_xxxxx"
     }'
   ```

   Response:
   ```json
   {
     "success": true,
     "message": "Verification code sent to user@example.com",
     "verification_code": "123456",
     "expires_at": 1703980800000
   }
   ```

3. **Verify Email**:
   ```bash
   curl -X POST https://mypasswordchecker.com/api/dashboard/verify-email \
     -H "Content-Type: application/json" \
     -d '{
       "api_key": "sk_live_xxxxx",
       "code": "123456"
     }'
   ```

   Response:
   ```json
   {
     "success": true,
     "verified": true,
     "message": "Email verified successfully. Your API key is now active."
   }
   ```

4. **API Key Activated**: Status changes to `'active'`, `email_verified: 1`

### Failed Attempts

- Maximum **5 attempts** per verification code
- After 5 failed attempts, request a new code
- Codes expire after **24 hours**

---

## Domain Whitelisting

### Why Domain Whitelisting?

- Prevent API key theft and unauthorized usage
- Ensure API calls only from your domains
- Required for client-side API usage (JavaScript)

### Supported Verification Methods

1. **DNS TXT Record** (Recommended)
2. **HTML File Upload** (Simple)
3. **Meta Tag** (Quick)

### Method 1: DNS TXT Record

**Step 1: Add Domain**
```bash
curl -X POST https://mypasswordchecker.com/api/dashboard/add-domain \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "sk_live_xxxxx",
    "domain": "example.com",
    "method": "dns"
  }'
```

Response:
```json
{
  "success": true,
  "domain": "example.com",
  "verification_method": "dns",
  "verification_token": "mypwdckr_abc123def456...",
  "instructions": "Add the following TXT record to your DNS..."
}
```

**Step 2: Add DNS TXT Record**
```
Name: _mypasswordchecker
Type: TXT
Value: mypwdckr_abc123def456...
```

**Step 3: Verify Domain**
```bash
curl -X POST https://mypasswordchecker.com/api/dashboard/verify-domain \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "sk_live_xxxxx",
    "domain": "example.com"
  }'
```

Response (Success):
```json
{
  "success": true,
  "verified": true,
  "domain": "example.com",
  "verified_at": 1703980800000,
  "message": "Domain example.com has been verified and added to your allowed domains."
}
```

### Method 2: HTML File Upload

**Step 1: Add Domain**
```bash
curl -X POST https://mypasswordchecker.com/api/dashboard/add-domain \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "sk_live_xxxxx",
    "domain": "example.com",
    "method": "file"
  }'
```

**Step 2: Create Verification File**

Create file at:
```
https://example.com/.well-known/mypasswordchecker-verification.txt
```

File contents (plain text):
```
mypwdckr_abc123def456...
```

**Step 3: Verify** (same as DNS method)

### Method 3: Meta Tag

**Step 1: Add Domain**
```bash
curl -X POST https://mypasswordchecker.com/api/dashboard/add-domain \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "sk_live_xxxxx",
    "domain": "example.com",
    "method": "meta"
  }'
```

**Step 2: Add Meta Tag to Homepage**

Add to `<head>` section of `https://example.com/`:
```html
<meta name="mypasswordchecker-verification" content="mypwdckr_abc123def456...">
```

**Step 3: Verify** (same as DNS method)

### Listing Domains

```bash
curl "https://mypasswordchecker.com/api/dashboard/get-domains?api_key=sk_live_xxxxx"
```

Response:
```json
{
  "domains": [
    {
      "domain": "example.com",
      "verification_method": "dns",
      "status": "verified",
      "verified_at": 1703980800000
    },
    {
      "domain": "app.example.com",
      "verification_method": "file",
      "status": "pending",
      "created_at": 1703980800000
    }
  ]
}
```

---

## IP Whitelisting

### Why IP Whitelisting?

- Additional security layer for server-to-server communication
- Prevent API key usage from unauthorized IPs
- **Optional** - only use if needed

### How to Configure

**Update API Key** (requires direct database access or admin action):

```sql
UPDATE api_keys
SET allowed_ips = '["1.2.3.4", "5.6.7.8"]'
WHERE api_key = 'sk_live_xxxxx';
```

**JSON Format**:
```json
["1.2.3.4", "5.6.7.8", "10.0.0.100"]
```

### Validation

- Requests from non-whitelisted IPs are **rejected with 403 Forbidden**
- Error: `"IP address not whitelisted: X.X.X.X"`

### When to Use

✅ **Use IP Whitelisting if:**
- API calls from fixed server IPs
- High-security requirements
- Internal/private APIs

❌ **Don't use if:**
- API calls from user browsers
- Dynamic/changing IPs (mobile apps)
- Using CDN or proxies

---

## Request Signatures

### Why Request Signatures?

- Prevent man-in-the-middle attacks
- Ensure request authenticity
- Detect request tampering
- **Highest security level**

### How It Works

1. Generate HMAC SHA-256 signature
2. Include timestamp to prevent replay attacks
3. Server verifies signature matches

### Enable Signatures

**Update API Key** (requires database access):
```sql
UPDATE api_keys
SET require_signature = 1,
    api_secret = '<32-byte-hex-secret>'
WHERE api_key = 'sk_live_xxxxx';
```

### Signature Format

**Header**:
```
X-Signature: t=<timestamp>,v1=<hmac_sha256_hex>
```

**Payload to Sign**:
```
${timestamp}.${method}.${path}.${body}
```

### Example: JavaScript (Node.js)

```javascript
const crypto = require('crypto');

function signRequest(method, path, body, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${timestamp}.${method}.${path}.${body || ''}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

// Usage
const signature = signRequest(
  'POST',
  '/api/verify-session',
  JSON.stringify({ session_id: 'sess_xxx' }),
  'your-api-secret-32-bytes'
);

fetch('https://mypasswordchecker.com/api/verify-session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'sk_live_xxxxx',
    'X-Signature': signature
  },
  body: JSON.stringify({ session_id: 'sess_xxx' })
});
```

### Example: Python

```python
import hmac
import hashlib
import time
import requests

def sign_request(method, path, body, secret):
    timestamp = int(time.time())
    payload = f"{timestamp}.{method}.{path}.{body or ''}"

    signature = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

    return f"t={timestamp},v1={signature}"

# Usage
signature = sign_request(
    'POST',
    '/api/verify-session',
    '{"session_id":"sess_xxx"}',
    'your-api-secret-32-bytes'
)

response = requests.post(
    'https://mypasswordchecker.com/api/verify-session',
    headers={
        'Content-Type': 'application/json',
        'X-API-Key': 'sk_live_xxxxx',
        'X-Signature': signature
    },
    json={'session_id': 'sess_xxx'}
)
```

### Signature Validation

- ✅ Timestamp must be within **5 minutes** of current time
- ✅ Signature must match server calculation
- ❌ Old signatures rejected (prevents replay attacks)
- ❌ Invalid signatures flagged as abuse

---

## Rate Limiting

### Tier-Based Limits

| Tier | Requests/Minute | Monthly Quota |
|------|-----------------|---------------|
| 1    | 10              | 10,000        |
| 2    | 100             | 100,000       |
| 3    | 1,000           | 1,000,000     |

### Rate Limit Headers

**Response Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1703980860
```

### Rate Limit Exceeded

**Response (429 Too Many Requests)**:
```json
{
  "error": "Rate limit exceeded. Limit: 100 requests/minute. Try again in 42 seconds.",
  "errorCode": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 42
}
```

### Custom Rate Limits

**Contact admin to set custom limits** (requires database update):
```sql
UPDATE api_keys
SET rate_limit_per_minute = 500
WHERE api_key = 'sk_live_xxxxx';
```

---

## Abuse Detection

### Abuse Score (0-100)

The system automatically calculates an **abuse score** based on:

| Violation Type | Score Weight |
|----------------|--------------|
| Invalid signature | +15 per occurrence |
| Unauthorized domain | +12 per occurrence |
| Unauthorized IP | +12 per occurrence |
| Rate limit exceeded | +10 per occurrence |
| Invalid API key | +20 per occurrence |
| Missing signature | +8 per occurrence |

### Auto-Suspension

- **Score >70**: API key automatically suspended
- Status changed to `'suspended'`
- Abuse event created with severity `'critical'`
- Admin notification triggered

### Abuse Score Monitoring

**Check your score**:
```bash
curl "https://mypasswordchecker.com/api/dashboard/usage?api_key=sk_live_xxxxx"
```

Response includes:
```json
{
  "abuse_score": 0,
  "status": "active",
  ...
}
```

### Appeal Suspension

If suspended:
1. Contact support with API key
2. Explain the issue
3. Admin reviews abuse events
4. If legitimate, key is unsuspended
5. Abuse score reset to 0

---

## Developer Dashboard

### Available Endpoints

#### 1. Get Usage Statistics

```bash
curl "https://mypasswordchecker.com/api/dashboard/usage?api_key=sk_live_xxxxx"
```

Response:
```json
{
  "api_key": "sk_live_abc123...",
  "tier": 2,
  "email": "user@example.com",
  "email_verified": true,
  "quota_used": 5420,
  "quota_limit": 100000,
  "quota_percentage": "5.42",
  "billing_cycle_start": 1703980800000,
  "billing_cycle_end": 1706659200000,
  "days_remaining": 15,
  "total_requests": 15420,
  "abuse_score": 0,
  "status": "active",
  "verified_domains": [
    {
      "domain": "example.com",
      "status": "verified",
      "verified_at": 1703980800000
    }
  ],
  "recent_requests": [...],
  "top_endpoints": [...],
  "error_rate": "2.30%",
  "rate_limit": 100
}
```

#### 2. Rotate API Key

```bash
curl -X POST https://mypasswordchecker.com/api/dashboard/rotate-key \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "sk_live_old_key"
  }'
```

Response:
```json
{
  "success": true,
  "old_key": "sk_live_old...",
  "new_key": "sk_live_new_abc123def456...",
  "new_secret": "new_secret_32_bytes",
  "rotated_at": 1703980800000,
  "message": "API key rotated successfully. Update your applications within 24 hours."
}
```

**⚠️ Important**: Old key stops working after 24 hours. Update all applications immediately.

#### 3. Domain Management

See [Domain Whitelisting](#domain-whitelisting) section above.

#### 4. Email Verification

See [Email Verification](#email-verification) section above.

---

## Admin Dashboard

### Authentication

All admin endpoints require **Bearer token authentication**:

```bash
Authorization: Bearer <ADMIN_TOKEN>
```

### Set Admin Token

```bash
# Generate strong token
openssl rand -hex 32

# Set as secret
wrangler secret put ADMIN_TOKEN --config wrangler-api.toml
# Enter: <generated-token>
```

### Available Endpoints

#### 1. View All API Keys

```bash
curl -X GET https://mypasswordchecker.com/api/admin/all-keys \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Optional parameters:
- `?status=active` - Filter by status
- `?limit=50` - Limit results (default: 100)
- `?offset=100` - Pagination offset

Response:
```json
{
  "total_keys": 42,
  "active": 35,
  "pending": 3,
  "suspended": 2,
  "canceled": 2,
  "expired": 0,
  "keys": [...]
}
```

#### 2. Platform-Wide Statistics

```bash
curl -X GET https://mypasswordchecker.com/api/admin/usage-stats \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Response:
```json
{
  "total_requests_today": 5420,
  "total_requests_week": 38500,
  "total_requests_month": 142300,
  "active_api_keys": 35,
  "active_premium_sessions": 12,
  "total_revenue_month": 450.00,
  "total_transactions_month": 145,
  "top_users": [
    {
      "user_email": "power_user@example.com",
      "tier": 3,
      "request_count": 25000,
      "quota_used": 25000,
      "quota_limit": 1000000
    },
    ...
  ],
  "requests_by_tier": {
    "1": 1000,
    "2": 5000,
    "3": 30000
  },
  "error_rate": "2.30%",
  "unresolved_abuse_events": 2
}
```

#### 3. Abuse Alerts

```bash
curl -X GET https://mypasswordchecker.com/api/admin/abuse-alerts \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Optional parameters:
- `?severity=critical` - Filter by severity (critical, high, medium, low)
- `?limit=50` - Limit results (default: 50)

Response:
```json
{
  "total_unresolved": 5,
  "critical": 1,
  "high": 2,
  "medium": 1,
  "low": 1,
  "alerts": [
    {
      "id": 42,
      "created_at": 1703980800000,
      "api_key": "sk_live_xxx",
      "user_email": "user@example.com",
      "event_type": "invalid_signature",
      "severity": "high",
      "description": "Request signature verification failed",
      "ip_address": "1.2.3.4",
      "endpoint": "/api/verify-session",
      "action_taken": "blocked",
      "resolved": 0,
      "key_status": "active",
      "abuse_score": 45
    },
    ...
  ]
}
```

#### 4. Suspend/Unsuspend API Key

```bash
curl -X POST https://mypasswordchecker.com/api/admin/suspend-key \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "sk_live_xxxxx",
    "action": "suspend",
    "reason": "Suspected fraudulent activity"
  }'
```

Response:
```json
{
  "success": true,
  "action": "suspend",
  "api_key": "sk_live_xxx...",
  "user_email": "user@example.com",
  "message": "API key suspended successfully"
}
```

**Unsuspend**:
```bash
curl -X POST https://mypasswordchecker.com/api/admin/suspend-key \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "sk_live_xxxxx",
    "action": "unsuspend"
  }'
```

---

## Best Practices

### For Developers

#### ✅ DO:

1. **Store API Keys Securely**
   - Use environment variables
   - Never commit to git
   - Rotate regularly (every 90 days)

2. **Verify Email Immediately**
   - Complete verification after payment
   - Keep email address valid
   - Update email if changed

3. **Use Domain Whitelisting**
   - Add all production domains
   - Verify via DNS for highest security
   - Update when adding new domains

4. **Monitor Usage**
   - Check dashboard weekly
   - Set up quota alerts
   - Monitor error rates

5. **Handle Errors Gracefully**
   - Implement exponential backoff
   - Cache valid responses
   - Log errors for debugging

#### ❌ DON'T:

1. **Never Expose API Keys**
   - Don't include in client-side code
   - Don't log in console
   - Don't share via email/chat

2. **Don't Ignore Abuse Scores**
   - Monitor score regularly
   - Investigate high scores
   - Fix security issues promptly

3. **Don't Bypass Security**
   - Don't disable signatures
   - Don't use wildcards in domains
   - Don't share API secrets

### For Admins

#### Monitoring Checklist

- [ ] Review abuse alerts daily
- [ ] Check platform stats weekly
- [ ] Audit API key usage monthly
- [ ] Review suspended keys quarterly
- [ ] Rotate admin token annually

#### Security Checklist

- [ ] Verify email required for all keys
- [ ] Domain verification enforced
- [ ] Rate limits appropriate for tiers
- [ ] Abuse detection threshold set to 70
- [ ] Admin token is 32+ bytes
- [ ] Audit logs reviewed monthly

---

## Support

### Developer Support

**Issues with API access:**
1. Check abuse score in dashboard
2. Verify email is confirmed
3. Review domain whitelist
4. Check quota usage
5. Contact support if issues persist

**Email**: support@mypasswordchecker.com

### Admin Support

**For admin-level issues:**
1. Review abuse alerts
2. Check platform stats
3. Investigate suspicious activity
4. Use suspend/unsuspend as needed

---

## Changelog

### Version 2.0 (Enhanced Security)

✨ **New Features:**
- Email verification required
- Domain whitelisting (DNS/file/meta)
- IP whitelisting (optional)
- Request signature verification (HMAC SHA-256)
- Automated abuse detection (0-100 score)
- Auto-suspension at score >70
- Developer dashboard (7 endpoints)
- Admin dashboard (4 endpoints)
- API key rotation
- Comprehensive request logging

🛡️ **Security Improvements:**
- 8-layer validation
- Real-time abuse monitoring
- Tier-based rate limiting
- Audit trail logging
- Admin token authentication

---

**Last Updated**: December 27, 2025
**API Version**: 2.0
**Documentation Version**: 1.0
