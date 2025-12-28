# Email Setup Guide - Cloudflare Email Routing

## Quick Setup (5 minutes)

### Step 1: Enable Email Routing

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select **mypasswordchecker.com**
3. Click **Email** → **Email Routing**
4. Click **Enable Email Routing**

### Step 2: Add Destination Address

Add: `noreply@mypasswordchecker.com`
- Forwards to: `jack@mypasswordchecker.com` (or your email)
- Click **Add and Verify**
- Check your inbox and click verification link

### Step 3: Verify DNS (Auto-Created)

Cloudflare automatically adds these DNS records:
```
MX mypasswordchecker.com → route1.mx.cloudflare.net (Priority 1)
MX mypasswordchecker.com → route2.mx.cloudflare.net (Priority 2)
TXT mypasswordchecker.com → "v=spf1 include:_spf.mx.cloudflare.net ~all"
```

✅ **Done!** Email sending is now active.

---

## Emails Sent by API Worker

1. **Verification Email** - When developer subscribes (API key created)
2. **Suspension Email** - When abuse score >70 (auto-suspend)
3. **Reactivation Email** - When admin unsuspends key
4. **Admin Alerts** - Sent to you when suspicious activity detected

---

## Cost

✅ **FREE** - No external service needed (SendGrid, Mailgun, etc.)

---

## Testing

After deployment, test email sending:

```bash
# Test will be sent when you create first API subscription
# Or manually trigger via admin endpoint (add if needed)
```

---

## Troubleshooting

**Emails not received?**
1. Check spam folder
2. Verify Email Routing is enabled
3. Check destination address is correct
4. View logs: Dashboard → Email → Logs

**Change admin email:**
Edit `wrangler-api.toml`:
```toml
ADMIN_EMAIL = "your-email@example.com"
```

Then redeploy.
