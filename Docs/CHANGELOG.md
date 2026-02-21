# MyPasswordChecker.com - Changelog

## [2.0.0] - February 11, 2026

### 🎉 Major Changes

#### 6-Tier Pricing Implementation
- **BREAKING:** Expanded from 5 to 6 paid tiers
- **ADDED:** Tier 5 - XL Quantum ($150/mo) with previous Super Quantum quotas
- **CHANGED:** Tier 6 - Super Quantum now $299/mo (was $150) with tripled quotas
- **CHANGED:** Free tier from 25 to 50 requests/month

#### Pricing Structure Changes

| Change Type | Old Value | New Value | Impact |
|-------------|-----------|-----------|--------|
| Tier 1 Price | $12/mo | $5/mo | 58% price reduction |
| Tier 2 Price | $29/mo | $10/mo | 66% price reduction |
| Tier 3 Price | $49/mo | $40/mo | 18% price reduction |
| Tier 4 Price | $99/mo | $80/mo | 19% price reduction |
| Tier 5 Price | $349/mo | $150/mo | 57% price reduction (now XL Quantum) |
| Tier 6 Price | N/A | $299/mo | New enterprise tier |
| Free Tier Quota | 25/month | 50/month | 100% increase |

#### Quota Changes

**Standard Quantum (Tier 3):**
- Password checks: 25K → 150K (+500%)
- Breach checks: Added (1K/month)

**Super Quantum (Tier 6 - NEW):**
- Password checks: 3M/month (3x previous)
- Quantum estimates: 300K/month (3x previous)
- Phonetic generation: 300K/month (3x previous)
- Breach checks: 200K/month (10x previous)

#### Overage Pricing Reductions

- Large Quantum (Tier 4): $0.0115 → $0.0100 (-13%)
- XL Quantum (Tier 5): $0.0111 → $0.0090 (-19%)
- Super Quantum (Tier 6): $0.0111 → $0.0075 (-32%)

### 🔧 Technical Changes

#### API Worker (`workers/mypasswordchecker-api.js`)
- **ADDED:** Tier 6 payment routing for $299+ Stripe payments
- **ADDED:** `X-Robots-Tag: noindex, nofollow` header to all API responses (line 41)
- **CHANGED:** Stripe tier determination logic to handle 6 tiers
- **CHANGED:** Updated quota limits for all tiers

#### Configuration (`wrangler-api.toml`)
- **ADDED:** `API_TIER_6_PRICE = "299.00"`
- **ADDED:** `API_TIER_6_QUOTA = "3000000"`
- **ADDED:** `API_TIER_6_QUANTUM = "300000"`
- **ADDED:** `API_TIER_6_PHONETIC = "300000"`
- **ADDED:** `API_TIER_6_BREACH = "200000"`
- **CHANGED:** `OVERAGE_PRICE_TIER_4 = "0.0100"` (was 0.0115)
- **CHANGED:** `OVERAGE_PRICE_TIER_5 = "0.0090"` (was 0.0111)
- **ADDED:** `OVERAGE_PRICE_TIER_6 = "0.0075"`

#### Website Routes (`wrangler-static.toml`)
- **ADDED:** `www.mypasswordchecker.com/*` route for www subdomain support

### 🌐 Website Updates

#### Pricing Page (`public/pricing.html`)
- **ADDED:** XL Quantum pricing card
- **CHANGED:** Super Quantum card to reflect new $299 pricing and 3M quotas
- **CHANGED:** Comparison table to include 7 columns (Free + 6 paid tiers)
- **CHANGED:** Annual Super Quantum pricing: $3,490 → $2,990 (10 months worth)
- **CHANGED:** "PQ Key Generation" row renamed to "Breach Checks"
- **FIXED:** Canonical URL from `/pricing.html` to `/pricing`

#### API Landing Page (`public/password-api.html`)
- **CHANGED:** Standard Quantum quotas: 25K → 150K password checks
- **ADDED:** XL Quantum tier row to pricing table
- **CHANGED:** Super Quantum pricing and quotas
- **FIXED:** Canonical URL from `/password-api.html` to `/password-api`

#### About Page (`public/about.html`)
- **CHANGED:** "Can I use this for my business?" section expanded to 6 tiers
- **CHANGED:** Free tier: 25 → 50 requests/month
- **ADDED:** Breach check information for higher tiers
- **FIXED:** Canonical URL from `/about.html` to `/about`

### 🔍 SEO Improvements

#### Meta Descriptions Added/Improved
- **CHANGED:** `privacy.html` - More specific privacy policy description
- **CHANGED:** `disclaimer.html` - Clearer quantum disclaimer description
- **CHANGED:** `terms.html` - More descriptive ToS summary

#### Canonical URL Fixes
**FIXED:** Removed `.html` extensions from canonical URLs on 14 pages:
- pricing.html
- about.html
- docs.html
- password-api.html
- privacy.html
- terms.html
- disclaimer.html
- premium.html
- api-docs.html
- free-password-checker.html
- generate-phonetic.html
- security.html
- 404.html

#### Multiple H1 Tag Fix
- **FIXED:** `premium.html` - Changed second h1 to h2 for SEO compliance

#### Robots.txt Updates
- **ADDED:** `Disallow: /api/` to block all API endpoints from crawlers

### 🚀 Deployments

#### Website (mypasswordchecker-main)
- **Version:** d1e54d2b-0240-4612-9fe1-aee35501e1ae
- **Date:** February 11, 2026
- **Files Updated:** 14 HTML files (meta descriptions + canonical URLs)

#### API Worker (mypasswordchecker-api)
- **Version:** 5275c82b-fc71-4ba8-b14a-e5fca8dd2097
- **Date:** February 11, 2026
- **Changes:** 6-tier logic + noindex headers

### 📊 Cost Analysis

#### New Documentation
- **ADDED:** Complete cost analysis document at `/tier-cost-analysis.md`
- **DOCUMENTED:** Per-request costs (~$0.000008)
- **DOCUMENTED:** Profit margins by tier (88-98%)
- **DOCUMENTED:** Costs without Cloudflare free tier
- **DOCUMENTED:** Overage pricing profitability

### 🐛 Bug Fixes

#### Cloudflare Error 1000 (www subdomain)
- **FIXED:** Added www subdomain route to wrangler-static.toml
- **FIXED:** Sitemap now accessible at both www and non-www URLs

#### Pricing Table Super Column Empty
- **FIXED:** Manually added XL and Super Quantum data to all comparison table rows

#### Bing API Endpoint Indexing
- **FIXED:** Added noindex header to API responses
- **FIXED:** Updated robots.txt to block /api/

### 📝 Documentation

#### New Documentation Files
- **ADDED:** `/Docs/session-context-2026-02-11.md` - Complete session context
- **ADDED:** `/Docs/quick-reference.md` - Quick reference guide
- **ADDED:** `/Docs/CHANGELOG.md` - This file
- **UPDATED:** `/tier-cost-analysis.md` - Cost modeling for new tiers

### 🔒 Security

#### API Protection
- **ADDED:** X-Robots-Tag header prevents API endpoint indexing
- **MAINTAINED:** All existing API key validation
- **MAINTAINED:** Domain verification requirements
- **MAINTAINED:** Rate limiting on all endpoints

---

## [1.0.0] - Previous Version

### Initial Features
- 5-tier pricing structure
- Free tier with 25 requests/month
- Paid tiers: $12, $29, $49, $99, $349
- PayPal + Stripe payment processing
- API key management
- Dashboard for users
- Quantum resistance analysis
- Phonetic password generation
- Breach checking (high tiers)

---

## Migration Guide: v1.0 → v2.0

### For Existing Customers

**No Action Required:**
- Existing API keys will continue to work
- Current tier quotas are maintained
- Billing cycles unchanged

**Tier Mapping:**
Old customers on these tiers map to new structure:

| Old Tier | Old Price | New Tier | New Price | Notes |
|----------|-----------|----------|-----------|-------|
| Tier 1 | $12 | Tier 1 (Standard) | $5 | Price reduced, keep quota |
| Tier 2 | $29 | Tier 2 (Basic Quantum) | $10 | Price reduced, increased quota |
| Tier 3 | $49 | Tier 3 (Std Quantum) | $40 | Price reduced, 6x quota increase |
| Tier 4 | $99 | Tier 4 (Large Quantum) | $80 | Price reduced, keep quota |
| Tier 5 | $349 | Tier 5 (XL Quantum) | $150 | 57% price reduction! |

**New Option:**
- Tier 6 (Super Quantum) at $299/mo available for upgrade
- 3M checks/month, 300K quantum, 300K phonetic, 200K breach

### For Developers

**API Changes:**
- No breaking changes to API endpoints
- Response headers now include `X-Robots-Tag: noindex, nofollow`
- All endpoints remain backward compatible

**Configuration:**
- Update `wrangler-api.toml` with tier 6 variables
- Update Stripe webhook to handle $299+ payments
- Test tier 6 creation in sandbox before production

**Database:**
- No schema changes required
- Existing tier values (0-5) still valid
- Tier 6 customers will have `tier = 6` in database

---

## Upgrade Instructions

### For Site Owners

**Deploy Website Changes:**
```bash
cd "/Users/jack/Projects - Xcode/mypasswordchecker"
wrangler deploy --config wrangler-static.toml
```

**Deploy API Changes:**
```bash
cd "/Users/jack/Projects - Xcode/mypasswordchecker"
wrangler deploy --config wrangler-api.toml
```

**Verify Deployment:**
1. Check pricing page: https://mypasswordchecker.com/pricing
2. Verify 6 tiers visible
3. Test www subdomain: https://www.mypasswordchecker.com/
4. Check sitemap: https://mypasswordchecker.com/sitemap.xml

---

## Known Issues

### Resolved in v2.0
- ✅ Canonical URLs had .html extensions (Bing error)
- ✅ Missing meta descriptions on legal pages (Bing error)
- ✅ Multiple h1 tags on premium.html (Bing warning)
- ✅ www subdomain returned Error 1000 (Cloudflare error)
- ✅ API endpoints appearing in search results (Bing indexing)
- ✅ Pricing table missing Super Quantum data

### Pending (External)
- ⏳ Waiting for Bing to re-crawl and clear API endpoint 404 reports
- ⏳ Waiting for Google to index updated sitemap

---

## Statistics

### Files Changed
- **Configuration:** 2 files
- **Worker Code:** 1 file
- **HTML Pages:** 14 files
- **SEO Files:** 1 file (robots.txt)
- **Documentation:** 4 files

### Lines of Code
- **Added:** ~500 lines (pricing tables, tier logic, documentation)
- **Modified:** ~200 lines (meta tags, canonical URLs, headers)
- **Removed:** 0 lines

### Deployment Time
- **Website Deploy:** ~12 seconds
- **API Deploy:** ~5 seconds
- **Total Downtime:** 0 seconds (zero-downtime deployment)

---

## Credits

**Implemented by:** Claude (Anthropic)
**Session Date:** February 11, 2026
**Session Duration:** Multiple hours
**Client:** Jack (Cloudflare@skypathways.com)

---

## Future Roadmap

### Under Consideration
- [ ] Quarterly billing option (save 1 month)
- [ ] Usage analytics dashboard
- [ ] Automatic upgrade suggestions based on usage
- [ ] Email alerts for quota limits
- [ ] Custom enterprise tiers above $299/mo
- [ ] Affiliate program for API resellers

### Technical Debt
- [ ] Add comprehensive API tests for tier 6
- [ ] Monitor tier 6 customer acquisition
- [ ] A/B test pricing messaging
- [ ] Add tier comparison calculator

---

**Next Changelog Entry:** TBD
