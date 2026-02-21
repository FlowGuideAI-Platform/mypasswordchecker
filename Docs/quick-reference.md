# MyPasswordChecker.com - Quick Reference Guide

## 🚀 Common Operations

### Authentication

**Check current account:**
```bash
wrangler whoami
```

**Switch accounts:**
```bash
wrangler logout
wrangler login
# Select: Cloudflare@skypathways.com's Account (be1ad24bfb43615483c3a472aa134892)
```

---

## 📦 Deployment

### Deploy Everything
```bash
cd "/Users/jack/Projects - Xcode/mypasswordchecker"

# Deploy website
wrangler deploy --config wrangler-static.toml

# Deploy API
wrangler deploy --config wrangler-api.toml
```

### Deploy Individual Workers

**Website only:**
```bash
wrangler deploy --config wrangler-static.toml
```

**API only:**
```bash
wrangler deploy --config wrangler-api.toml
```

### View Deployment History
```bash
wrangler deployments list --config wrangler-static.toml
wrangler deployments list --config wrangler-api.toml
```

---

## 🔍 Monitoring & Debugging

### View Live Logs
```bash
# API worker logs
wrangler tail --config wrangler-api.toml

# Filter for errors only
wrangler tail --config wrangler-api.toml --status error
```

### Check Environment Variables
```bash
# List API worker env vars
wrangler deploy --config wrangler-api.toml --dry-run
```

### View Secrets
```bash
wrangler secret list --config wrangler-api.toml
```

### Add/Update Secrets
```bash
wrangler secret put STRIPE_SECRET_KEY --config wrangler-api.toml
wrangler secret put PAYPAL_CLIENT_SECRET --config wrangler-api.toml
wrangler secret put ADMIN_TOKEN --config wrangler-api.toml
```

---

## 💾 Database Operations

### Query D1 Database
```bash
# List all tables
wrangler d1 execute mypasswordchecker-db --command "SELECT name FROM sqlite_master WHERE type='table';"

# Count API keys by tier
wrangler d1 execute mypasswordchecker-db --command "SELECT tier, COUNT(*) as count FROM api_keys GROUP BY tier;"

# View recent API keys
wrangler d1 execute mypasswordchecker-db --command "SELECT api_key, tier, user_email, created_at FROM api_keys ORDER BY created_at DESC LIMIT 10;"
```

### Backup Database
```bash
wrangler d1 backup create mypasswordchecker-db
wrangler d1 backup list mypasswordchecker-db
```

---

## 🛠️ Local Development

### Test Pages Locally
```bash
cd "/Users/jack/Projects - Xcode/mypasswordchecker/public"
python3 -m http.server 8000
# Visit: http://localhost:8000
```

### Test API Worker Locally
```bash
cd "/Users/jack/Projects - Xcode/mypasswordchecker"
wrangler dev --config wrangler-api.toml
# API available at: http://localhost:8787/api/*
```

---

## 📊 Pricing Tiers Quick Reference

| Tier | Price | Checks | Quantum | Phonetic | Breach | Overage |
|------|-------|--------|---------|----------|--------|---------|
| Free | $0 | 50/mo | - | - | - | $0.20 |
| Standard | $5 | 12K | 100 | 100 | - | $0.0125 |
| Basic | $10 | 50K | 1K | 1K | - | $0.0125 |
| Std Quantum | $40 | 150K | 5K | 5K | 1K | $0.0125 |
| Large | $80 | 400K | 25K | 25K | 5K | $0.0100 |
| XL | $150 | 1M | 100K | 100K | 20K | $0.0090 |
| Super | $299 | 3M | 300K | 300K | 200K | $0.0075 |

---

## 📁 Important File Locations

### Configuration Files
```
/Users/jack/Projects - Xcode/mypasswordchecker/
├── wrangler-api.toml          # API worker config
├── wrangler-static.toml       # Static site config
└── workers/
    └── mypasswordchecker-api.js   # API worker code
```

### Public Website Files
```
/Users/jack/Projects - Xcode/mypasswordchecker/public/
├── index.html                 # Homepage
├── pricing.html               # Pricing page
├── password-api.html          # API landing page
├── docs.html                  # API docs
├── about.html                 # About page
├── dashboard.html             # User dashboard
├── premium.html               # Payment success
├── robots.txt                 # Search engine rules
├── sitemap.xml                # Sitemap
└── css/styles.css             # Styles
```

### Documentation
```
/Users/jack/Projects - Xcode/mypasswordchecker/
├── Docs/
│   ├── session-context-2026-02-11.md  # Full session context
│   └── quick-reference.md             # This file
└── tier-cost-analysis.md              # Cost analysis
```

---

## 🔧 Common Fixes

### Fix: Wrong Cloudflare Account
```bash
wrangler logout
wrangler login
# Select: Cloudflare@skypathways.com (ending in ...aa134892)
```

### Fix: Clear Deployment Cache
```bash
rm -rf .wrangler/state
wrangler deploy --config wrangler-static.toml
```

### Fix: Update Pricing
1. Edit `/public/pricing.html` (main pricing page)
2. Edit `/public/password-api.html` (API landing)
3. Edit `/public/about.html` (business FAQ section)
4. Edit `/wrangler-api.toml` (tier variables)
5. Edit `/workers/mypasswordchecker-api.js` (tier logic)
6. Deploy both workers

### Fix: Update Meta Descriptions
Edit the `<meta name="description">` tag in the HTML file's `<head>` section, then deploy.

### Fix: Canonical URLs
Canonical URLs should NOT have `.html` extensions:
```html
<!-- Correct -->
<link rel="canonical" href="https://mypasswordchecker.com/pricing">

<!-- Wrong -->
<link rel="canonical" href="https://mypasswordchecker.com/pricing.html">
```

---

## 🌐 URLs to Test After Deployment

### Public Pages
- https://mypasswordchecker.com/
- https://www.mypasswordchecker.com/ (www subdomain)
- https://mypasswordchecker.com/pricing
- https://mypasswordchecker.com/password-api
- https://mypasswordchecker.com/docs
- https://mypasswordchecker.com/about

### SEO Files
- https://mypasswordchecker.com/robots.txt
- https://mypasswordchecker.com/sitemap.xml
- https://www.mypasswordchecker.com/sitemap.xml (www version)

### Verify Blocked
These should return 404 or be blocked by robots.txt:
- https://mypasswordchecker.com/api/auth/github (404 expected)
- https://mypasswordchecker.com/dashboard.html (blocked in robots.txt)

---

## 📈 SEO Checklist

### Check in Google Search Console
- [ ] Sitemap submitted and indexed
- [ ] No coverage errors
- [ ] Mobile usability OK
- [ ] Core Web Vitals passing

### Check in Bing Webmaster Tools
- [ ] Sitemap submitted and indexed
- [ ] No meta description errors
- [ ] No canonical URL errors
- [ ] No multiple h1 tag warnings
- [ ] API endpoints not indexed

### On-Page SEO Checklist
- [ ] Each page has unique meta description
- [ ] Each page has one h1 tag
- [ ] Canonical URLs don't have .html extensions
- [ ] robots.txt blocks /api/, /dashboard.html, /domains.html, /premium.html
- [ ] sitemap.xml includes only public pages

---

## 🔒 Security Checklist

### API Worker
- [ ] CORS headers properly configured
- [ ] API key validation on all endpoints
- [ ] Rate limiting enabled
- [ ] Domain verification for higher tiers
- [ ] Overage charges calculated correctly
- [ ] X-Robots-Tag prevents indexing

### Website
- [ ] Dashboard requires authentication
- [ ] Premium.html only accessible after payment
- [ ] No API keys exposed in client-side code
- [ ] robots.txt blocks sensitive pages

---

## 📞 Support Contacts

**Cloudflare Account:**
- Email: cloudflare@skypathways.com
- Account ID: be1ad24bfb43615483c3a472aa134892

**Domain:**
- Primary: mypasswordchecker.com
- Nameservers: Cloudflare

**Payment Processors:**
- PayPal: For transactions ≤ $5
- Stripe: For transactions > $5

---

## 🐛 Troubleshooting

### Deployment Fails
1. Check authentication: `wrangler whoami`
2. Verify account ID in wrangler.toml matches your account
3. Check for syntax errors in modified files
4. Clear cache: `rm -rf .wrangler`

### Pricing Not Updating
1. Verify file saved correctly
2. Deploy website: `wrangler deploy --config wrangler-static.toml`
3. Clear browser cache (Cmd+Shift+R)
4. Check deployed version ID matches latest

### API Returns Wrong Tier
1. Check wrangler-api.toml has correct tier variables
2. Verify workers/mypasswordchecker-api.js tier logic
3. Deploy API: `wrangler deploy --config wrangler-api.toml`
4. Check logs: `wrangler tail --config wrangler-api.toml`

### SEO Issues in Bing
1. Wait 1-2 weeks after fixes deployed
2. Check robots.txt: https://mypasswordchecker.com/robots.txt
3. Request re-crawl in Bing Webmaster Tools
4. Verify canonical URLs don't have .html
5. Check all pages have unique meta descriptions

---

## 🎯 Version History

**v2.0 - February 11, 2026**
- Implemented 6-tier pricing structure
- Added XL Quantum tier ($150/mo)
- Updated Super Quantum to $299/mo with 3M checks
- Fixed all SEO issues (canonical URLs, meta descriptions, h1 tags)
- Added www subdomain support
- Added API noindex headers
- Updated robots.txt

**v1.0 - Previous**
- 5-tier structure
- Old pricing: $12, $29, $49, $99, $349

---

**Last Updated:** February 11, 2026
