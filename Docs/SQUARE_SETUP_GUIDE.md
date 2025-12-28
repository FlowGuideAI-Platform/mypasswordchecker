# Square Payments Integration Guide

**Why Square Instead of Stripe?**
- You already have a Square account under review
- Square offers similar functionality (subscriptions, one-time payments, customer portal)
- Lower fees in some cases ($0.30 + 2.9% vs Stripe's similar pricing)
- Built-in invoicing and customer management

---

## 🔑 Step 1: Get Your Square API Credentials

### A. Access Square Developer Dashboard

1. Go to https://developer.squareup.com/apps
2. Log in with your Square account
3. Click on your application (or create one if needed)

### B. Get API Keys

**Click "Credentials" in the left sidebar**

You'll see two environments:

#### **Sandbox (Test Mode):**
- **Application ID:** `sandbox-sq0idb-...` (like Stripe's pk_test_)
- **Access Token:** `EAAAl...` (like Stripe's sk_test_)
- Use these for development/testing

#### **Production (Live Mode):**
- **Application ID:** `sq0idb-...` (like Stripe's pk_live_)
- **Access Token:** `EAAAl...` (like Stripe's sk_live_)
- Use these for real payments (after Square approves your account)

### C. Add to Cloudflare Workers

```bash
cd /Users/jack/Projects\ -\ Xcode/MyPasswordChecker.com/mypasswordchecker

# Add Square Access Token (secret - never expose)
wrangler secret put SQUARE_ACCESS_TOKEN
# Paste: EAAAl... (your sandbox or production token)

# Add Square Application ID (public - safe to expose)
wrangler secret put SQUARE_APPLICATION_ID
# Paste: sandbox-sq0idb-... or sq0idb-...

# Add Square Environment (sandbox or production)
wrangler secret put SQUARE_ENVIRONMENT
# Type: sandbox (or production when live)
```

---

## 🛒 Step 2: Square Payment Integration Options

Square offers several payment methods:

### Option A: Square Checkout (Recommended - Simplest)
- Hosted payment page (like Stripe Checkout)
- Square handles all payment UI
- Redirects back to your site after payment
- **Best for:** Quick setup, PCI compliance

### Option B: Square Web Payments SDK
- Embedded payment form on your site
- Custom styling
- More control over UX
- **Best for:** Custom checkout experience

### Option C: Square Invoices API
- Send invoices via email
- Customers pay via link
- **Best for:** B2B, manual billing

**Recommendation for MyPasswordChecker:** Use **Square Checkout** (Option A) - fastest to implement, same flow as Stripe.

---

## 💳 Step 3: Create Square Catalog (Pricing Plans)

Square uses "Catalog Items" instead of Stripe "Products":

### A. Create Catalog Items in Square Dashboard

1. Go to https://squareup.com/dashboard/items/library
2. Or use Square Developer Dashboard → "Catalog" API

### B. Create Items for Your Plans:

#### **1. Standard Plan - $19/month**
```json
{
  "type": "ITEM",
  "item_data": {
    "name": "MyPasswordChecker Standard",
    "description": "3,000 password checks per month",
    "variations": [
      {
        "type": "ITEM_VARIATION",
        "item_variation_data": {
          "name": "Monthly",
          "pricing_type": "FIXED_PRICING",
          "price_money": {
            "amount": 1900,  // $19.00 in cents
            "currency": "USD"
          }
        }
      }
    ]
  }
}
```

#### **2. Quantum Monthly - $150/month**
```json
{
  "type": "ITEM",
  "item_data": {
    "name": "MyPasswordChecker Quantum",
    "description": "15,000 password checks + 1,500 quantum estimates",
    "variations": [
      {
        "type": "ITEM_VARIATION",
        "item_variation_data": {
          "name": "Monthly",
          "pricing_type": "FIXED_PRICING",
          "price_money": {
            "amount": 15000,  // $150.00 in cents
            "currency": "USD"
          }
        }
      }
    ]
  }
}
```

#### **3. Quantum Single - $1.00**
```json
{
  "type": "ITEM",
  "item_data": {
    "name": "Quantum Estimate (Single)",
    "description": "One-time quantum resistance estimate",
    "variations": [
      {
        "type": "ITEM_VARIATION",
        "item_variation_data": {
          "name": "Single Purchase",
          "pricing_type": "FIXED_PRICING",
          "price_money": {
            "amount": 100,  // $1.00 in cents
            "currency": "USD"
          }
        }
      }
    ]
  }
}
```

### C. Get Catalog Item IDs

After creating these in Square, you'll get IDs like:
- **Item ID:** `ITEM_ID_xxx`
- **Variation ID:** `VARIATION_ID_xxx`

Add these to `wrangler.toml`:

```toml
[vars]
# ... existing vars ...

# Square Catalog IDs
SQUARE_ITEM_STANDARD = "ITEM_ID_standard"
SQUARE_VARIATION_STANDARD = "VARIATION_ID_standard"
SQUARE_ITEM_QUANTUM_MONTHLY = "ITEM_ID_quantum"
SQUARE_VARIATION_QUANTUM_MONTHLY = "VARIATION_ID_quantum"
SQUARE_ITEM_QUANTUM_SINGLE = "ITEM_ID_single"
SQUARE_VARIATION_QUANTUM_SINGLE = "VARIATION_ID_single"
```

---

## 🔗 Step 4: Set Up Square Webhooks

**In Square Developer Dashboard:**

1. Click **"Webhooks"** in the left sidebar (where you are in the screenshot)
2. Click **"Add Endpoint"**
3. **Endpoint URL:** `https://mypasswordchecker.com/api/webhooks/square`
4. **Events to Subscribe:**
   - `payment.created` - Payment initiated
   - `payment.updated` - Payment status changed
   - `invoice.paid` - Invoice paid
   - `invoice.payment_failed` - Payment failed
   - `subscription.created` - New subscription (if using Square Subscriptions)
   - `subscription.updated` - Subscription changed
   - `customer.created` - New customer

5. Click **"Save"**

### Get Webhook Signature Key

After creating the webhook:
1. Click on the webhook endpoint
2. Copy the **Signature Key** (used to verify webhook authenticity)

### Add to Cloudflare Workers:

```bash
wrangler secret put SQUARE_WEBHOOK_SIGNATURE_KEY
# Paste: your signature key
```

---

## 🔧 Step 5: Square Checkout API Integration

### A. Create Checkout Session Endpoint

```javascript
// POST /api/create-checkout-session
// Creates Square Checkout link

import { Client, Environment } from 'square';

async function createSquareCheckout(request, env) {
  // Validate session (user must be logged in)
  const auth = await requireAuth(request, env);
  if (!auth.valid) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401
    });
  }

  const { item_id, variation_id } = await request.json();

  // Initialize Square client
  const client = new Client({
    accessToken: env.SQUARE_ACCESS_TOKEN,
    environment: env.SQUARE_ENVIRONMENT === 'production'
      ? Environment.Production
      : Environment.Sandbox
  });

  // Get user from D1
  const user = await env.DB.prepare(
    'SELECT * FROM api_keys WHERE customer_id = ?'
  ).bind(auth.customer_id).first();

  // Create or get Square customer
  let squareCustomerId = user.square_customer_id;

  if (!squareCustomerId) {
    const { result } = await client.customersApi.createCustomer({
      emailAddress: user.email,
      referenceId: user.customer_id,
      note: `API Key: ${user.api_key}`
    });

    squareCustomerId = result.customer.id;

    // Save to D1
    await env.DB.prepare(
      'UPDATE api_keys SET square_customer_id = ? WHERE customer_id = ?'
    ).bind(squareCustomerId, user.customer_id).run();
  }

  // Create checkout link
  const { result } = await client.checkoutApi.createPaymentLink({
    idempotencyKey: crypto.randomUUID(),
    quickPay: {
      name: "MyPasswordChecker Plan",
      priceMoney: {
        amount: item_id === env.SQUARE_ITEM_QUANTUM_SINGLE ? 100 : 1900,
        currency: 'USD'
      },
      locationId: env.SQUARE_LOCATION_ID  // Get from Square Dashboard
    },
    checkoutOptions: {
      redirectUrl: `${env.DOMAIN}/dashboard?success=true`,
      askForShippingAddress: false
    },
    prePopulatedData: {
      buyerEmail: user.email
    }
  });

  return new Response(JSON.stringify({
    checkout_url: result.paymentLink.url
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### B. Square Webhook Handler

```javascript
// POST /api/webhooks/square
// Handles Square webhook events

import crypto from 'crypto';

async function handleSquareWebhook(request, env) {
  const signature = request.headers.get('x-square-signature');
  const body = await request.text();

  // Verify webhook signature
  const hmac = crypto.createHmac('sha256', env.SQUARE_WEBHOOK_SIGNATURE_KEY);
  const expectedSignature = hmac.update(
    request.url + body
  ).digest('base64');

  if (signature !== expectedSignature) {
    return new Response('Invalid signature', { status: 400 });
  }

  const event = JSON.parse(body);

  switch (event.type) {
    case 'payment.created':
    case 'payment.updated':
      if (event.data.object.payment.status === 'COMPLETED') {
        // Payment successful - update user plan
        const customerId = event.data.object.payment.customer_id;

        // Get customer reference_id (our customer_id)
        const client = new Client({
          accessToken: env.SQUARE_ACCESS_TOKEN,
          environment: env.SQUARE_ENVIRONMENT === 'production'
            ? Environment.Production
            : Environment.Sandbox
        });

        const { result } = await client.customersApi.retrieveCustomer(customerId);
        const ourCustomerId = result.customer.referenceId;

        // Determine plan based on amount
        const amount = event.data.object.payment.amount_money.amount;
        let plan = 'free';

        if (amount === 1900) plan = 'standard';
        else if (amount === 15000) plan = 'quantum_monthly';
        else if (amount === 100) plan = 'pay_per_use';  // Single quantum estimate

        // Update D1
        await env.DB.prepare(
          'UPDATE api_keys SET plan = ?, square_payment_id = ?, subscription_status = ? WHERE customer_id = ?'
        ).bind(plan, event.data.object.payment.id, 'active', ourCustomerId).run();

        // Audit log
        await auditLog(env, {
          type: 'payment_completed',
          customer_id: ourCustomerId,
          metadata: {
            payment_id: event.data.object.payment.id,
            amount: amount,
            plan: plan
          }
        });
      }
      break;

    case 'invoice.payment_failed':
      // Handle failed payment
      const customerId = event.data.object.invoice.customer_id;
      // ... similar customer lookup ...

      await env.DB.prepare(
        'UPDATE api_keys SET subscription_status = ? WHERE square_customer_id = ?'
      ).bind('past_due', customerId).run();
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

---

## 📊 Square vs Stripe Comparison

| Feature | Square | Stripe |
|---------|--------|--------|
| **Transaction Fee** | 2.9% + $0.30 | 2.9% + $0.30 |
| **Monthly Fee** | $0 | $0 |
| **Setup Complexity** | Medium | Medium |
| **Hosted Checkout** | ✅ Yes | ✅ Yes |
| **Subscriptions** | ✅ Yes | ✅ Yes |
| **Customer Portal** | ✅ Yes (via Invoices) | ✅ Yes |
| **Developer API** | ✅ Excellent | ✅ Excellent |
| **Approval Time** | 1-3 days (you're in review) | Instant (test mode) |

---

## 🔐 D1 Database Updates

Add Square-specific columns:

```sql
-- Update d1-schema.sql

ALTER TABLE api_keys ADD COLUMN square_customer_id TEXT;
ALTER TABLE api_keys ADD COLUMN square_payment_id TEXT;
CREATE INDEX idx_api_keys_square_customer ON api_keys(square_customer_id);
```

Or if starting fresh, include in CREATE TABLE:

```sql
CREATE TABLE IF NOT EXISTS api_keys (
    -- ... existing columns ...
    square_customer_id TEXT,
    square_payment_id TEXT,
    square_subscription_id TEXT,
    -- ... rest of columns ...
);
```

---

## 🚀 Implementation Plan

Once you provide your Square credentials, I'll:

### Phase 1: Backend API Integration
- [ ] Install Square SDK in Worker
- [ ] Add Square checkout endpoint
- [ ] Add Square webhook handler
- [ ] Update D1 schema with Square fields
- [ ] Test with Square sandbox

### Phase 2: Dashboard Security
- [ ] Add secure authentication (session-based)
- [ ] Add login form
- [ ] Protect dashboard endpoints
- [ ] Add session expiration

### Phase 3: Dashboard UI
- [ ] Add "Upgrade Plan" button
- [ ] Show current plan from Square
- [ ] Add payment history
- [ ] Link to Square Invoice management

### Phase 4: Testing
- [ ] Test sandbox payments
- [ ] Test webhook delivery
- [ ] Test plan upgrades
- [ ] Test authentication flow

---

## 📋 What I Need From You

**From Square Developer Dashboard (screenshot you showed):**

1. **Click "Credentials" (left sidebar)**
   - Copy **Application ID** (sandbox)
   - Copy **Access Token** (sandbox)

2. **Click "Webhooks" (where you are now)**
   - After I implement the webhook endpoint, you'll add it here
   - Copy **Signature Key** after creating webhook

3. **Get Location ID:**
   - Go to https://squareup.com/dashboard/locations
   - Copy your **Location ID** (looks like `L12345...`)
   - This is required for Square payments

**Share with me:**
- Square Application ID (sandbox): `sandbox-sq0idb-...`
- Square Access Token (sandbox): `EAAAl...`
- Square Location ID: `L...`

---

## 🎯 Square Advantages for Your Use Case

1. **Already in Review:** No need to wait for Stripe approval
2. **Unified Platform:** Square handles both online and in-person (if you ever need)
3. **Better Reporting:** Square Dashboard has excellent analytics
4. **Invoicing Built-in:** Send invoices for custom enterprise plans
5. **Same Dev Experience:** Similar to Stripe, easy migration if needed later

---

## 💡 Quick Start Checklist

**Right Now:**
- [ ] Go to "Credentials" in left sidebar
- [ ] Copy Application ID (sandbox)
- [ ] Copy Access Token (sandbox)
- [ ] Go to Locations, get Location ID
- [ ] Share these with me

**I'll Do:**
- [ ] Add Square secrets to Workers
- [ ] Implement Square Checkout
- [ ] Implement Square webhooks
- [ ] Add dashboard authentication
- [ ] Test complete flow

**Then You'll:**
- [ ] Add webhook endpoint in Square Dashboard
- [ ] Test with Square test card: `4111 1111 1111 1111`
- [ ] Verify payments show up in Square Dashboard
- [ ] Switch to production when Square approves your account

---

**Document Version:** 1.0
**Last Updated:** January 2025
**Status:** Ready to implement - awaiting Square credentials
