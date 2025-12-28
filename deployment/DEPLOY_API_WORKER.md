# Deploy API Worker - Complete Dual Payment Processing

**File**: /Users/jack/Projects - Xcode/mypasswordchecker/deployment/DEPLOY_API_WORKER.md
**Action**: NEW FILE
**Dependencies**: Phase 3 completed (static site deployed)
**Date**: December 27, 2025

---

## 🎯 OVERVIEW

Deploy complete API worker with **dual payment processing**:
- **PayPal** for transactions ≤$5 (5% + $0.09 fee)
- **Stripe** for transactions >$5 (2.9% + $0.30 fee)
- **Smart routing** automatically selects best processor
- **Cost savings**: $228/year at 100 premium + 10 API subs/month

---

## ⚙️ PREREQUISITES

### 1. PayPal Setup (Required)

**Get PayPal Credentials:**
1. Go to https://developer.paypal.com/dashboard/
2. Login with your PayPal Business account
3. Navigate to "Apps & Credentials"
4. Select **"Live"** (NOT Sandbox - that's for testing only)
5. Create new app or select existing app
6. Copy **Client ID** (starts with `A...`)
7. Copy **Secret** (click "Show" to reveal)

**For Testing First (Recommended):**
- Select **"Sandbox"** instead of "Live"
- Get sandbox Client ID and Secret
- Change `PAYPAL_ENVIRONMENT = "sandbox"` in `wrangler-api.toml`
- Test thoroughly before switching to live credentials

### 2. Stripe Setup (Required)

**Get Stripe API Keys:**
1. Go to https://dashboard.stripe.com/
2. Login to your Stripe account
3. Navigate to "Developers" → "API keys"
4. Copy **Publishable key** (starts with `pk_live_...`)
5. Copy **Secret key** (starts with `sk_live_...` - click "Reveal" to see it)

**Setup Stripe Webhook:**
1. Navigate to "Developers" → "Webhooks"
2. Click "+ Add endpoint"
3. Endpoint URL: `https://mypasswordchecker.com/api/stripe/webhook`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click "Add endpoint"
6. Copy **Signing secret** (starts with `whsec_...`)

**For Testing (Recommended):**
- Use test mode keys (pk_test_..., sk_test_...)
- Create webhook with test endpoint
- Test thoroughly before using live credentials

### 3. Wrangler Authentication

**Verify you're logged in:**
```bash
wrangler whoami
```

**Should show**: Account ID `be1ad24bfb43615483c3a472aa134892` (SkyPathways)

**If not logged in:**
```bash
wrangler logout
wrangler login
# Select SkyPathways account when prompted
```

---

## 📋 DEPLOYMENT STEPS

### STEP 1: Create Cloudflare Resources

#### 1.1 Create D1 Database

```bash
cd "/Users/jack/Projects - Xcode/mypasswordchecker"
wrangler d1 create mypasswordchecker-db
```

**Expected output:**
```
✅ Successfully created DB 'mypasswordchecker-db'

[[d1_databases]]
binding = "DB"
database_name = "mypasswordchecker-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Action**: Copy the `database_id` - you'll need it in Step 2.

#### 1.2 Create R2 Bucket

```bash
wrangler r2 bucket create mypasswordchecker-audit-logs
```

**Expected output:**
```
✅ Created bucket 'mypasswordchecker-audit-logs'
```

#### 1.3 Create KV Namespaces (3 total)

```bash
# API Keys cache
wrangler kv:namespace create "MYPWDCKR_API_KEYS"
```
**Copy the `id` returned** (e.g., `abc123...`)

```bash
# Session cache
wrangler kv:namespace create "MYPWDCKR_SESSION_CACHE"
```
**Copy the `id` returned**

```bash
# Usage tracking cache
wrangler kv:namespace create "MYPWDCKR_USAGE_TRACKING"
```
**Copy the `id` returned**

**You should now have 4 IDs**:
- D1 database ID
- KV API_KEYS ID
- KV SESSION_CACHE ID
- KV USAGE_TRACKING ID

---

### STEP 2: Update wrangler-api.toml

Open `/Users/jack/Projects - Xcode/mypasswordchecker/wrangler-api.toml`

**Replace these PLACEHOLDERs:**

#### Line 21: D1 Database ID
```toml
database_id = "YOUR_D1_DATABASE_ID_HERE"
```
Paste the database ID from Step 1.1

#### Line 31: KV API_KEYS ID
```toml
id = "YOUR_API_KEYS_KV_ID_HERE"
```
Paste the first KV namespace ID

#### Line 35: KV SESSION_CACHE ID
```toml
id = "YOUR_SESSION_CACHE_KV_ID_HERE"
```
Paste the second KV namespace ID

#### Line 39: KV USAGE_TRACKING ID
```toml
id = "YOUR_USAGE_TRACKING_KV_ID_HERE"
```
Paste the third KV namespace ID

#### Line 61: Stripe Publishable Key
```toml
STRIPE_PUBLISHABLE_KEY = "pk_live_XXXXXXXXXXXXXXX"
```
Paste your Stripe publishable key (from Prerequisites Step 2)

#### Line 62: Stripe Webhook Secret
```toml
STRIPE_WEBHOOK_SECRET = "whsec_XXXXXXXXXXXXXXX"
```
Paste your Stripe webhook signing secret (from Prerequisites Step 2)

**Verify**: No `PLACEHOLDER` values remain in the file.

---

### STEP 3: Load Database Schema

```bash
wrangler d1 execute mypasswordchecker-db --file=schema.sql
```

**Expected output:**
```
🌀 Executing on mypasswordchecker-db:
✅ Executed query successfully!
```

**Verify tables were created:**
```bash
wrangler d1 execute mypasswordchecker-db \
  --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

**Expected output:**
```
api_keys
payment_transactions
sessions
usage_tracking
```

---

### STEP 4: Add Payment Processor Secrets

#### 4.1 Add PayPal Secrets

```bash
wrangler secret put PAYPAL_CLIENT_ID --config wrangler-api.toml
```
**Prompt**: Paste your PayPal Client ID, press Enter

```bash
wrangler secret put PAYPAL_CLIENT_SECRET --config wrangler-api.toml
```
**Prompt**: Paste your PayPal Secret, press Enter

#### 4.2 Add Stripe Secret

```bash
wrangler secret put STRIPE_SECRET_KEY --config wrangler-api.toml
```
**Prompt**: Paste your Stripe Secret Key (sk_live_...), press Enter

#### 4.3 Verify Secrets

```bash
wrangler secret list --config wrangler-api.toml
```

**Expected output:**
```
PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET
STRIPE_SECRET_KEY
```

---

### STEP 5: Deploy to Production

```bash
wrangler deploy --config wrangler-api.toml
```

**Expected output:**
```
✨ Built successfully!
✨ Uploading...
✨ Published mypasswordchecker-api
  https://mypasswordchecker.com/api/*

✨ Deployment complete!
```

**Verify deployment:**
```bash
wrangler deployments list --name mypasswordchecker-api
```

Should show latest deployment with status "Success"

---

### STEP 6: Test API Endpoints

#### 6.1 Test Health Check

```bash
curl https://mypasswordchecker.com/api/verify-session
```

**Expected**: 400 error (missing session_id) - correct behavior, API is working!

#### 6.2 Test Smart Payment Routing ($1 → PayPal)

```bash
curl -X POST https://mypasswordchecker.com/api/create-payment \
  -H "Content-Type: application/json" \
  -d '{"amount":"1.00","description":"Premium Access Test"}'
```

**Expected response:**
```json
{
  "processor": "paypal",
  "order_id": "...",
  "amount": "1.00",
  "fee": "0.14",
  "approval_url": "https://www.paypal.com/..."
}
```

**Verify**: Processor is `"paypal"` (because $1.00 ≤ $5.00 threshold)

#### 6.3 Test Smart Payment Routing ($20 → Stripe)

```bash
curl -X POST https://mypasswordchecker.com/api/create-payment \
  -H "Content-Type: application/json" \
  -d '{"amount":"20.00","description":"API Subscription Test"}'
```

**Expected response:**
```json
{
  "processor": "stripe",
  "client_secret": "pi_..._secret_...",
  "payment_intent_id": "pi_...",
  "amount": "20.00",
  "fee": "0.88",
  "publishable_key": "pk_live_..."
}
```

**Verify**: Processor is `"stripe"` (because $20.00 > $5.00 threshold)

#### 6.4 Test Usage Tracking

```bash
curl -X POST https://mypasswordchecker.com/api/track-usage \
  -H "Content-Type: application/json" \
  -d '{"feature":"test","session_id":"test123"}'
```

**Expected**: `{"success": true, "tracked": true}`

**Verify in database:**
```bash
wrangler d1 execute mypasswordchecker-db \
  --command="SELECT * FROM usage_tracking ORDER BY timestamp DESC LIMIT 5;"
```

Should show your test tracking record.

---

### STEP 7: End-to-End Payment Testing

#### 7.1 Test PayPal Payment Flow

**IMPORTANT**: Use PayPal Sandbox for testing first!

1. Create payment (should use PayPal):
```bash
curl -X POST https://mypasswordchecker.com/api/create-payment \
  -H "Content-Type: application/json" \
  -d '{"amount":"1.00","description":"Premium 24h Access"}'
```

2. Copy the `approval_url` from response
3. Open URL in browser
4. Login with PayPal Sandbox test account
5. Complete payment
6. Note the `order_id` from URL after redirect

7. Verify payment:
```bash
curl -X POST https://mypasswordchecker.com/api/paypal/verify-payment \
  -H "Content-Type: application/json" \
  -d '{"order_id":"ORDER_ID_FROM_STEP_6"}'
```

8. Should receive:
```json
{
  "success": true,
  "session_id": "sess_...",
  "expires_at": 1735401234567,
  "features": ["phonetic", "quantum", "breach"],
  "hours_remaining": 24
}
```

9. Verify session:
```bash
curl "https://mypasswordchecker.com/api/verify-session?session_id=sess_..."
```

Should return `"valid": true`

#### 7.2 Test Stripe Payment Flow

**For Stripe, use Stripe Dashboard test mode or actual payment:**

1. Integration test from your frontend using Stripe Elements
2. Webhook will automatically create session/API key
3. Check logs: `wrangler tail mypasswordchecker-api`

---

### STEP 8: Monitor CPU Usage

**Critical**: Verify API worker isn't causing CPU overages

**Dashboard URL**:
https://dash.cloudflare.com/be1ad24bfb43615483c3a472aa134892/workers/services/view/mypasswordchecker-api/production/metrics

**Check after 24 hours:**
- **CPU Time**: Should be 2-5ms per request
- **Request Count**: Track API usage
- **Error Rate**: Should be <1%

**Expected monthly totals:**
- Requests: <20,000/month
- CPU Time: <100,000ms/month
- **Well within 30M ms free tier** ✅

**Set up alert:**
1. Click "Alerts" in dashboard
2. Create alert: CPU time > 10M ms/month (early warning)
3. Email notification to your address

---

## ✅ SUCCESS CRITERIA

After deployment, verify all of these:

### Immediate (Within 1 hour)
- ✅ All API endpoints return valid responses (not 500 errors)
- ✅ $1 payment routes to PayPal (`processor: "paypal"`)
- ✅ $20 payment routes to Stripe (`processor: "stripe"`)
- ✅ Database writes successful (check D1)
- ✅ Audit logs created in R2 bucket
- ✅ No errors in worker logs

### After Testing (24 hours)
- ✅ Premium activation works (PayPal payment → session created)
- ✅ Session verification works
- ✅ Usage tracking records in database
- ✅ CPU usage 2-5ms per request
- ✅ No 500 errors in production

### Long-term (1 month)
- ✅ **No CPU overage charges** ($5/month base fee only)
- ✅ Smart routing saving $0.19 per $1 transaction
- ✅ All payments processing successfully
- ✅ Audit logs accumulating correctly

---

## 🔧 TROUBLESHOOTING

### Issue: "Database not found" error

**Cause**: D1 database ID not updated in wrangler-api.toml

**Fix**:
1. Check database exists: `wrangler d1 list`
2. Copy correct database_id
3. Update line 21 in wrangler-api.toml
4. Redeploy: `wrangler deploy --config wrangler-api.toml`

---

### Issue: "KV namespace not found" error

**Cause**: KV namespace IDs incorrect in wrangler-api.toml

**Fix**:
1. List namespaces: `wrangler kv:namespace list`
2. Verify IDs match lines 31, 35, 39 in wrangler-api.toml
3. Update if different
4. Redeploy

---

### Issue: "PayPal auth failed" error

**Cause**: PayPal secrets not set or incorrect

**Fix**:
1. Verify secrets: `wrangler secret list --config wrangler-api.toml`
2. If missing, add: `wrangler secret put PAYPAL_CLIENT_ID --config wrangler-api.toml`
3. Double-check credentials from PayPal Dashboard
4. Redeploy if secrets were updated

---

### Issue: Stripe webhooks not working

**Cause**: Webhook secret incorrect or webhook not configured

**Fix**:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Verify endpoint: `https://mypasswordchecker.com/api/stripe/webhook`
3. Verify events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy signing secret (whsec_...)
5. Update line 62 in wrangler-api.toml
6. Redeploy

---

### Issue: All payments using Stripe (not PayPal)

**Cause**: Payment threshold config issue

**Fix**:
1. Check line 67 in wrangler-api.toml: `PAYMENT_THRESHOLD = "5.00"`
2. Verify test amount: $1.00 should use PayPal, $20.00 should use Stripe
3. Check worker logs: `wrangler tail mypasswordchecker-api`
4. Look for "Using PayPal" or "Using Stripe" logs

---

### Issue: High CPU usage

**Cause**: Too many requests or inefficient code

**Fix**:
1. Check request volume in dashboard
2. Review KV caching (sessions should cache)
3. Monitor with: `wrangler tail mypasswordchecker-api`
4. If legitimate traffic, increase is expected

---

## 💰 COST BREAKDOWN

### Monthly Costs

**Cloudflare Workers:**
- Base fee: $5.00/month (includes 30M CPU ms, 10M requests)
- Expected CPU: <100,000ms/month
- Expected requests: <20,000/month
- **Overage charges**: $0.00 (well within limits)

**Payment Processing Fees:**

*Scenario: 100 premium ($1) + 10 API subs ($20) per month*

**With Smart Routing (Current):**
- PayPal (100 × $1.00): 100 × $0.14 = **$14.00**
- Stripe (10 × $20.00): 10 × $0.88 = **$8.80**
- **Total fees**: $22.80/month

**Without Smart Routing (Stripe Only):**
- Stripe (100 × $1.00): 100 × $0.33 = **$33.00**
- Stripe (10 × $20.00): 10 × $0.88 = **$8.80**
- **Total fees**: $41.80/month

**Monthly Savings**: $41.80 - $22.80 = **$19.00/month**
**Annual Savings**: $19.00 × 12 = **$228.00/year**

### Total Monthly Cost
- Cloudflare: $5.00
- Payment processing: $22.80
- **Total**: $27.80/month (vs $46.80 without smart routing)

---

## 📊 MONITORING & MAINTENANCE

### Daily Checks (First Week)

1. **Check worker logs:**
```bash
wrangler tail mypasswordchecker-api
```

2. **Check error rate in dashboard**

3. **Verify payments processing:**
```bash
wrangler d1 execute mypasswordchecker-db \
  --command="SELECT COUNT(*) FROM sessions WHERE created_at > strftime('%s','now','-1 day') * 1000;"
```

### Weekly Checks

1. **CPU usage trending**
2. **Payment success rate**
3. **R2 audit log size** (should be minimal)

### Monthly Checks

1. **Verify Cloudflare bill = $5.00 (no overages)**
2. **Review payment processing fees**
3. **Clean up expired sessions:**
```bash
wrangler d1 execute mypasswordchecker-db \
  --command="UPDATE sessions SET status = 'expired' WHERE expires_at < strftime('%s','now') * 1000 AND status = 'active';"
```

---

## 🎉 DEPLOYMENT COMPLETE CHECKLIST

Mark each as complete:

- [ ] D1 database created and schema loaded
- [ ] R2 bucket created
- [ ] 3 KV namespaces created
- [ ] wrangler-api.toml updated with all IDs
- [ ] PayPal secrets added (Client ID + Secret)
- [ ] Stripe secrets added (Secret Key)
- [ ] Stripe webhook configured
- [ ] API worker deployed successfully
- [ ] Smart routing tested ($1 → PayPal, $20 → Stripe)
- [ ] End-to-end payment flow tested
- [ ] CPU usage verified (<5ms per request)
- [ ] No errors in worker logs
- [ ] Audit logs confirmed in R2

**All checked?** → API Worker Deployment Complete! ✅

---

## 📁 FILES CREATED

| File | Purpose |
|------|---------|
| `wrangler-api.toml` | Worker configuration |
| `schema.sql` | Database schema (4 tables) |
| `workers/mypasswordchecker-api.js` | Complete API worker (1,137 lines) |
| `deployment/DEPLOY_API_WORKER.md` | This deployment guide |

---

## 🚀 NEXT STEPS

1. **Monitor for 24 hours** to verify stability
2. **Switch PayPal to live mode** (if currently using sandbox)
3. **Switch Stripe to live mode** (if currently using test keys)
4. **Integrate with frontend** (update premium.html to use new endpoints)
5. **Set up monitoring alerts** in Cloudflare dashboard

---

## 📞 SUPPORT

**Worker Logs (Real-time)**:
```bash
wrangler tail mypasswordchecker-api
```

**Database Queries**:
```bash
wrangler d1 execute mypasswordchecker-db --command="YOUR_SQL_HERE"
```

**R2 Audit Logs**:
```bash
wrangler r2 object list mypasswordchecker-audit-logs
```

**Cloudflare Dashboard**:
https://dash.cloudflare.com/be1ad24bfb43615483c3a472aa134892/workers/services/view/mypasswordchecker-api

---

**Deployment Guide Complete** ✅
**Ready to accept payments with dual processors!** 💳

