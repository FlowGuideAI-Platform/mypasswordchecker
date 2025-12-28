# DNS Configuration & 301 Redirect Setup

## Goal
Redirect these domains to MyPasswordChecker.com with 301 redirects:
- MyPasswordCheck.com → MyPasswordChecker.com
- MyQuantumPasswordChecker.com → MyPasswordChecker.com
- QuantumPasswordChecker.com → MyPasswordChecker.com

## Step 1: Configure DNS Records

For each domain in Cloudflare DNS:

### MyPasswordCheck.com
1. Go to Cloudflare Dashboard → Select "MyPasswordCheck.com" domain
2. Click "DNS" → "Records"
3. Add these records:

**Root domain:**
- Type: `CNAME`
- Name: `@`
- Target: `mypasswordchecker.pages.dev`
- Proxy status: **Proxied** (orange cloud)

**WWW subdomain:**
- Type: `CNAME`
- Name: `www`
- Target: `mypasswordchecker.pages.dev`
- Proxy status: **Proxied** (orange cloud)

### MyQuantumPasswordChecker.com
Same as above:
- `@` → `mypasswordchecker.pages.dev` (Proxied)
- `www` → `mypasswordchecker.pages.dev` (Proxied)

### QuantumPasswordChecker.com
Same as above:
- `@` → `mypasswordchecker.pages.dev` (Proxied)
- `www` → `mypasswordchecker.pages.dev` (Proxied)

## Step 2: Add Custom Domains to Cloudflare Pages

1. Go to: Cloudflare Dashboard → Pages → **mypasswordchecker** project
2. Click **"Custom domains"** tab
3. Click **"Set up a custom domain"**
4. Add each domain (one at a time):
   - `mypasswordcheck.com`
   - `www.mypasswordcheck.com`
   - `myquantumpasswordchecker.com`
   - `www.myquantumpasswordchecker.com`
   - `quantumpasswordchecker.com`
   - `www.quantumpasswordchecker.com`

Pages will automatically provision SSL certificates for each.

## Step 3: Update Worker for 301 Redirects

The Worker has been updated to redirect alternate domains to MyPasswordChecker.com.

**Redirects configured:**
- mypasswordcheck.com → mypasswordchecker.com
- www.mypasswordcheck.com → www.mypasswordchecker.com
- myquantumpasswordchecker.com → mypasswordchecker.com
- www.myquantumpasswordchecker.com → www.mypasswordchecker.com
- quantumpasswordchecker.com → mypasswordchecker.com
- www.quantumpasswordchecker.com → www.mypasswordchecker.com

## Step 4: Deploy Updated Worker

Already done! The Worker includes redirect logic.

## Step 5: Set Up Analytics (Optional)

Since we're redirecting, you may want to track referrers instead of separate analytics per domain.

Analytics will show:
- All traffic consolidates to mypasswordchecker.com
- Referrers will show if traffic came from typed-in alternate domains

## Testing After Setup

Once DNS propagates (5-60 minutes), test:

```bash
curl -I https://mypasswordcheck.com
# Should return: HTTP/2 301
# Location: https://mypasswordchecker.com/

curl -I https://myquantumpasswordchecker.com
# Should return: HTTP/2 301
# Location: https://mypasswordchecker.com/

curl -I https://quantumpasswordchecker.com
# Should return: HTTP/2 301
# Location: https://mypasswordchecker.com/
```

## SEO Benefits

✅ Consolidates all link equity to MyPasswordChecker.com
✅ Prevents duplicate content penalties
✅ Clear canonical domain for search engines
✅ All backlinks count toward main domain authority

## Timeline

- DNS changes: 5-60 minutes to propagate
- SSL certificates: Automatic (issued by Cloudflare within 15 minutes)
- Redirects: Active immediately after DNS propagates
