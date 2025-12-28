# 🌐 Domain Setup Instructions - Step by Step

## ✅ Already Completed
- Worker updated with 301 redirect logic
- Deployed successfully

## 📋 What You Need to Do in Cloudflare Dashboard

### Step 1: Configure DNS Records

For each of these 3 domains, you need to add DNS records:

#### 1️⃣ MyPasswordCheck.com (singular "Check")

1. Go to: **Cloudflare Dashboard** → Select **"MyPasswordCheck.com"**
2. Click **"DNS"** → **"Records"**
3. Add these 2 records:

| Type | Name | Target | Proxy Status |
|------|------|--------|--------------|
| CNAME | @ | mypasswordchecker.pages.dev | Proxied (🟠) |
| CNAME | www | mypasswordchecker.pages.dev | Proxied (🟠) |

---

#### 2️⃣ MyQuantumPasswordChecker.com

1. Go to: **Cloudflare Dashboard** → Select **"MyQuantumPasswordChecker.com"**
2. Click **"DNS"** → **"Records"**
3. Add these 2 records:

| Type | Name | Target | Proxy Status |
|------|------|--------|--------------|
| CNAME | @ | mypasswordchecker.pages.dev | Proxied (🟠) |
| CNAME | www | mypasswordchecker.pages.dev | Proxied (🟠) |

---

#### 3️⃣ QuantumPasswordChecker.com

1. Go to: **Cloudflare Dashboard** → Select **"QuantumPasswordChecker.com"**
2. Click **"DNS"** → **"Records"**
3. Add these 2 records:

| Type | Name | Target | Proxy Status |
|------|------|--------|--------------|
| CNAME | @ | mypasswordchecker.pages.dev | Proxied (🟠) |
| CNAME | www | mypasswordchecker.pages.dev | Proxied (🟠) |

---

### Step 2: Add Custom Domains to Cloudflare Pages

1. Go to: **Cloudflare Dashboard** → **Pages** → **"mypasswordchecker"** project
2. Click **"Custom domains"** tab
3. Click **"Set up a custom domain"** button
4. Add each domain **one at a time** (6 total):

**Add these 6 domains:**
- `mypasswordcheck.com`
- `www.mypasswordcheck.com`
- `myquantumpasswordchecker.com`
- `www.myquantumpasswordchecker.com`
- `quantumpasswordchecker.com`
- `www.quantumpasswordchecker.com`

For each domain:
- Enter the domain name
- Click "Activate domain"
- Cloudflare will automatically provision SSL certificate (takes ~15 minutes)

---

### Step 3: Wait for DNS Propagation

⏱️ **Timeline:** 5-60 minutes

You can check propagation status:
```bash
# Check if DNS is resolving
dig mypasswordcheck.com
dig myquantumpasswordchecker.com
dig quantumpasswordchecker.com
```

---

### Step 4: Test Redirects

Once DNS propagates, test the redirects:

**Test in browser:**
- Visit: https://mypasswordcheck.com
  - Should redirect to: https://mypasswordchecker.com

- Visit: https://myquantumpasswordchecker.com
  - Should redirect to: https://mypasswordchecker.com

- Visit: https://quantumpasswordchecker.com
  - Should redirect to: https://mypasswordchecker.com

**Test with curl (command line):**
```bash
curl -I https://mypasswordcheck.com
# Should show: HTTP/2 301
# Location: https://mypasswordchecker.com/

curl -I https://www.myquantumpasswordchecker.com
# Should show: HTTP/2 301
# Location: https://www.mypasswordchecker.com/

curl -I https://quantumpasswordchecker.com
# Should show: HTTP/2 301
# Location: https://mypasswordchecker.com/
```

---

## ✨ What This Achieves

### SEO Benefits
✅ **Consolidates link equity** - All backlinks count toward MyPasswordChecker.com
✅ **Prevents duplicate content** - No penalty for same content on multiple domains
✅ **Clear canonical domain** - Search engines know MyPasswordChecker.com is primary
✅ **301 redirects** - Permanent redirects preserve SEO value

### User Experience
✅ **Typo protection** - Users typing "MyPasswordCheck" (singular) still find you
✅ **Keyword variants** - "Quantum" searchers land on the right site
✅ **Consistent branding** - All domains point to official MyPasswordChecker.com

### Analytics
✅ **Single source of truth** - All traffic shows in mypasswordchecker.com analytics
✅ **Referrer tracking** - You'll see if people typed alternate domains directly
✅ **Clean data** - No split metrics across multiple domains

---

## 🚨 Common Issues & Solutions

### Issue: "CNAME already exists"
**Solution:** Delete the existing record first, then add new CNAME pointing to `mypasswordchecker.pages.dev`

### Issue: "Cannot use CNAME on root (@)"
**Solution:** Make sure you've enabled "CNAME flattening" in Cloudflare. It's on by default, but check: DNS → Settings → CNAME Flattening = Enabled

### Issue: "SSL certificate provisioning failed"
**Solution:**
1. Wait 15-30 minutes
2. If still failing, remove the custom domain and re-add it
3. Make sure DNS is proxied (orange cloud) not DNS-only (grey cloud)

### Issue: "Redirect not working"
**Solution:**
1. Check DNS propagation: `dig mypasswordcheck.com` should show Cloudflare IPs
2. Clear browser cache: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
3. Test in incognito/private window
4. Wait up to 1 hour for full DNS propagation

---

## 📊 Expected Timeline

| Step | Time |
|------|------|
| Add DNS records | 2 minutes per domain |
| Add custom domains to Pages | 1 minute per domain |
| SSL certificate provisioning | 15-30 minutes |
| DNS propagation globally | 5-60 minutes |
| **Total time** | **30-90 minutes** |

---

## 🎯 Next Steps After Setup

Once all domains are redirecting correctly:

1. ✅ Monitor analytics to see if traffic comes from alternate domains
2. ✅ Update any marketing materials to use MyPasswordChecker.com
3. ✅ Submit canonical domain to search engines (already done with sitemap)
4. ✅ Add schema.org markup mentioning alternate names (optional)

---

## ✍️ Current Status

**Worker Status:**
✅ Deployed with redirect logic
✅ Active on: mypasswordchecker.com/api/*
✅ 301 redirects configured for all 6 alternate domain variations

**Your Action Required:**
⏳ Add DNS records (Step 1)
⏳ Add custom domains to Pages (Step 2)
⏳ Wait for DNS propagation (Step 3)
⏳ Test redirects (Step 4)

**Estimated completion:** 30-90 minutes after you start Step 1
