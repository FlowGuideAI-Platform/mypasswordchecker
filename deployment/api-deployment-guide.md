# API Worker Deployment Guide - Phase 4

**File**: /Users/jack/Projects - Xcode/mypasswordchecker/deployment/api-deployment-guide.md
**Action**: NEW FILE
**Dependencies**: Phase 3 completed (static assets deployed)
**Date**: December 27, 2025

---

## 🎯 OBJECTIVE

Deploy the API worker to handle PayPal payment processing, premium session management, and API subscriptions.

**Expected Result**: `/api/*` endpoints functional, premium purchases working, $0 additional cost (within free tiers).

---

## ⚠️ PREREQUISITES

### 1. Phase 3 Complete
✅ Static site deployed (mypasswordchecker-main)
✅ Bot protection deployed (mypasswordchecker-bot-protection)
✅ All routes working correctly

### 2. PayPal Account Setup
You'll need:
- PayPal Business account (or create at paypal.com/business)
- PayPal Client ID (production)
- PayPal Client Secret (production)

**Get PayPal credentials**:
1. Go to: https://developer.paypal.com/dashboard/
2. Login with your PayPal account
3. Navigate to "Apps & Credentials"
4. Select "Live" (not Sandbox)
5. Create new app or use existing
6. Copy **Client ID** and **Secret**

### 3. Wrangler Logged In
```bash
wrangler whoami
```
Should show: Account `be1ad24bfb43615483c3a472aa134892` (SkyPathways)

If not:
```bash
wrangler logout
wrangler login
# Select SkyPathways account during login
```

---

## 📋 STEP-BY-STEP DEPLOYMENT

### STEP 1: Verify Cloudflare Resources

Follow the instructions in `/analysis/d1-database-status.md` to verify:

**1.1 Check D1 Database**
```bash
cd "/Users/jack/Projects - Xcode/mypasswordchecker"
wrangler d1 list
```

**If database doesn't exist, create it**:
```bash
wrangler d1 create mypasswordchecker-db
```
**Output**: Note the `database_id` - you'll need it for Step 2.

**1.2 Create Database Schema**

The schema file has been created for you. Run:
```bash
wrangler d1 execute mypasswordchecker-db --file=schema.sql
```

This creates 3 tables:
- `sessions` - Premium 24-hour access sessions
- `api_keys` - Developer API subscriptions
- `usage_tracking` - Analytics

**1.3 Check R2 Bucket**
```bash
wrangler r2 bucket list
```

**If bucket doesn't exist, create it**:
```bash
wrangler r2 bucket create mypasswordchecker-audit-logs
```

**1.4 Check/Create KV Namespaces**
```bash
wrangler kv:namespace list
```

**Create 3 KV namespaces** (if they don't exist):
```bash
# API Keys cache
wrangler kv:namespace create "MYPWDCKR_API_KEYS"
# Save the returned ID

# Usage tracking cache
wrangler kv:namespace create "MYPWDCKR_USAGE_TRACKING"
# Save the returned ID

# Session cache (24-hour TTL)
wrangler kv:namespace create "MYPWDCKR_SESSION_CACHE"
# Save the returned ID
```

**IMPORTANT**: Note all 3 KV namespace IDs - you'll need them for Step 2.

---

### STEP 2: Update wrangler-api.toml with Resource IDs

Open `wrangler-api.toml` and replace all `PLACEHOLDER` values:

**2.1 D1 Database ID** (line ~28):
```toml
[[d1_databases]]
binding = "DB"
database_name = "mypasswordchecker-db"
database_id = "YOUR_D1_DATABASE_ID_HERE"  # Replace this
```

**2.2 KV Namespace IDs** (lines ~47-60):
```toml
# API Keys cache
[[kv_namespaces]]
binding = "API_KEYS"
id = "YOUR_API_KEYS_KV_ID_HERE"  # Replace this

# Usage tracking cache
[[kv_namespaces]]
binding = "USAGE_TRACKING"
id = "YOUR_USAGE_TRACKING_KV_ID_HERE"  # Replace this

# Session cache
[[kv_namespaces]]
binding = "SESSION_CACHE"
id = "YOUR_SESSION_CACHE_KV_ID_HERE"  # Replace this
```

**Verify**: All `PLACEHOLDER` values replaced? ✅

---

### STEP 3: Add PayPal Secrets

**3.1 Add PayPal Client ID**
```bash
wrangler secret put PAYPAL_CLIENT_ID --config wrangler-api.toml
```
When prompted, paste your PayPal Client ID and press Enter.

**3.2 Add PayPal Client Secret**
```bash
wrangler secret put PAYPAL_CLIENT_SECRET --config wrangler-api.toml
```
When prompted, paste your PayPal Client Secret and press Enter.

**Verify secrets were added**:
```bash
wrangler secret list --config wrangler-api.toml
```
Should show:
- PAYPAL_CLIENT_ID
- PAYPAL_CLIENT_SECRET

---

### STEP 4: Implement PayPal Integration Code

⚠️ **CRITICAL**: The API worker skeleton has been created with TODO placeholders. You need to implement PayPal integration.

**File to edit**: `workers/mypasswordchecker-api.js`

**Search for**: `TODO: JACK - IMPLEMENT PAYPAL`

**3 functions need implementation**:

1. **handleCreatePayPalOrder()** (line ~188):
   - Create PayPal order for $1.00
   - Return order ID to frontend

2. **handlePayPalVerify()** (line ~236):
   - Verify PayPal payment completed
   - Create session in D1
   - Cache session in KV
   - Return session_id to frontend

3. **getPayPalAccessToken()** (line ~298):
   - Get OAuth token from PayPal
   - Used by both order creation and verification

**PayPal Integration Resources**:
- Official Docs: https://developer.paypal.com/docs/api/overview/
- Orders API: https://developer.paypal.com/docs/api/orders/v2/
- Node.js Examples: https://github.com/paypal/Checkout-NodeJS-SDK

**Example Implementation** (simplified):

```javascript
// Get PayPal access token
async function getPayPalAccessToken(env) {
    const auth = btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`);
    const response = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });
    const data = await response.json();
    return data.access_token;
}

// Create PayPal order
async function handleCreatePayPalOrder(request, env, corsHeaders) {
    const accessToken = await getPayPalAccessToken(env);

    const orderResponse = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: 'USD',
                    value: '1.00'
                },
                description: 'MyPasswordChecker.com - 24 Hour Premium Access'
            }]
        })
    });

    const order = await orderResponse.json();
    return jsonResponse({ id: order.id }, 200, corsHeaders);
}
```

**Testing First**:
- Use PayPal Sandbox before production
- Change `wrangler-api.toml`: `PAYPAL_ENVIRONMENT = "sandbox"`
- Use sandbox credentials from PayPal Developer Dashboard

---

### STEP 5: Create schema.sql File

Create `schema.sql` in the project root with the database schema:

```sql
-- Sessions table (premium 24-hour access)
CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    user_ip TEXT,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    payment_type TEXT NOT NULL,
    payment_id TEXT NOT NULL,
    amount REAL NOT NULL,
    features TEXT,
    UNIQUE(payment_id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- API keys table (developer API subscriptions)
CREATE TABLE IF NOT EXISTS api_keys (
    api_key TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    tier INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    quota_limit INTEGER NOT NULL,
    quota_used INTEGER DEFAULT 0,
    billing_cycle_start INTEGER NOT NULL,
    stripe_subscription_id TEXT,
    status TEXT DEFAULT 'active',
    UNIQUE(user_email, tier)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_email ON api_keys(user_email);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);

-- Usage tracking table (analytics)
CREATE TABLE IF NOT EXISTS usage_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    session_id TEXT,
    api_key TEXT,
    feature TEXT NOT NULL,
    endpoint TEXT,
    user_ip TEXT,
    user_agent TEXT,
    request_duration_ms INTEGER,
    success INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_tracking(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_feature ON usage_tracking(feature);
CREATE INDEX IF NOT EXISTS idx_usage_api_key ON usage_tracking(api_key);
```

Then run (from Step 1.2):
```bash
wrangler d1 execute mypasswordchecker-db --file=schema.sql
```

---

### STEP 6: Test Locally

**6.1 Start local dev server**:
```bash
wrangler dev --config wrangler-api.toml --local
```

**6.2 Test endpoints** (in new terminal):

**Test /api/verify** (should return session not found):
```bash
curl "http://localhost:8787/api/verify?session_id=test123"
```

**Test /api/track-usage**:
```bash
curl -X POST http://localhost:8787/api/track-usage \
  -H "Content-Type: application/json" \
  -d '{"feature":"test","session_id":"test123"}'
```

**Test /api/create-paypal-order** (will return 501 until you implement PayPal):
```bash
curl -X POST http://localhost:8787/api/create-paypal-order \
  -H "Content-Type: application/json" \
  -d '{"amount":"1.00"}'
```

**6.3 Check D1 database** (verify data was inserted):
```bash
wrangler d1 execute mypasswordchecker-db \
  --command="SELECT * FROM usage_tracking ORDER BY timestamp DESC LIMIT 5;"
```

**Expected**: Should see the test track-usage record.

---

### STEP 7: Deploy to Production

**7.1 Final verification**:
- ✅ All PLACEHOLDER values replaced in wrangler-api.toml
- ✅ PayPal secrets added
- ✅ PayPal integration implemented (or tested in sandbox first)
- ✅ Local testing passed
- ✅ schema.sql executed on D1 database

**7.2 Deploy**:
```bash
wrangler deploy --config wrangler-api.toml
```

**Expected output**:
```
✨ Built successfully!
✨ Uploading...
✨ Published mypasswordchecker-api
  https://mypasswordchecker.com/api/*
```

**7.3 Verify deployment**:
```bash
wrangler deployments list --name mypasswordchecker-api
```

Should show latest deployment with status "Success".

---

### STEP 8: Test Production Endpoints

**8.1 Test /api/verify**:
```bash
curl "https://mypasswordchecker.com/api/verify?session_id=test123"
```

**Expected**: 404 with "Session not found" (correct - no session exists yet).

**8.2 Test /api/track-usage**:
```bash
curl -X POST https://mypasswordchecker.com/api/track-usage \
  -H "Content-Type: application/json" \
  -d '{"feature":"production-test","session_id":"test123"}'
```

**Expected**: 200 with `{"success":true,"tracked":true}`

**8.3 Test PayPal integration** (end-to-end):
1. Go to https://mypasswordchecker.com/premium.html
2. Click "Pay with PayPal" button
3. Complete test payment (use PayPal Sandbox first!)
4. Verify premium features activate

**8.4 Check D1 database**:
```bash
wrangler d1 execute mypasswordchecker-db \
  --command="SELECT COUNT(*) as total FROM usage_tracking;"
```

Should show records from testing.

**8.5 Check R2 audit logs**:
```bash
wrangler r2 object list mypasswordchecker-audit-logs | head -10
```

Should show audit log files.

---

### STEP 9: Monitor CPU Usage

**Critical**: Verify no CPU overage charges.

**9.1 Check metrics dashboard**:
https://dash.cloudflare.com/be1ad24bfb43615483c3a472aa134892/workers/services/view/mypasswordchecker-api/production/metrics

**9.2 Watch for**:
- **CPU Time**: Should be 1-5ms per request (very low)
- **Request Count**: Track API usage
- **Error Rate**: Should be near 0%

**9.3 Expected monthly usage**:
- Requests: <10,000/month (unless API grows significantly)
- CPU Time: <50,000ms/month (well within 30M free limit)
- **Cost**: $0 overage (all within free tier)

**9.4 Set up alert** (optional):
In Cloudflare dashboard → Workers & Pages → mypasswordchecker-api → Settings → Alerts:
- Alert if CPU time > 10M ms/month (early warning)
- Alert if error rate > 5%

---

## 🚨 TROUBLESHOOTING

### Issue: "Database not found"
**Cause**: D1 database not created or ID incorrect in wrangler-api.toml
**Fix**:
1. Run `wrangler d1 list` to verify database exists
2. Check database_id in wrangler-api.toml matches
3. Redeploy: `wrangler deploy --config wrangler-api.toml`

### Issue: "KV namespace not found"
**Cause**: KV namespace ID incorrect in wrangler-api.toml
**Fix**:
1. Run `wrangler kv:namespace list` to get correct IDs
2. Update wrangler-api.toml with correct IDs
3. Redeploy

### Issue: "PayPal authentication failed"
**Cause**: PayPal secrets not set or incorrect
**Fix**:
1. Verify secrets: `wrangler secret list --config wrangler-api.toml`
2. Re-add if missing:
   ```bash
   wrangler secret put PAYPAL_CLIENT_ID --config wrangler-api.toml
   wrangler secret put PAYPAL_CLIENT_SECRET --config wrangler-api.toml
   ```
3. Redeploy

### Issue: "CORS error in browser"
**Cause**: CORS headers not working or frontend making cross-origin request
**Fix**: CORS is configured to allow all origins (`*`) in the worker. Check browser console for specific error.

### Issue: "501 Not Implemented" for PayPal endpoints
**Cause**: PayPal integration not implemented (still has TODO placeholders)
**Fix**: Implement the 3 PayPal functions in workers/mypasswordchecker-api.js (see Step 4)

### Issue: High CPU usage
**Cause**: Inefficient code or too many D1 queries
**Fix**:
1. Check KV caching is working (sessions should be cached)
2. Review worker code for optimization opportunities
3. Monitor with `wrangler tail mypasswordchecker-api`

---

## 📊 SUCCESS METRICS

After deployment, verify:

| Metric | Expected | How to Check |
|--------|----------|--------------|
| API endpoints respond | 200 OK | curl tests (Step 8) |
| D1 database writes | Success | `wrangler d1 execute ...` |
| KV cache working | Sessions cached | Check `/api/verify` response includes `"source":"cache"` |
| R2 audit logs | Files created | `wrangler r2 object list ...` |
| PayPal payments work | Premium activates | Test purchase on /premium.html |
| CPU usage | 1-5ms/request | Cloudflare dashboard |
| Error rate | <1% | Cloudflare dashboard |
| Monthly cost | $0 overage | Cloudflare billing (after 1 month) |

---

## 🎉 DEPLOYMENT COMPLETE CHECKLIST

Mark each as complete:

- [ ] D1 database created and schema loaded
- [ ] R2 bucket created
- [ ] 3 KV namespaces created
- [ ] wrangler-api.toml updated with all resource IDs
- [ ] PayPal secrets added
- [ ] PayPal integration implemented
- [ ] Local testing passed
- [ ] Deployed to production
- [ ] All 4 API endpoints tested successfully
- [ ] Premium payment tested end-to-end
- [ ] CPU usage verified (within limits)
- [ ] Audit logs confirmed in R2
- [ ] No errors in logs

**All checked?** → Phase 4 Complete! ✅

---

## 📞 NEXT STEPS

### Phase 5: Monitor and Optimize (Optional)
1. Monitor API usage for 1 week
2. Optimize any slow endpoints
3. Add additional features (Stripe integration, etc.)
4. Set up automated testing

### Additional Features to Consider
- Stripe payment integration (alternative to PayPal)
- API key generation for developers
- Usage analytics dashboard
- Subscription management UI
- Email notifications for payments

---

## 📁 FILES CREATED IN PHASE 4

| File | Purpose |
|------|---------|
| `workers/mypasswordchecker-api.js` | API worker code (skeleton with TODOs) |
| `wrangler-api.toml` | Worker configuration |
| `analysis/api-worker-analysis.md` | Complete analysis of requirements |
| `analysis/d1-database-status.md` | Resource verification guide |
| `deployment/api-deployment-guide.md` | This file |
| `deployment/api-deployment-checklist.csv` | Deployment checklist |
| `schema.sql` | Database schema (to be created in Step 5) |

---

## ⚠️ IMPORTANT REMINDERS

1. **Test in PayPal Sandbox first** before using production credentials
2. **Monitor CPU usage** after deployment - should be minimal
3. **Check audit logs** in R2 bucket regularly
4. **Don't commit secrets** to git - they're stored in Cloudflare
5. **Keep PayPal credentials secure** - never expose in code
6. **Database backups**: D1 doesn't have automatic backups - export data periodically
7. **Rate limiting**: Bot protection worker handles this, but monitor for abuse

---

**Questions?** Review:
- Analysis report: `/analysis/api-worker-analysis.md`
- Worker code: `/workers/mypasswordchecker-api.js` (has detailed comments)
- Configuration: `/wrangler-api.toml` (has extensive notes)

**Ready to deploy?** Follow the steps above in order. Good luck! 🚀

---

**End of Deployment Guide**
