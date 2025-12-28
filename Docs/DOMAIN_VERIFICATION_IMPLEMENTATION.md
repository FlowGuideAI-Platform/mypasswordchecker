# Domain Verification System - Implementation Guide

## Overview

This document describes the layered security approach combining:
1. **Domain Verification** - Customers verify domain ownership (DNS TXT or HTTP file)
2. **Domain-Specific Secrets** - Each verified domain gets unique secret for request signing
3. **Rate Limiting** - Verified domains get 100 req/min, unverified get 10 req/min
4. **Fraud Monitoring** - Email alerts when unverified domains detected

## Implementation Status

### ✅ Completed (Phase 1)

#### 1. Database Schema
**File:** `d1-schema.sql` + `migrations/001_add_domain_verification.sql`

```sql
CREATE TABLE domain_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT NOT NULL,
    domain TEXT NOT NULL,
    verification_token TEXT UNIQUE NOT NULL,  -- For DNS/HTTP verification
    domain_secret TEXT UNIQUE NOT NULL,        -- For request signing
    verification_method TEXT NOT NULL,         -- 'dns' or 'http'
    status TEXT NOT NULL DEFAULT 'pending',    -- 'pending', 'verified', 'failed'
    verified_at TEXT,
    last_used_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(customer_id, domain)
);
```

**Key Fields:**
- `verification_token`: Customer adds this to DNS TXT or HTTP file (e.g., `verify_abc123...`)
- `domain_secret`: Unique secret returned to verified domain for signing requests (e.g., `secret_xyz789...`)
- `status`: 'pending' → 'verified' after successful verification
- Max 3 domains per customer_id (enforced in API)

#### 2. Domain Verification Functions
**File:** `workers/api-d1.js` (lines 107-259)

**Functions added:**
```javascript
// Token generation
generateToken(prefix) // Cryptographically secure random tokens

// DNS TXT verification
verifyDNSTXT(domain, expectedToken)
// Checks for TXT record at: _mypasswordchecker.example.com
// Expected format: "mypasswordchecker-verify=abc123..."

// HTTP file verification
verifyHTTPFile(domain, expectedToken)
// Checks these URLs in order:
//   https://example.com/.well-known/mypasswordchecker-verify.txt
//   https://example.com/mypasswordchecker-verify.txt
//   http://example.com/.well-known/mypasswordchecker-verify.txt
//   http://example.com/mypasswordchecker-verify.txt
// File must contain exact token

// Domain ownership verification
verifyDomainOwnership(domain, token, method)

// Domain verification check with rate limiting
checkDomainVerification(origin, customer_id, env)
// Returns: { verified, rateLimit, domainSecret, domain, message }

// Rate limiting (KV-based)
checkRateLimit(key, limit, env)
// Limits per-minute requests
// Returns: { allowed, current, limit, resetIn }
```

### ⏳ Pending (Phase 2-4)

#### Phase 2: API Integration

**Need to add to `/api/v1/check-password` endpoint:**

```javascript
// After API key validation
const apiKey = request.headers.get('X-API-Key');
const origin = request.headers.get('Origin');

const validation = await validateApiKey(apiKey, env);
if (!validation.valid) {
  return jsonResponse({ error: validation.error }, validation.code);
}

// NEW: Check domain verification
const domainCheck = await checkDomainVerification(
  origin,
  validation.keyData.customer_id,
  env
);

// NEW: Apply rate limiting
const rateLimit = await checkRateLimit(
  `${validation.keyData.customer_id}:${domainCheck.domain}`,
  domainCheck.rateLimit,
  env
);

if (!rateLimit.allowed) {
  // Send email alert if unverified domain
  if (!domainCheck.verified) {
    await sendUnverifiedDomainAlert(
      validation.keyData.email,
      domainCheck.domain,
      env
    );
  }

  return jsonResponse({
    error: 'Rate limit exceeded',
    limit: rateLimit.limit,
    current: rateLimit.current,
    resetIn: rateLimit.resetIn,
    message: domainCheck.message
  }, 429);
}

// Add rate limit headers to response
const headers = {
  'X-RateLimit-Limit': domainCheck.rateLimit,
  'X-RateLimit-Remaining': rateLimit.limit - rateLimit.current,
  'X-RateLimit-Reset': rateLimit.resetIn
};

// Continue with password check...
```

**New Endpoints Needed:**

```javascript
// POST /api/domains/add
// Add new domain for verification
{
  "domain": "example.com",
  "method": "dns" // or "http"
}
// Returns: { verification_token, instructions }

// POST /api/domains/verify
// Trigger verification check
{
  "domain": "example.com"
}
// Returns: { success, domain_secret } // secret only if verified

// GET /api/domains/list
// List all domains and their status
// Returns: [{ domain, status, verified_at, last_used_at }]

// DELETE /api/domains/:domain
// Remove domain verification
```

#### Phase 3: Dashboard UI

**File to create:** `public/domain-verification.html`

**Features:**
1. List verified domains (max 3)
2. Add new domain button
3. Verification instructions modal:
   - DNS TXT method
   - HTTP file method
4. "Verify Now" button for each pending domain
5. Domain status badges (pending, verified, failed)
6. Show domain_secret after verification
7. Copy-to-clipboard for secrets

**Mockup:**
```
┌─ Verified Domains (1/3) ─────────────────────────────────┐
│                                                            │
│ ✓ example.com                           [Remove]          │
│   Verified: 2025-10-24                                    │
│   Last used: 5 minutes ago                                 │
│   Domain Secret: secret_xyz789...     [Copy]              │
│   Rate Limit: 100 requests/minute                         │
│                                                            │
│ ⏳ staging.example.com                   [Verify Now]      │
│   Status: Pending verification                             │
│   Method: DNS TXT                                          │
│   Token: verify_abc123...             [Copy]              │
│   Instructions: Add TXT record...     [Show Details]       │
│                                                            │
│ [+ Add New Domain]                                         │
└───────────────────────────────────────────────────────────┘
```

#### Phase 4: Client SDK

**File to create:** `public/sdk/password-checker-sdk.js`

**Purpose:** Simplify integration for customers, handle request signing automatically

**Usage:**
```javascript
// Customer includes SDK
<script src="https://mypasswordchecker.com/sdk/v1/password-checker.min.js"></script>

<script>
  // Initialize with API key and domain secret
  const checker = new MyPasswordChecker({
    apiKey: 'mpc_abc123...',
    domainSecret: 'secret_xyz789...' // From verified domain
  });

  // Check password
  const result = await checker.checkPassword('user_password');
  console.log(result.strength); // 0-4
  console.log(result.crackTime); // "centuries"

  // Check quantum estimate (if subscribed)
  const quantum = await checker.quantumEstimate('user_password');
  console.log(quantum.grover); // quantum crack time
</script>
```

**SDK Features:**
- Automatic request signing using domain secret
- Built-in rate limit handling (shows user-friendly messages)
- Offline fallback (basic zxcvbn check if API down)
- TypeScript types included
- Error handling with retry logic

**Implementation Notes:**
The SDK will sign requests using HMAC:
```javascript
async function signRequest(password, domainSecret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(domainSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(password)
  );

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

Server validates signature matches:
```javascript
// In API endpoint
const signature = request.headers.get('X-Domain-Signature');
const expectedSignature = await generateHMAC(password, domainCheck.domainSecret);

if (signature !== expectedSignature) {
  return jsonResponse({ error: 'Invalid domain signature' }, 403);
}
```

**Problem with this approach:**
- Attacker with access to SDK can still extract domain_secret and password
- Provides obfuscation but not true security

**Better approach for SDK:**
Only sign the password HASH, not the password itself:
```javascript
// Client-side
const passwordHash = await sha256(password);
const signature = await hmacSign(passwordHash, domainSecret);

fetch('/api/v1/check-password', {
  headers: {
    'X-API-Key': apiKey,
    'X-Password-Hash': passwordHash,
    'X-Domain-Signature': signature
  }
});
```

But this breaks zxcvbn analysis which needs the actual password...

**Pragmatic solution:**
- Offer SDK for convenience, not security
- Real security comes from domain verification + monitoring
- Document in SDK: "This does not prevent malicious sites from capturing passwords"

#### Phase 5: Email Alerts

**Need to integrate email service (e.g., Resend, SendGrid, Mailgun)**

**Trigger:** Unverified domain detected making requests

**Email template:**
```
Subject: Unverified Domain Detected Using Your API Key

Hello,

We detected API requests from an unverified domain using your API key:

Domain: malicious-site.com
API Key: mpc_***...e399
Requests: 10 (throttled to 10/min)
First seen: 2025-10-24 14:30 UTC
IP Address: 203.0.113.45
Country: Unknown

This domain is not verified on your account. Requests are throttled to
10 per minute for your protection.

Actions you can take:

1. If this is your domain: Verify it in your dashboard
   → https://mypasswordchecker.com/dashboard.html#domains

2. If this is NOT your domain: Your API key may have been compromised
   → Rotate your API key immediately
   → Review your audit logs for suspicious activity

3. If you suspect fraud:
   → Contact support@mypasswordchecker.com
   → We can block this domain/IP

View full audit log:
https://mypasswordchecker.com/dashboard.html#audit?domain=malicious-site.com

--
MyPasswordChecker Security Team
```

## Security Analysis

### What This Prevents

✅ **Stolen API Keys Used on Unauthorized Sites**
- Attacker can't verify domains they don't control
- Requests from unverified domains are heavily throttled
- Customer gets immediate email alert

✅ **API Key Sharing/Reselling**
- Each domain needs separate verification
- Can't use one key across many sites without verification
- Max 3 domains enforced

✅ **Credential Stuffing at Scale**
- Rate limiting prevents mass password checking
- Unverified domains limited to 10 req/min

### What This Doesn't Prevent

⚠️ **Password Theft by Malicious Verified Sites**
- If attacker controls a verified domain, they can still capture passwords
- The API sees plaintext passwords (required for zxcvbn)
- Domain verification proves ownership, not trustworthiness

⚠️ **Insider Threats**
- Legitimate customer with verified domain can misuse the API
- ToS violation but technically allowed

⚠️ **Sophisticated Attackers**
- Can reverse-engineer SDK to extract domain secrets
- Can bypass client-side protections

### Recommended Additional Protections

1. **Anomaly Detection:**
   - Flag accounts with unusually high error rates (sign of credential stuffing)
   - Flag accounts checking same passwords repeatedly
   - Flag accounts with requests from many countries

2. **Honeypot Passwords:**
   - Track if anyone checks known-compromised passwords
   - Ban accounts checking passwords from breach databases

3. **CAPTCHA for High-Risk:**
   - Require CAPTCHA after N failed checks
   - Integrate with Cloudflare Turnstile

4. **IP Reputation:**
   - Block known VPN/proxy IPs for free tier
   - Block high-risk countries (based on fraud data)

## Migration Steps

### Step 1: Update Database
```bash
# Apply migration
wrangler d1 execute mypasswordchecker-db --file=migrations/001_add_domain_verification.sql
```

### Step 2: Deploy Worker
```bash
# Worker already has helper functions
# Need to add endpoint integration (Phase 2)
wrangler deploy workers/api-d1.js
```

### Step 3: Update Dashboard
```bash
# Create domain-verification.html
# Add link in dashboard navigation
wrangler pages deploy public --project-name=mypasswordchecker
```

### Step 4: Create SDK
```bash
# Build and minify SDK
npm run build:sdk

# Deploy SDK
cp dist/password-checker-sdk.min.js public/sdk/v1/
wrangler pages deploy public --project-name=mypasswordchecker
```

### Step 5: Update Documentation
- API docs with domain verification requirements
- SDK integration guide
- Migration guide for existing customers

## Testing Plan

### Unit Tests
- DNS TXT verification with mock DNS responses
- HTTP file verification with test servers
- Rate limiting logic
- Token generation uniqueness

### Integration Tests
1. Add domain with DNS method
2. Verify domain successfully
3. Make API request from verified domain (should succeed)
4. Make API request from unverified domain (should throttle)
5. Exceed rate limit (should block)
6. Remove domain (should revoke access)

### Load Tests
- 1000 req/min from verified domain (should handle)
- 100 req/min from unverified domain (should throttle at 10)
- Multiple domains per customer

## Rollout Plan

### Week 1: Beta Testing
- Enable for your account only
- Test DNS and HTTP verification
- Verify rate limiting works
- Check audit logs

### Week 2: Opt-In Beta
- Email power users
- Offer early access
- Collect feedback
- Fix bugs

### Week 3: Mandatory for New Customers
- All new API keys require domain verification
- Existing customers grandfathered (but encouraged to verify)

### Week 4: Mandatory for All
- Email all customers 2-week warning
- Migrate existing customers
- Block unverified after deadline

## Open Questions

1. **Should we allow localhost for development?**
   - Option A: Allow localhost/127.0.0.1 without verification (risky)
   - Option B: Require verification even for localhost (annoying for devs)
   - **Recommendation:** Allow localhost for free tier only, require verification for paid

2. **What about mobile apps?**
   - Mobile apps don't have domains
   - Option A: Use app bundle ID (com.example.app) as "domain"
   - Option B: Different verification method (app store verification)
   - **Recommendation:** Phase 2 feature - app verification separate from web

3. **Should domain secrets rotate?**
   - Currently static after verification
   - Could add rotation for security
   - **Recommendation:** Add optional manual rotation, no automatic rotation

4. **Rate limit grace period?**
   - First request from unverified domain: warn or block?
   - **Recommendation:** First 10 requests succeed with warning header, then block

## Cost Estimate

**Additional Cloudflare costs:**
- D1 queries: +1 query per API request (domain verification check) = ~$0.0001
- KV operations: +2 operations per request (rate limit read/write) = ~$0.0002
- DNS queries (for verification): Free (use Cloudflare DNS over HTTPS API)
- HTTP fetches (for verification): Free (no egress fees)

**Total additional cost per API request:** ~$0.0003

**Break-even:** Already profitable with current pricing

## Summary

This domain verification system provides **strong fraud prevention** while maintaining usability:

- ✅ Prevents stolen API keys from being used at scale
- ✅ Limits blast radius of compromised keys
- ✅ Provides immediate alerts on suspicious activity
- ✅ Industry-standard verification methods
- ⚠️ Does not prevent password theft by malicious verified sites (accept this risk)

**Next steps:** Complete Phase 2 (API integration) to enable testing.
