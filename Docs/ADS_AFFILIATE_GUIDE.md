# Ads & Affiliate Management Guide

## ✅ Current Setup: Centralized Configuration

All ads and affiliate links are now managed from a single file:
**`/public/js/ads-config.js`**

### Benefits:
- **Update once, apply everywhere** - Change affiliate URLs in one place
- **Easy to swap ad networks** - Switch between AdSense, Carbon, BuySellAds, etc.
- **Track performance** - Add analytics/tracking parameters to all links at once
- **A/B testing ready** - Easy to test different affiliate programs

---

## 🔗 Managing Affiliate Links

### To Update Affiliate Links:

Edit `/public/js/ads-config.js`:

```javascript
affiliateLinks: [
  {
    name: '1Password',
    url: 'https://1password.com/?ref=YOUR_AFFILIATE_ID', // ← Update this
    description: 'Best for families and teams'
  },
  // Add more...
]
```

### Where They Appear:
- **Index page**: Top of page, 5 links in a row
- Rendered by: `renderAffiliateLinks('affiliate-links-container')`

### Getting Affiliate IDs:

1. **1Password**: https://1password.com/partners/affiliate/
   - Commission: Up to 45%
   - Cookie: 90 days

2. **Bitwarden**: https://bitwarden.com/partners/
   - Commission: Varies
   - Cookie: 30 days

3. **NordPass**: https://partners.nordpass.com/
   - Commission: Up to 40%
   - Cookie: 30 days

4. **Dashlane**: https://www.dashlane.com/affiliate
   - Commission: Up to 50%
   - Cookie: 30 days

5. **YubiKey**: https://www.cj.com/ (Commission Junction)
   - Commission: 8-12%
   - Cookie: 30 days

---

## 💰 Managing Display Ads

### Current Setup:
Ads are configured in `/public/js/ads-config.js`:

```javascript
adSlots: {
  adsense: { enabled: false },  // Google AdSense
  carbon: { enabled: false },   // Carbon Ads
  buysellads: { enabled: false }, // BuySellAds
  direct: { enabled: true }     // Direct ad sales (custom HTML)
}
```

### Where Ads Appear:
- **premium.html**: 4 ad slots (2× 300x250, 2× 728x90)

---

## 🎯 Option A: Google AdSense (Recommended for Beginners)

### Setup:
1. **Apply**: https://www.google.com/adsense/
2. **Get approved** (can take 1-2 weeks)
3. **Get your publisher ID**: `ca-pub-XXXXXXXXXXXXXX`
4. **Create ad units** for each size:
   - 728x90 (Leaderboard)
   - 300x250 (Rectangle)

### Update ads-config.js:
```javascript
adsense: {
  enabled: true,
  client: 'ca-pub-1234567890123456', // Your publisher ID
  slots: {
    banner: '9876543210', // 728x90 slot ID
    rectangle: '1234567890' // 300x250 slot ID
  }
}
```

### Revenue:
- **$1-5 CPM** (per 1,000 views) for general traffic
- **$5-15 CPM** for tech/security niche
- At **10,000 views/month**: ~$50-150/month

---

## 🎯 Option B: Carbon Ads (Best for Developer Audience)

### Why Carbon?
- **High CPM**: $2-10 CPM (better than AdSense for dev traffic)
- **Non-intrusive**: Single small ad, respects privacy
- **No tracking**: Privacy-friendly (good for security site!)
- **Fast approval**: Usually 1-2 days

### Setup:
1. **Apply**: https://www.carbonads.net/
2. **Get approved**
3. **Get your serve code**: `CEAICKQE`
4. **Get your placement**: `mypasswordcheckercom`

### Update ads-config.js:
```javascript
carbon: {
  enabled: true,
  serve: 'CEAICKQE', // Your serve code
  placement: 'mypasswordcheckercom' // Your placement
}
```

### Revenue:
- **$2-5 CPM** for security/tech traffic
- At **10,000 views/month**: ~$20-50/month
- Less revenue but better UX

---

## 🎯 Option C: Direct Ad Sales (Highest Revenue)

### Why Direct Sales?
- **Keep 100%** of revenue (no middleman)
- **$10-50 CPM** possible for targeted ads
- **Relationships** with security vendors

### How to Get Direct Advertisers:

1. **Create an "Advertise with Us" page**:
   ```
   /public/advertise.html
   - Traffic stats (visitors, demographics)
   - Ad sizes available
   - Pricing ($500/month for 728x90, $300/month for 300x250)
   - Contact form
   ```

2. **Target security companies**:
   - Password managers (1Password, Dashlane, Bitwarden)
   - VPN providers (NordVPN, ExpressVPN)
   - Security tools (YubiKey, Ledger, Trezor)
   - Cybersecurity training (Udemy, Pluralsight)

3. **Outreach**:
   - Email their marketing teams
   - Offer first month 50% off
   - Show your traffic numbers

### Revenue:
- **$500-2,000/month** for 10k-50k views
- **$5,000+/month** for 100k+ views

---

## 📊 Recommended Ad Network by Traffic Level

| Monthly Visitors | Best Option | Expected Revenue |
|------------------|-------------|------------------|
| 0 - 1,000 | Affiliate links only | $0-50 |
| 1,000 - 10,000 | Carbon Ads | $20-100 |
| 10,000 - 50,000 | Google AdSense | $100-750 |
| 50,000 - 100,000 | AdSense + Affiliates | $500-2,000 |
| 100,000+ | Direct sales + AdSense | $2,000-10,000+ |

---

## 🚀 Quick Start: Enable Google AdSense

Once you have your AdSense account approved:

1. **Edit `/public/js/ads-config.js`**:
   ```javascript
   adsense: {
     enabled: true,
     client: 'ca-pub-YOUR_PUBLISHER_ID',
     slots: {
       banner: 'YOUR_728x90_SLOT_ID',
       rectangle: 'YOUR_300x250_SLOT_ID'
     }
   }
   ```

2. **Add AdSense script to pages**:
   In `/public/premium.html` and `/public/index.html`, add after other scripts:
   ```html
   <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_PUBLISHER_ID" crossorigin="anonymous"></script>
   ```

3. **Deploy**:
   ```bash
   wrangler pages deploy public --project-name=mypasswordchecker
   ```

4. **Wait for ads to appear** (can take 10-30 minutes)

---

## 🔍 Tracking Performance

### Add UTM Parameters to Affiliate Links:
```javascript
url: 'https://1password.com/?ref=yourID&utm_source=mypasswordchecker&utm_medium=affiliate&utm_campaign=index_top'
```

### Track Clicks:
Add onclick tracking:
```javascript
affiliateLinks: [
  {
    name: '1Password',
    url: 'https://1password.com/?ref=yourID',
    onclick: 'trackAffiliateClick("1password")'
  }
]
```

Then add tracking function:
```javascript
function trackAffiliateClick(name) {
  fetch('/api/track-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ link: name })
  });
}
```

---

## 📈 Optimization Tips

### 1. Test Ad Placements
- Above the fold > below the fold
- Near content > in sidebar
- End of article performs well

### 2. Limit Ad Density
- Max 3-4 ads per page
- Balance UX with revenue
- Too many ads = lower engagement

### 3. A/B Test Affiliate Links
- Test different password managers
- Try different CTA text
- Track which converts best

### 4. Seasonal Campaigns
- Black Friday: Promote deals
- New Year: "Secure your passwords in 2025"
- Data breach news: Capitalize on traffic spikes

---

## 🎨 Option D: Cloudflare Workers Ad Server (Advanced)

For maximum control, serve ads from your own API:

```javascript
// workers/ad-server.js
export default {
  async fetch(request, env) {
    const campaigns = await env.DB.prepare(
      'SELECT * FROM ad_campaigns WHERE status = ? ORDER BY bid DESC LIMIT 1'
    ).bind('active').first();

    return new Response(JSON.stringify(campaigns), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

Benefits:
- Full control over targeting
- A/B testing built-in
- Track everything
- Negotiate custom deals

---

## 💡 Summary

**Right now**: Update affiliate links in `ads-config.js` with your affiliate IDs

**At 1k visitors**: Apply for Carbon Ads or Google AdSense

**At 10k visitors**: Optimize ad placements, track performance

**At 50k visitors**: Reach out to security companies for direct ad sales

**File to edit**: `/public/js/ads-config.js`

**Deploy command**: `wrangler pages deploy public --project-name=mypasswordchecker`

---

Need help setting up a specific ad network? Let me know!
