# API Worker Analysis - Phase 4

**File**: /Users/jack/Projects - Xcode/mypasswordchecker/analysis/api-worker-analysis.md
**Action**: NEW FILE
**Dependencies**: None
**Analysis Date**: December 27, 2025

---

## 🔍 EXECUTIVE SUMMARY

**Finding**: API worker file (`workers/api-d1.js`) does NOT exist in the current repository, despite being referenced in `wrangler.toml`.

**Status**: Need to create new API worker from scratch based on configuration and frontend requirements.

**Impact**: This is a greenfield implementation - Jack will need to provide PayPal integration code or we'll create skeleton with TODOs.

---

## 📁 FILE SEARCH RESULTS

### Search Locations
- ✅ Searched `/Users/jack/Projects - Xcode/mypasswordchecker/` (current project)
- ✅ Searched for `api-d1.js` globally
- ✅ Searched for `workers/**/*.js` (excluding node_modules)
- ✅ Checked `public/` directory for embedded API code

### Findings
- ❌ `workers/api-d1.js` does NOT exist
- ❌ `workers/` directory does NOT exist
- ✅ `wrangler.toml` exists and references `workers/api-d1.js` as `main`
- ✅ `public/premium.html` contains frontend PayPal integration code
- ✅ Frontend makes API calls to endpoints (documented below)

---

## 🔧 WRANGLER.TOML CONFIGURATION ANALYSIS

**File**: `/Users/jack/Projects - Xcode/mypasswordchecker/wrangler.toml`

### Worker Configuration
```toml
name = "mypasswordchecker-api"
main = "workers/api-d1.js"  # ❌ FILE DOES NOT EXIST
compatibility_date = "2024-10-11"
compatibility_flags = ["nodejs_compat"]
account_id = "ee34e44964865d1bccb86107d578c55a"  # ⚠️ OLD ACCOUNT, NOT SKYPATHWAYS
```

### D1 Database Binding
```toml
[[d1_databases]]
binding = "DB"
database_name = "mypasswordchecker-db"
database_id = "b85d3188-2c9b-4fa8-89b6-81d3a1861f97"
```

**Status**: Database ID provided. Need to verify if database exists in SkyPathways account.

### R2 Bucket (Audit Logs)
```toml
[[r2_buckets]]
binding = "AUDIT_LOGS"
bucket_name = "mypasswordchecker-audit-logs"
```

**Purpose**: 7-year retention for audit logs (SOC 2 compliance).

### KV Namespaces
```toml
[[kv_namespaces]]
binding = "API_KEYS"
id = "abc93d05a370492aabbee14b2d58f26f"

[[kv_namespaces]]
binding = "USAGE_TRACKING"
id = "be5ec99ec61e45c6b2d48cf18c77889e"

[[kv_namespaces]]
binding = "SESSION_CACHE"
id = "acee2dfd237545babb617439e6a86db6"
```

**Status**: These KV namespaces have IDs. Need to verify if they exist in SkyPathways account or if they're in the OLD account.

### Environment Variables
```toml
[vars]
DOMAIN = "https://mypasswordchecker.com"
STRIPE_ENVIRONMENT = "production"  # ⚠️ Both Stripe AND PayPal configured
PAYPAL_ENVIRONMENT = "production"
TIER1_FREE_QUOTA = "25"
TIER1_PAID_PRICE = "1900"  # $19.00 in cents
TIER1_PAID_QUOTA = "3000"
TIER1_QUANTUM_MONTHLY_QUOTA = "15000"
TIER1_OVERAGE_PRICE = "9"  # $0.09 in cents
TIER2_PER_REQUEST_PRICE = "100"  # $1.00 in cents
TIER2_MONTHLY_PRICE = "15000"  # $150.00 in cents
TIER2_MONTHLY_QUOTA = "1500"
TIER2_OVERAGE_PRICE = "9"  # $0.09 in cents
```

**Note**: Configuration supports BOTH Stripe and PayPal payment processors.

### Secrets (Commented Out)
```toml
# Secrets (set separately via Cloudflare dashboard or wrangler secret put)
# STRIPE_SECRET_KEY = "sk_live_..."
# STRIPE_SANDBOX_SECRET_KEY = "sk_test_..."
# STRIPE_PUBLISHABLE_KEY = "pk_live_..."
# STRIPE_SANDBOX_PUBLISHABLE_KEY = "pk_test_..."
# STRIPE_WEBHOOK_SECRET = "whsec_..."
```

**Action Required**: Jack needs to add PayPal secrets:
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`

### Routes Configuration
```toml
# Main domain (API only)
[[routes]]
pattern = "mypasswordchecker.com/api/*"
zone_name = "mypasswordchecker.com"

[[routes]]
pattern = "www.mypasswordchecker.com/api/*"
zone_name = "mypasswordchecker.com"

# Alternate domains (redirect all traffic)
[[routes]]
pattern = "mypasswordcheck.com/*"
...
```

**Critical**: API worker handles `/api/*` routes only. Static assets handled by separate worker deployed in Phase 3.

---

## 🌐 FRONTEND API ENDPOINTS (from premium.html)

### Identified API Calls

#### 1. `/api/verify?session_id={sessionId}`
- **Method**: GET
- **Purpose**: Verify premium session validity
- **Frontend Code** (line 477):
  ```javascript
  const response = await fetch(`/api/verify?session_id=${sessionId}`);
  ```
- **Expected Response**: JSON with session validity

#### 2. `/api/track-usage`
- **Method**: POST
- **Purpose**: Track usage analytics
- **Frontend Code** (line 515):
  ```javascript
  await fetch('/api/track-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'premium-access', session_id: sessionId })
  });
  ```
- **Expected Response**: 200 OK

#### 3. `/api/create-paypal-order`
- **Method**: POST
- **Purpose**: Create PayPal order for $1.00 premium access
- **Frontend Code** (line 549):
  ```javascript
  const response = await fetch('/api/create-paypal-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: '1.00' })
  });
  const order = await response.json();
  return order.id;  // Returns PayPal order ID
  ```
- **Expected Response**: `{ "id": "PAYPAL_ORDER_ID" }`

#### 4. `/api/paypal-verify?order_id={orderID}`
- **Method**: GET
- **Purpose**: Verify PayPal payment completion and activate premium
- **Frontend Code** (line 578):
  ```javascript
  const response = await fetch(`/api/paypal-verify?order_id=${data.orderID}`);
  const result = await response.json();
  if (result.session_id) {
      localStorage.setItem('premium_session', result.session_id);
      localStorage.setItem('premium_expires', Date.now() + (24 * 60 * 60 * 1000));
      window.location.href = '/premium.html?paypal_success=true';
  }
  ```
- **Expected Response**: `{ "session_id": "...", "expires": "..." }`

---

## 💳 PAYPAL INTEGRATION DETAILS

### PayPal Client ID (Hardcoded in Frontend)
**Location**: `public/premium.html` line 534

```javascript
paypalScript.src = 'https://www.paypal.com/sdk/js?client-id=AakYgdAB7Qh88WH5DKYNXwxqyOrF35GhoZvAxu2n4HeP4NaSD7fgAn7XtV6A1eTEyvjIF1-41eTgKInC&currency=USD';
```

**Client ID**: `AakYgdAB7Qh88WH5DKYNXwxqyOrF35GhoZvAxu2n4HeP4NaSD7fgAn7XtV6A1eTEyvjIF1-41eTgKInC`

⚠️ **Security Note**: Client ID is public (safe to expose in frontend). Client Secret must be kept in Worker secrets.

### Payment Flow
1. User clicks "Pay with PayPal" button
2. Frontend calls `/api/create-paypal-order` → Worker creates PayPal order → Returns order ID
3. User completes payment in PayPal popup
4. PayPal redirects back with `orderID`
5. Frontend calls `/api/paypal-verify?order_id=...` → Worker verifies payment with PayPal → Returns session ID
6. Frontend stores session in localStorage (24-hour expiration)
7. Premium features unlocked

---

## 💰 PRICING MODEL (from wrangler.toml vars)

### Tier 1: Standard API
- **Free Quota**: 25 requests/month
- **Paid Plan**: $19.00/month for 3,000 requests
- **Quantum Monthly Quota**: 15,000 requests
- **Overage**: $0.09 per request

### Tier 2: Premium API
- **Per-Request**: $1.00 per request
- **Monthly Plan**: $150.00/month for 1,500 requests
- **Overage**: $0.09 per request

### One-Time Premium Access
- **Price**: $1.00
- **Duration**: 24 hours
- **Features**: Quantum analysis + Phonetic generator + Breach check

---

## 🗄️ DATABASE SCHEMA (Assumed from bindings)

Based on the bindings and endpoints, the D1 database likely needs:

### `sessions` table
```sql
CREATE TABLE sessions (
    session_id TEXT PRIMARY KEY,
    user_ip TEXT,
    created_at INTEGER,
    expires_at INTEGER,
    payment_type TEXT,  -- 'paypal', 'stripe'
    payment_id TEXT,    -- PayPal order ID or Stripe charge ID
    amount REAL,
    features TEXT       -- JSON: ["quantum", "phonetic", "breach"]
);
```

### `api_keys` table
```sql
CREATE TABLE api_keys (
    api_key TEXT PRIMARY KEY,
    user_email TEXT,
    tier INTEGER,       -- 1 or 2
    created_at INTEGER,
    quota_limit INTEGER,
    quota_used INTEGER,
    billing_cycle_start INTEGER,
    stripe_subscription_id TEXT
);
```

### `usage_tracking` table
```sql
CREATE TABLE usage_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER,
    session_id TEXT,
    api_key TEXT,
    feature TEXT,       -- 'premium-access', 'quantum-check', 'api-call'
    endpoint TEXT,
    user_ip TEXT,
    user_agent TEXT
);
```

⚠️ **Action Required**: Jack needs to provide actual schema or confirm these assumptions.

---

## 🔑 REQUIRED SECRETS

Jack needs to add these secrets before deployment:

```bash
wrangler secret put PAYPAL_CLIENT_ID --config wrangler-api.toml
wrangler secret put PAYPAL_CLIENT_SECRET --config wrangler-api.toml
```

Optional (if using Stripe as fallback):
```bash
wrangler secret put STRIPE_SECRET_KEY --config wrangler-api.toml
wrangler secret put STRIPE_PUBLISHABLE_KEY --config wrangler-api.toml
wrangler secret put STRIPE_WEBHOOK_SECRET --config wrangler-api.toml
```

---

## ⚙️ DEPENDENCIES

### Required Cloudflare Resources

1. **D1 Database**: `mypasswordchecker-db` (ID: `b85d3188-2c9b-4fa8-89b6-81d3a1861f97`)
   - Status: Unknown (need to check if exists in SkyPathways account)

2. **R2 Bucket**: `mypasswordchecker-audit-logs`
   - Status: Unknown (need to check if exists)

3. **KV Namespaces** (3 total):
   - `API_KEYS` (ID: `abc93d05a370492aabbee14b2d58f26f`)
   - `USAGE_TRACKING` (ID: `be5ec99ec61e45c6b2d48cf18c77889e`)
   - `SESSION_CACHE` (ID: `acee2dfd237545babb617439e6a86db6`)
   - Status: Unknown (likely in OLD account, need to recreate in SkyPathways)

### External APIs
- **PayPal Orders API**: For creating and verifying payments
- **Have I Been Pwned API** (optional): For breach checking (if proxied through Worker)

---

## 🚧 CRITICAL ISSUES

### Issue 1: Account Mismatch
- `wrangler.toml` has `account_id = "ee34e44964865d1bccb86107d578c55a"` (OLD account)
- Phase 3 deployed to `account_id = "be1ad24bfb43615483c3a472aa134892"` (SkyPathways)
- **Action Required**: Update wrangler.toml to use SkyPathways account ID

### Issue 2: Missing Worker File
- `workers/api-d1.js` does not exist
- **Action Required**: Create skeleton API worker or Jack provides implementation

### Issue 3: Unclear Resource Migration
- D1 database, R2 bucket, and KV namespaces have IDs from OLD account
- **Action Required**: Check if resources exist in SkyPathways account
- If not, recreate resources and update IDs in configuration

---

## 📋 NEXT STEPS

### 1. Verify Cloudflare Resources (Task 3)
```bash
# Check D1 databases
wrangler d1 list

# Check R2 buckets
wrangler r2 bucket list

# Check KV namespaces
wrangler kv:namespace list
```

### 2. Create API Worker Skeleton (Task 4)
Create `workers/mypasswordchecker-api.js` with:
- 4 API endpoints (verify, track-usage, create-paypal-order, paypal-verify)
- D1 database integration
- PayPal API integration (TODOs if Jack doesn't provide code)
- KV namespace integration for sessions

### 3. Update wrangler.toml for SkyPathways Account (Task 5)
- Change `account_id` to SkyPathways
- Update resource IDs based on verification step
- Create `wrangler-api.toml` separate from main wrangler.toml

### 4. Database Migration (if needed)
- Create D1 database in SkyPathways account
- Run schema migrations
- Migrate any existing data (if applicable)

---

## ✅ SUMMARY

| Item | Status |
|------|--------|
| API worker file exists | ❌ NO - Must create |
| Frontend endpoints documented | ✅ YES - 4 endpoints identified |
| PayPal Client ID found | ✅ YES - Hardcoded in frontend |
| Database schema known | ⚠️ ASSUMED - Jack should verify |
| D1 database exists | ❓ UNKNOWN - Need to check |
| KV namespaces exist | ❓ UNKNOWN - Need to check |
| Secrets configured | ❌ NO - Jack must add |
| Account ID correct | ❌ NO - Old account, needs update |
| Ready to deploy | ❌ NO - Multiple blockers |

**Blocker Count**: 5 critical blockers before deployment

---

**Recommendation**: Create skeleton API worker with TODOs, then wait for Jack to:
1. Verify/create D1 database and KV namespaces
2. Add PayPal secrets
3. Implement or provide PayPal integration code
4. Confirm database schema

---

**End of Analysis**
