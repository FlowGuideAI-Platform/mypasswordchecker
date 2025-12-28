# D1 Database and Cloudflare Resources Status

**File**: /Users/jack/Projects - Xcode/mypasswordchecker/analysis/d1-database-status.md
**Action**: NEW FILE
**Dependencies**: Cloudflare account access (SkyPathways - be1ad24bfb43615483c3a472aa134892)
**Date**: December 27, 2025

---

## 🎯 PURPOSE

Verify which Cloudflare resources exist in the SkyPathways account and determine what needs to be created or migrated for the API worker.

---

## ⚠️ MANUAL STEPS REQUIRED (Jack)

Claude Code cannot run wrangler commands in this environment. Jack needs to run these commands manually.

### Prerequisites
1. Ensure you're logged into wrangler with SkyPathways account:
   ```bash
   wrangler whoami
   ```
   Should show account: `be1ad24bfb43615483c3a472aa134892` (SkyPathways)

2. Navigate to project directory:
   ```bash
   cd "/Users/jack/Projects - Xcode/mypasswordchecker"
   ```

---

## 📋 TASK 1: CHECK D1 DATABASES

### Command to Run
```bash
wrangler d1 list
```

### Expected Output
List of D1 databases in SkyPathways account.

### What to Look For
- **Database Name**: `mypasswordchecker-db`
- **Database ID**: `b85d3188-2c9b-4fa8-89b6-81d3a1861f97` (from wrangler.toml)

### Results (Fill in manually):
```
[JACK: Paste output of `wrangler d1 list` here]

Database found? [ ] YES  [ ] NO

If YES:
  - Database Name: _______________________
  - Database ID: _______________________

If NO:
  - Need to create database (see ACTIONS REQUIRED section)
```

---

## 📋 TASK 2: CHECK R2 BUCKETS

### Command to Run
```bash
wrangler r2 bucket list
```

### Expected Output
List of R2 buckets in SkyPathways account.

### What to Look For
- **Bucket Name**: `mypasswordchecker-audit-logs` (from wrangler.toml)

### Results (Fill in manually):
```
[JACK: Paste output of `wrangler r2 bucket list` here]

Bucket found? [ ] YES  [ ] NO

If YES:
  - Bucket Name: _______________________

If NO:
  - Need to create bucket (see ACTIONS REQUIRED section)
```

---

## 📋 TASK 3: CHECK KV NAMESPACES

### Command to Run
```bash
wrangler kv:namespace list
```

### Expected Output
List of KV namespaces in SkyPathways account.

### What to Look For (from wrangler.toml):
1. **API_KEYS** - ID: `abc93d05a370492aabbee14b2d58f26f`
2. **USAGE_TRACKING** - ID: `be5ec99ec61e45c6b2d48cf18c77889e`
3. **SESSION_CACHE** - ID: `acee2dfd237545babb617439e6a86db6`

### Results (Fill in manually):
```
[JACK: Paste output of `wrangler kv:namespace list` here]

API_KEYS found? [ ] YES  [ ] NO
  - If YES, ID: _______________________

USAGE_TRACKING found? [ ] YES  [ ] NO
  - If YES, ID: _______________________

SESSION_CACHE found? [ ] YES  [ ] NO
  - If YES, ID: _______________________

If NO for any:
  - Need to create KV namespaces (see ACTIONS REQUIRED section)
```

---

## 📋 TASK 4: CHECK EXISTING D1 DATABASE SCHEMA (if database exists)

### Command to Run
```bash
wrangler d1 execute mypasswordchecker-db --command="SELECT name FROM sqlite_master WHERE type='table';"
```

### Expected Tables (assumed):
- `sessions`
- `api_keys`
- `usage_tracking`

### Results (Fill in manually):
```
[JACK: Paste output here]

Tables found: _______________________
Schema matches expected? [ ] YES  [ ] NO  [ ] N/A (database doesn't exist)
```

---

## 🔧 ACTIONS REQUIRED (Based on Results)

### SCENARIO A: All Resources Exist in SkyPathways
✅ No action needed - proceed to API worker creation

**Checklist**:
- [x] D1 database `mypasswordchecker-db` exists
- [x] R2 bucket `mypasswordchecker-audit-logs` exists
- [x] KV namespace `API_KEYS` exists
- [x] KV namespace `USAGE_TRACKING` exists
- [x] KV namespace `SESSION_CACHE` exists
- [x] Database schema verified

**Next Step**: Update `wrangler-api.toml` with confirmed resource IDs → Create API worker

---

### SCENARIO B: Resources Don't Exist - Create New

#### Create D1 Database
```bash
wrangler d1 create mypasswordchecker-db
```
**Output**: Note the database ID and update `wrangler-api.toml`

#### Create Database Schema
```bash
# Save this schema to schema.sql first (see DATABASE SCHEMA section below)
wrangler d1 execute mypasswordchecker-db --file=schema.sql
```

#### Create R2 Bucket
```bash
wrangler r2 bucket create mypasswordchecker-audit-logs
```

#### Create KV Namespaces
```bash
# Create API_KEYS namespace
wrangler kv:namespace create "MYPWDCKR_API_KEYS"

# Create USAGE_TRACKING namespace
wrangler kv:namespace create "MYPWDCKR_USAGE_TRACKING"

# Create SESSION_CACHE namespace
wrangler kv:namespace create "MYPWDCKR_SESSION_CACHE"
```

**Important**: After each KV namespace creation, note the ID returned and update `wrangler-api.toml`.

---

### SCENARIO C: Resources Exist in OLD Account - Migration Needed

⚠️ **Complex**: Requires data migration from OLD account to SkyPathways.

#### Option 1: Fresh Start (Recommended if no critical data)
- Create new resources in SkyPathways (see SCENARIO B)
- Old data abandoned
- Faster, simpler

#### Option 2: Data Migration (If existing data critical)
- Export data from OLD account D1 database
- Create new resources in SkyPathways
- Import data into new database
- More complex, time-consuming

**Decision Required**: Does old API data need to be preserved?
- [ ] YES - proceed with migration
- [ ] NO - create fresh resources

---

## 🗄️ DATABASE SCHEMA (if creating new database)

### schema.sql

```sql
-- Sessions table (premium 24-hour access)
CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    user_ip TEXT,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    payment_type TEXT NOT NULL,  -- 'paypal' or 'stripe'
    payment_id TEXT NOT NULL,    -- PayPal order ID or Stripe charge ID
    amount REAL NOT NULL,
    features TEXT,               -- JSON array: ["quantum", "phonetic", "breach"]
    UNIQUE(payment_id)
);

-- Index for session expiration cleanup
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- API keys table (developer API subscriptions)
CREATE TABLE IF NOT EXISTS api_keys (
    api_key TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    tier INTEGER NOT NULL,           -- 1 or 2
    created_at INTEGER NOT NULL,
    quota_limit INTEGER NOT NULL,
    quota_used INTEGER DEFAULT 0,
    billing_cycle_start INTEGER NOT NULL,
    stripe_subscription_id TEXT,
    status TEXT DEFAULT 'active',    -- 'active', 'suspended', 'cancelled'
    UNIQUE(user_email, tier)
);

-- Index for quota lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_email ON api_keys(user_email);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);

-- Usage tracking table (analytics)
CREATE TABLE IF NOT EXISTS usage_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    session_id TEXT,
    api_key TEXT,
    feature TEXT NOT NULL,      -- 'premium-access', 'quantum-check', 'api-call', etc.
    endpoint TEXT,
    user_ip TEXT,
    user_agent TEXT,
    request_duration_ms INTEGER,
    success INTEGER DEFAULT 1   -- 1 = success, 0 = error
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_tracking(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_feature ON usage_tracking(feature);
CREATE INDEX IF NOT EXISTS idx_usage_api_key ON usage_tracking(api_key);
```

**To create this schema**:
1. Save above SQL to `schema.sql` in project root
2. Run: `wrangler d1 execute mypasswordchecker-db --file=schema.sql`

---

## 📊 VERIFICATION CHECKLIST

After running all commands, fill this out:

| Resource | Exists? | ID/Name | Notes |
|----------|---------|---------|-------|
| D1 Database | [ ] | ________________ | Database ID |
| R2 Bucket | [ ] | ________________ | Bucket name |
| KV: API_KEYS | [ ] | ________________ | Namespace ID |
| KV: USAGE_TRACKING | [ ] | ________________ | Namespace ID |
| KV: SESSION_CACHE | [ ] | ________________ | Namespace ID |
| Database Schema | [ ] | ________________ | Tables created? |

**All checked?** → Ready to update `wrangler-api.toml` with correct IDs

---

## 🚨 IMPORTANT NOTES

### Account Verification
Before creating any resources, verify you're in the correct account:
```bash
wrangler whoami
```
**Must show**: Account ID `be1ad24bfb43615483c3a472aa134892` (SkyPathways)

**If showing OLD account** (`ee34e44964865d1bccb86107d578c55a`):
```bash
wrangler logout
wrangler login
# Select SkyPathways account during login
```

### Cost Implications
- **D1 Database**: Free tier 5GB storage, 25M queries/month (plenty for API usage)
- **R2 Bucket**: Free tier 10GB storage, 1M Class A ops/month (audit logs are minimal)
- **KV Namespaces**: Free tier 1GB storage, 10M reads/month (sufficient for sessions/API keys)

**Expected cost**: $0/month within free tiers for typical API usage

### Resource Naming
All resources use `mypasswordchecker-` prefix for easy identification:
- `mypasswordchecker-db` (D1)
- `mypasswordchecker-audit-logs` (R2)
- `MYPWDCKR_API_KEYS` (KV)
- `MYPWDCKR_USAGE_TRACKING` (KV)
- `MYPWDCKR_SESSION_CACHE` (KV)

---

## 📞 NEXT STEPS AFTER COMPLETION

1. **Update** `wrangler-api.toml` with all confirmed resource IDs
2. **Create** API worker (`workers/mypasswordchecker-api.js`)
3. **Add** PayPal secrets via `wrangler secret put`
4. **Test** locally with `wrangler dev`
5. **Deploy** API worker

---

**Status**: ⏳ PENDING JACK'S MANUAL VERIFICATION

Please run the commands in TASK 1-4 and fill in the results sections above.

---

**End of Document**
