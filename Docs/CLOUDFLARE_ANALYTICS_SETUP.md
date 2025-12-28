# Cloudflare Web Analytics Setup

## Step 1: Get Your Analytics Token

1. Go to Cloudflare Dashboard: https://dash.cloudflare.com/
2. Select your account (or create one if needed)
3. Navigate to **Analytics & Logs** → **Web Analytics**
4. Click **"Add a site"**
5. Enter: `mypasswordchecker.com`
6. Copy the **Site Token** that's generated

## Step 2: Add the Script to Your Pages

The analytics script has been prepared in all HTML pages with a placeholder.

Replace `CLOUDFLARE_TOKEN_PLACEHOLDER` with your actual token in these files:
- `public/index.html`
- `public/premium.html`
- `public/pricing.html`
- `public/api-docs.html`
- `public/dashboard.html`
- `public/domains.html`
- `public/privacy.html`
- `public/terms.html`
- `public/disclaimer.html`

The script tag looks like this:
```html
<!-- Cloudflare Web Analytics -->
<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "YOUR_ACTUAL_TOKEN_HERE"}'></script>
```

## Step 3: Quick Replace Command

Once you have your token, run this command to replace all placeholders:

```bash
cd /Users/jack/Projects\ -\ Xcode/MyPasswordChecker.com/mypasswordchecker

# Replace CLOUDFLARE_TOKEN_PLACEHOLDER with your actual token
find public -name "*.html" -type f -exec sed -i '' 's/CLOUDFLARE_TOKEN_PLACEHOLDER/YOUR_ACTUAL_TOKEN_HERE/g' {} \;
```

## Step 4: Deploy

```bash
npx wrangler pages deploy public --project-name=mypasswordchecker
```

## What You'll See

After 24-48 hours, you'll see in your Cloudflare Analytics dashboard:
- **Page views** - Total visits to each page
- **Referrers** - Where visitors came from (Google, social media, direct, etc.)
- **Countries** - Geographic distribution of visitors (aggregated)
- **Browsers & Devices** - What technology visitors use
- **Page paths** - Most popular pages

## Privacy Benefits

✅ **No cookies** - Doesn't use cookies at all
✅ **No fingerprinting** - Doesn't track individual users
✅ **GDPR compliant** - Fully compliant with EU privacy laws
✅ **No personal data** - Only aggregated statistics
✅ **Lightweight** - ~5KB script, doesn't slow down your site

## Notes

- Analytics script is loaded with `defer` attribute (non-blocking)
- Does not track password content (client-side only processing)
- Does not require cookie consent banners (no cookies used)
- Free with any Cloudflare account
