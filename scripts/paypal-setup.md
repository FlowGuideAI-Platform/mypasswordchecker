# PayPal setup — one-time configuration for P3b

PayPal handles the **under-$10 API tiers** (Standard $2.50, Basic
Quantum $5) as recurring monthly subscriptions. PayPal micropayment
pricing (5% + $0.15) gives a better net than Stripe's 2.9% + $0.30 at
those amounts, which is the whole reason this rail exists.

> Tiers $10+ are Stripe — see `scripts/stripe-setup.md`.
> The consumer $1 Premium one-time PayPal flow is unrelated and stays
> on the existing `/api/paypal/create-order` handler. **Do not modify
> that handler** while doing this setup.

## 0. Confirm PayPal micropayment pricing is enabled

Net figures in the build prompt's §2 (`$2.50 → $2.23`, `$5 → $4.60`)
assume your PayPal business account has **micropayment pricing**
enabled. Standard PayPal pricing (2.9% + $0.30) on a $2.50 charge nets
~$2.13 — close enough that it still works, but lower than projected.

Open a support ticket with PayPal if it's not already on. Note this:
PayPal applies the better of the two rates per merchant, not per
charge — they enable it account-wide.

## 1. Secrets the worker needs

```bash
# Reuses the one-time-payment creds if those are already set.
npx wrangler secret put PAYPAL_CLIENT_SECRET --config wrangler.toml
npx wrangler secret put PAYPAL_WEBHOOK_ID    --config wrangler.toml
```

`PAYPAL_CLIENT_ID` and `PAYPAL_ENVIRONMENT` (`production` | `sandbox`)
are vars in `wrangler.toml` and can stay there. Check via:

```bash
npx wrangler secret list --config wrangler.toml
```

If `PAYPAL_CLIENT_SECRET` already exists from the $1 Premium flow,
reuse it — don't rotate.

## 2. Create the product + plans

PayPal needs a Product and a Plan per tier. Both are REST API calls,
no dashboard equivalent for plan creation in some PayPal regions.

### Step 2a — get an access token

```bash
TOKEN=$(curl -s -X POST https://api-m.paypal.com/v1/oauth2/token \
  -u "$PAYPAL_CLIENT_ID:$PAYPAL_CLIENT_SECRET" \
  -d "grant_type=client_credentials" | jq -r .access_token)
```

(Use `api-m.sandbox.paypal.com` for sandbox.)

### Step 2b — create one Product

```bash
curl -s -X POST https://api-m.paypal.com/v1/catalogs/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MyPasswordChecker API",
    "description": "Recurring API access subscription",
    "type": "SERVICE",
    "category": "SOFTWARE"
  }'
```

Record the returned `id` (looks like `PROD-XXXXXXXXXXXXX`).

### Step 2c — create one Plan per under-$10 tier

Use the Product id from 2b.

```bash
# Tier 1 — Standard, $2.50/mo
curl -s -X POST https://api-m.paypal.com/v1/billing/plans \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "PROD-XXX",
    "name": "MyPasswordChecker — Standard",
    "billing_cycles": [{
      "frequency": { "interval_unit": "MONTH", "interval_count": 1 },
      "tenure_type": "REGULAR",
      "sequence": 1,
      "total_cycles": 0,
      "pricing_scheme": { "fixed_price": { "value": "2.50", "currency_code": "USD" } }
    }],
    "payment_preferences": {
      "auto_bill_outstanding": true,
      "setup_fee_failure_action": "CONTINUE",
      "payment_failure_threshold": 1
    }
  }'

# Tier 2 — Basic Quantum, $5/mo
# (same shape, fixed_price.value = "5.00")
```

Record each `id` (looks like `P-XXXXXXXXXXXXX`).

## 3. Map plans to tiers in wrangler.toml

Same idea as the Stripe price-id mapping — one var per tier:

```toml
[vars]
PAYPAL_PLAN_TIER_1 = "P-1ABCDEFG..."
PAYPAL_PLAN_TIER_2 = "P-2HIJKLMN..."
```

The worker reads `env.PAYPAL_PLAN_TIER_<n>`. No plan IDs in code.

## 4. Configure the webhook

In developer.paypal.com → My apps & credentials → your app →
**Webhooks** → **Add webhook**:

- URL: `https://mypasswordchecker.com/api/paypal/webhook`
- Events:
  - `BILLING.SUBSCRIPTION.ACTIVATED`
  - `BILLING.SUBSCRIPTION.UPDATED`
  - `BILLING.SUBSCRIPTION.CANCELLED`
  - `BILLING.SUBSCRIPTION.EXPIRED`
  - `BILLING.SUBSCRIPTION.SUSPENDED`
  - `PAYMENT.SALE.DENIED`

PayPal will issue a `webhook_id` (looks like `8PT0...`). Set it:

```bash
npx wrangler secret put PAYPAL_WEBHOOK_ID --config wrangler.toml
```

The worker uses it to call `/v1/notifications/verify-webhook-signature`
on each incoming webhook (PayPal's recommended verification).

## 5. Test in sandbox

Switch the worker to sandbox by setting `PAYPAL_ENVIRONMENT=sandbox`
in `wrangler.toml` `[vars]`, re-deploy, then upgrade the Standard or
Basic Quantum tier from `/dashboard`. PayPal approval page →
return → webhook fires → tier + quotas set in D1. Verify:

```bash
npx wrangler d1 execute mypasswordchecker-db --remote \
  --command "SELECT api_key, tier, status, stripe_subscription_id, payment_processor FROM api_keys ORDER BY created_at DESC LIMIT 5;" \
  --config wrangler.toml
```

(The `stripe_subscription_id` column is reused for PayPal subscription
ids — keeps the schema unchanged. The `payment_processor` column will
read `paypal` for PayPal subs and `stripe` for Stripe subs so they're
distinguishable.)

## 6. Cancel from the dashboard

PayPal has no hosted Customer Portal equivalent to Stripe's. The
worker exposes `POST /api/paypal/cancel-subscription` that posts to
PayPal's `/v1/billing/subscriptions/{id}/cancel`. The dashboard's
"Manage subscription" button is wired to call this with a confirm
dialog when the key's `payment_processor = 'paypal'`.
