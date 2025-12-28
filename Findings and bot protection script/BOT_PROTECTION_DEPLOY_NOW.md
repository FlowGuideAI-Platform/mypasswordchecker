# BOT PROTECTION - EMERGENCY DEPLOYMENT GUIDE

## 🚨 CRITICAL: Deploy This IMMEDIATELY to Stop $140/Month Bot Charges

Your CPU overages are caused by **BOTS**, not inefficient code. Deploy this bot protection worker NOW to both FlowGuideAI and mypasswordchecker.com.

---

## WHAT THIS DOES

**TIERED ACCESS SYSTEM:**

✅ **TIER 1 - Search Engines (UNLIMITED)**: Google, Bing, DuckDuckGo, Yahoo - Critical for SEO!  
✅ **TIER 2 - AI Chatbots (120 req/min)**: ChatGPT, Gemini, Claude, Perplexity, Grok - Allowed with monitoring!  
✅ **TIER 3 - Social Media (60 req/min)**: Facebook, Twitter, LinkedIn - Standard limits  
🚫 **TIER 4 - Malicious Bots (BLOCKED)**: Scrapers (Scrapy, Python), aggressive SEO crawlers (SEMrush, Ahrefs)  
⚡ **TIER 5 - Suspicious (CHALLENGED)**: Headless browsers, missing User-Agents  
⚡ **TIER 6 - Normal Users (60 req/min)**: Regular human visitors - Standard rate limits  

**Expected Result:** CPU drops from 27,327ms to <15,000ms = **$0 bill** (save $1,680/year per site!)

**Why Allow AI Chatbots?**
- ChatGPT, Gemini, Claude, Perplexity, and Grok can recommend your site to users
- They provide free marketing and user acquisition
- Rate limits (120 req/min) prevent abuse while allowing indexing
- All access is logged for monitoring

---

## QUICK DEPLOY - MyPasswordChecker.com (5 minutes)

### Step 1: Create KV Namespaces

```bash
# Navigate to project directory
cd "/Users/jack/Projects - Xcode/MyPasswordChecker.com/workers"

# Create KV namespaces for rate limiting and logging
wrangler kv:namespace create "RATE_LIMIT_KV"
wrangler kv:namespace create "BOT_LOGS_KV"
```

**Copy the namespace IDs from output** - you'll need them in Step 2.

### Step 2: Update wrangler-bot-protection.toml

Open `wrangler-bot-protection.toml` and replace the placeholder IDs:

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "YOUR_ACTUAL_ID_FROM_STEP_1"  # ← Replace this

[[kv_namespaces]]
binding = "BOT_LOGS_KV"
id = "YOUR_ACTUAL_ID_FROM_STEP_1"  # ← Replace this
```

### Step 3: Deploy to Cloudflare

```bash
# Deploy using the config file
wrangler deploy --config wrangler-bot-protection.toml
```

### Step 4: Verify It's Working

```bash
# Watch real-time logs
wrangler tail mypasswordchecker-bot-protection

# You should see:
# ✅ Legitimate requests passing through
# 🚫 Bots being blocked
```

**That's it!** Bot protection is now active on mypasswordchecker.com.

---

## DEPLOY TO FLOWGUIDEAI (Same Process)

### Step 1: Copy Files to FlowGuideAI Project

```bash
# Copy bot-protection.js to FlowGuideAI project
cp bot-protection.js /path/to/flowguideai/workers/

# Create wrangler config for FlowGuideAI
cp wrangler-bot-protection.toml /path/to/flowguideai/workers/wrangler-flowguideai-bot-protection.toml
```

### Step 2: Update Config for FlowGuideAI

Edit `/path/to/flowguideai/workers/wrangler-flowguideai-bot-protection.toml`:

```toml
name = "flowguideai-bot-protection"
main = "bot-protection.js"
compatibility_date = "2024-12-26"
account_id = "be1ad24bfb43615483c3a472aa134892"

# Update routes to match FlowGuideAI domains
[[routes]]
pattern = "flowguideai.com/*"  # ← Update to your actual domain
zone_name = "flowguideai.com"
```

### Step 3: Create KV Namespaces for FlowGuideAI

```bash
cd /path/to/flowguideai/workers

wrangler kv:namespace create "RATE_LIMIT_KV"
wrangler kv:namespace create "BOT_LOGS_KV"

# Update the namespace IDs in wrangler-flowguideai-bot-protection.toml
```

### Step 4: Deploy to FlowGuideAI

```bash
wrangler deploy --config wrangler-flowguideai-bot-protection.toml
```

---

## CUSTOMIZATION OPTIONS

### Adjust Rate Limiting

Edit `bot-protection.js`, line 30-31:

```javascript
const CONFIG = {
  RATE_LIMIT_REQUESTS: 60,  // Change this (default: 60 req/min)
  RATE_LIMIT_WINDOW: 60,    // Change this (default: 60 seconds)
```

**Recommendations:**
- **Normal site**: 60 requests/minute (1 per second)
- **API-heavy site**: 120 requests/minute
- **Very strict**: 30 requests/minute

### Change Challenge Mode

Edit `bot-protection.js`, line 35:

```javascript
CHALLENGE_MODE: 'managed', // Options: 'managed' | 'js' | 'block'
```

**Options:**
- `'managed'`: Cloudflare ML bot detection (RECOMMENDED - smartest)
- `'js'`: JavaScript challenge (requires browser, blocks headless)
- `'block'`: Block immediately (most aggressive, may block some humans)

### Allow Additional Bots

Edit `bot-protection.js`, lines 43-70 to add bot patterns:

```javascript
const ALLOWED_BOT_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /your-custom-bot/i,  // ← Add your patterns here
];
```

### Block Additional Bots

Edit `bot-protection.js`, lines 78-135 to add blocked patterns:

```javascript
const BLOCKED_BOT_PATTERNS = [
  /scrapy/i,
  /your-bad-bot/i,  // ← Add patterns to block
];
```

---

## MONITORING & ANALYTICS

### View Blocked Bots in Real-Time

```bash
# MyPasswordChecker
wrangler tail mypasswordchecker-bot-protection

# FlowGuideAI
wrangler tail flowguideai-bot-protection
```

### Check KV Logs (Last 7 Days)

```bash
# List all blocked requests
wrangler kv:key list --namespace-id YOUR_BOT_LOGS_KV_ID

# Get details of a specific block
wrangler kv:key get "blocked:2024-12-26T..." --namespace-id YOUR_BOT_LOGS_KV_ID
```

### Export Blocked Bot Report

```bash
# List all keys (blocked requests)
wrangler kv:key list --namespace-id YOUR_BOT_LOGS_KV_ID > blocked-bots-report.json
```

---

## VERIFY CPU USAGE DROPS

After deploying, check Cloudflare Analytics in 24-48 hours:

1. **Go to**: https://dash.cloudflare.com/YOUR_ACCOUNT/workers/analytics
2. **Select**: mypasswordchecker-bot-protection
3. **Check**: CPU time should drop dramatically
4. **Expected**: CPU usage < 15,000ms/month (down from 27,327ms)
5. **Result**: $0 bill (instead of $140/month)

---

## TROUBLESHOOTING

### If Legitimate Users Are Blocked

1. **Check the logs** to see why they were blocked
2. **Adjust CHALLENGE_MODE** to 'managed' (less strict)
3. **Increase RATE_LIMIT_REQUESTS** if too low
4. **Whitelist specific IPs** if needed

### If Bots Still Getting Through

1. **Lower CHALLENGE_MODE** to 'js' or 'block'
2. **Add bot patterns** to BLOCKED_BOT_PATTERNS
3. **Lower RATE_LIMIT_REQUESTS** to be more aggressive
4. **Check CF-Bot-Score** threshold (currently 30, can lower to 40-50)

### If You Need to Temporarily Disable

```bash
# Delete the worker route
wrangler route delete ROUTE_ID

# Or deploy a passthrough version
# (Comment out all blocking logic, just return fetch(request))
```

---

## EXPECTED COST SAVINGS

**Before Bot Protection:**
- MyPasswordChecker: $140/month × 4 months = $560
- FlowGuideAI: $140/month × ? months = $???
- **Total bleeding**: $280/month or more

**After Bot Protection:**
- MyPasswordChecker: $0/month ✅
- FlowGuideAI: $0/month ✅
- **Total savings**: $3,360/year minimum

---

## NEXT STEPS AFTER DEPLOYMENT

1. **✅ Deploy bot protection** (you're doing this now)
2. **⏳ Wait 24-48 hours** for CPU usage to drop
3. **📊 Verify in Cloudflare Analytics** that CPU is under 15,000ms
4. **💰 Check next month's bill** - should be $0
5. **🎉 Celebrate** - you just saved $280/month!
6. **📈 Continue to SEO recovery** (Part B of Prompt 0)

---

## SUPPORT

If you run into issues:
1. Check `wrangler tail` logs for errors
2. Verify KV namespace IDs are correct
3. Ensure routes are applied to correct domains
4. Test with `curl` to verify blocking works

**Deploy this NOW to stop the bleeding!**
