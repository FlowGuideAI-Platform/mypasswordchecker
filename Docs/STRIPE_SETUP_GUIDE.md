# Stripe Integration Setup Guide

## Quick Setup (5 minutes)

### Step 1: Get Your Stripe Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)
3. Keep this window open

### Step 2: Add Secret to Cloudflare Workers

```bash
cd /Users/jack/Projects\ -\ Xcode/MyPasswordChecker.com/mypasswordchecker

# Add Stripe secret key
wrangler secret put STRIPE_SECRET_KEY
# When prompted, paste your sk_test_... or sk_live_... key
```

### Step 3: Test the Integration

1. Visit your deployed site: `https://mypasswordchecker.com`
2. Click "Get Quantum Estimate - $2.00"
3. You should be redirected to Stripe Checkout
4. Use Stripe test card: `4242 4242 4242 4242`, any future date, any CVC
5. Complete payment
6. You should be redirected to `/premium.html` with working quantum estimate

### Step 4: Set Up Stripe Products (Optional - for API subscriptions)

```bash
# In Stripe Dashboard, create products:

1. Standard API Plan
   - Price: $19/month recurring
   - Product ID: Copy this for reference

2. Quantum Monthly Plan  
   - Price: $150/month recurring
   - Product ID: Copy this for reference

3. Quantum Per-Request
   - Price: $1.00 one-time
   - Product ID: Copy this for reference
```

## Webhook Setup (Recommended)

### Why Webhooks?

Webhooks let Stripe notify your system when:
- Subscriptions are created/canceled
- Payments succeed/fail
- Customers update payment methods

### Setup Steps

1. **Create Webhook Endpoint in Stripe Dashboard**
   - Go to: https://dashboard.stripe.com/webhooks
   - Click "Add endpoint"
   - URL: `https://mypasswordchecker.com/api/webhooks/stripe`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

2. **Get Webhook Secret**
   - After creating, copy the webhook signing secret (starts with `whsec_`)

3. **Add to Cloudflare**
   ```bash
   wrangler secret put STRIPE_WEBHOOK_SECRET
   # Paste your whsec_... secret
   ```

4. **Deploy Updated Worker**
   ```bash
   wrangler deploy
   ```

## Testing Checklist

- [ ] $2 quantum estimate checkout works
- [ ] Payment verification successful
- [ ] Premium page loads after payment
- [ ] API key generation works (`/api/auth/register`)
- [ ] API usage tracking increments correctly
- [ ] Rate limiting blocks after quota exceeded

## Switching to Live Mode

When ready for production:

1. Get **live** keys from Stripe (switch toggle in dashboard)
2. Update secret:
   ```bash
   wrangler secret put STRIPE_SECRET_KEY
   # Use sk_live_... this time
   ```
3. Update webhook endpoint to use live mode
4. Test with real card (will charge real money!)

## Common Issues

### "Stripe integration pending" alert

**Problem:** Stripe secret key not set or invalid

**Fix:**
```bash
# Check if secret exists
wrangler secret list

# Re-add if missing
wrangler secret put STRIPE_SECRET_KEY
```

### Payment succeeds but verification fails

**Problem:** KV namespace not configured or session cache issue

**Fix:**
1. Check wrangler.toml has correct KV namespace IDs
2. Deploy again: `wrangler deploy`
3. Clear browser cache and try again

### API returns 500 error

**Problem:** Environment variables not set

**Fix:**
Check all env vars in wrangler.toml are correct:
```bash
wrangler deploy
wrangler tail  # Watch logs in real-time
```

## Support

Stripe Documentation:
- API Keys: https://stripe.com/docs/keys
- Checkout: https://stripe.com/docs/payments/checkout
- Webhooks: https://stripe.com/docs/webhooks

Cloudflare Workers:
- Secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- KV: https://developers.cloudflare.com/kv/
