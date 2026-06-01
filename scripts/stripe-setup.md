# Stripe setup — one-time configuration for P3a

Run these once against your live Stripe account (or test account first).
Each $10+ tier needs one **Product** + one recurring monthly **Price**, with
the tier integer in `metadata.tier` so the webhook can map a Subscription
back to a tier without a hardcoded price ID table.

> Tiers below $10 (Standard $2.50, Basic Quantum $5) are PayPal — see
> `scripts/paypal-setup.md`. Don't create Stripe products for those.

## 0. Secrets the worker needs

Set these via `wrangler secret put` against the mypasswordchecker-api
worker. They are **not** committed to the repo.

```
npx wrangler secret put STRIPE_SECRET_KEY      --config wrangler.toml
npx wrangler secret put STRIPE_WEBHOOK_SECRET  --config wrangler.toml
```

`STRIPE_PUBLISHABLE_KEY` already exists in `wrangler.toml` `[vars]` (or
move it to a secret — it's a publishable key, fine either way).

## 1. Create products + prices

Pick **one** of the two paths.

### Path A: Stripe Dashboard (clickable, recommended for first time)

For each of the four tiers below, in dashboard.stripe.com →
**Product catalog** → **+ Add product**:

| Tier int | Product name | Recurring price | Currency | Billing | metadata key | metadata value |
|---|---|---|---|---|---|---|
| 3 | MyPasswordChecker — Standard Quantum | **$20.00** | USD | monthly | `tier` | `3` |
| 4 | MyPasswordChecker — Large Quantum | **$40.00** | USD | monthly | `tier` | `4` |
| 5 | MyPasswordChecker — XL Quantum | **$60.00** | USD | monthly | `tier` | `5` |
| 6 | MyPasswordChecker — Super Quantum | **$99.00** | USD | monthly | `tier` | `6` |

Important: set the metadata **on the Price**, not on the Product. The
worker webhook reads `items.data[0].price.metadata.tier`.

Record each price ID (`price_…`) — you'll paste them below.

### Path B: Stripe CLI (one-liner per tier)

Requires `stripe` CLI authenticated (`stripe login`). Run from this repo:

```bash
# Tier 3 — Standard Quantum, $20/mo
stripe products create --name "MyPasswordChecker — Standard Quantum"
# (copy the prod_… id, then:)
stripe prices create \
  --product prod_XXXX \
  --unit-amount 2000 --currency usd \
  --recurring "interval=month" \
  --metadata "tier=3"

# Tier 4 — Large Quantum, $40/mo
stripe products create --name "MyPasswordChecker — Large Quantum"
stripe prices create --product prod_XXXX --unit-amount 4000 --currency usd \
  --recurring "interval=month" --metadata "tier=4"

# Tier 5 — XL Quantum, $60/mo
stripe products create --name "MyPasswordChecker — XL Quantum"
stripe prices create --product prod_XXXX --unit-amount 6000 --currency usd \
  --recurring "interval=month" --metadata "tier=5"

# Tier 6 — Super Quantum, $99/mo
stripe products create --name "MyPasswordChecker — Super Quantum"
stripe prices create --product prod_XXXX --unit-amount 9900 --currency usd \
  --recurring "interval=month" --metadata "tier=6"
```

## 2. Record the price IDs

After creating, the worker needs to know which Price ID corresponds to
which tier (so `/api/create-checkout-session` can resolve a tier to a
price). Two options:

**Recommended — wrangler vars.** Set these in `wrangler.toml` `[vars]`:

```toml
[vars]
STRIPE_PRICE_TIER_3 = "price_1ABC..."
STRIPE_PRICE_TIER_4 = "price_1DEF..."
STRIPE_PRICE_TIER_5 = "price_1GHI..."
STRIPE_PRICE_TIER_6 = "price_1JKL..."
```

The worker reads `env.STRIPE_PRICE_TIER_<n>`. No price IDs in code.

The webhook side reads `price.metadata.tier` straight off Stripe, so
your hardcoded mapping cannot drift from the live catalog.

## 3. Configure the webhook

In dashboard.stripe.com → **Developers → Webhooks → Add endpoint**:

- URL: `https://mypasswordchecker.com/api/stripe/webhook`
- Events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

Stripe gives you a signing secret (`whsec_…`). Set it:

```bash
npx wrangler secret put STRIPE_WEBHOOK_SECRET --config wrangler.toml
```

## 4. Test in test mode

In Stripe test mode, use card `4242 4242 4242 4242`. Click an upgrade
button in /dashboard, complete the hosted Checkout, redirect back, and
confirm in D1:

```bash
npx wrangler d1 execute mypasswordchecker-db --remote \
  --command "SELECT api_key, tier, status, stripe_subscription_id FROM api_keys ORDER BY created_at DESC LIMIT 5;" \
  --config wrangler.toml
```

Tier + status should reflect the upgrade. The "Manage subscription"
button opens Stripe's hosted Customer Portal.
