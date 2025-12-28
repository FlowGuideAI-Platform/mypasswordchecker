# Dashboard Security & Stripe Integration Guide

**Critical Issue:** Current dashboard has NO authentication - anyone with an API key can view usage data.
**Solution:** Add secure authentication + Stripe integration for plan management.

---

## 🚨 Current Security Problem

### What's Wrong with Current Dashboard?

```javascript
// Current dashboard.html (line 363-369)
window.addEventListener('load', () => {
    const savedKey = localStorage.getItem('mypasswordchecker_api_key');
    if (savedKey) {
        currentApiKey = savedKey;
        showDashboard();  // ❌ No validation, just shows data!
    }
});
```

**Problems:**
1. ❌ No authentication required
2. ❌ API key stored in localStorage (insecure)
3. ❌ Anyone who knows an API key can access that user's dashboard
4. ❌ No session expiration
5. ❌ No protection against key theft

---

## ✅ Recommended Solution: Session-Based Authentication

### How It Should Work:

1. **User visits `/dashboard.html`**
   - If no valid session → show login form
   - If valid session exists → load dashboard

2. **User enters API key**
   - Frontend sends API key to `/api/auth/login`
   - Backend validates key, creates secure session token
   - Session token stored in httpOnly cookie (can't be accessed by JavaScript)
   - Frontend redirects to dashboard

3. **Dashboard loads data**
   - Every API request includes session token in cookie
   - Backend validates session before returning data
   - Session expires after 24 hours

4. **User clicks "Logout"**
   - Destroys session token
   - Redirects to login page

---

## 🔐 Implementation: Secure Dashboard Authentication

### Step 1: Add Session Management to API

Your API needs a new endpoint: `POST /api/auth/login`

```javascript
// POST /api/auth/login
{
  "api_key": "mpc_xxx"
}
```

**What it does:**
1. Validates API key exists and is active
2. Creates session token (random UUID)
3. Stores in D1: `sessions` table with expiration
4. Returns session token in httpOnly cookie
5. Returns basic user info (email, plan, customer_id)

**Response:**
```javascript
{
  "success": true,
  "user": {
    "email": "jack@mypasswordchecker.com",
    "plan": "quantum_monthly",
    "customer_id": "cust_xxx"
  }
}
```

**Cookie Set:**
```
Set-Cookie: mpc_session=uuid_xxx; HttpOnly; Secure; SameSite=Strict; Max-Age=86400
```

### Step 2: Add Session Validation Middleware

Every protected endpoint checks session:

```javascript
async function requireAuth(request, env) {
  // Get session cookie
  const cookies = request.headers.get('Cookie') || '';
  const sessionMatch = cookies.match(/mpc_session=([^;]+)/);

  if (!sessionMatch) {
    return { valid: false, error: 'Not authenticated', code: 401 };
  }

  const sessionToken = sessionMatch[1];

  // Validate session in D1
  const session = await env.DB.prepare(
    'SELECT * FROM sessions WHERE session_token = ? AND expires_at > datetime("now")'
  ).bind(sessionToken).first();

  if (!session) {
    return { valid: false, error: 'Session expired', code: 401 };
  }

  // Update last_activity
  await env.DB.prepare(
    'UPDATE sessions SET last_activity = datetime("now") WHERE session_token = ?'
  ).bind(sessionToken).run();

  return { valid: true, customer_id: session.customer_id };
}
```

### Step 3: Update Dashboard HTML

**Current (Insecure):**
```javascript
// Shows dashboard if API key in localStorage
const savedKey = localStorage.getItem('mypasswordchecker_api_key');
if (savedKey) {
    showDashboard();
}
```

**New (Secure):**
```javascript
// Check if user has valid session
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/me', {
            credentials: 'include'  // Send cookies
        });

        if (response.ok) {
            const user = await response.json();
            showDashboard(user);
        } else {
            showLoginForm();
        }
    } catch (error) {
        showLoginForm();
    }
}

// Login form submission
async function login() {
    const apiKey = document.getElementById('api-key-input').value;

    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',  // Send/receive cookies
        body: JSON.stringify({ api_key: apiKey })
    });

    if (response.ok) {
        const data = await response.json();
        // Don't store API key in localStorage anymore!
        window.location.reload();  // Refresh to load dashboard
    } else {
        alert('Invalid API key');
    }
}

// Load dashboard on page load
window.addEventListener('load', checkAuth);
```

### Step 4: Add Sessions Table to D1

```sql
-- Add to d1-schema.sql

CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token TEXT UNIQUE NOT NULL,
    customer_id TEXT NOT NULL,
    api_key TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    last_activity TEXT NOT NULL DEFAULT (datetime('now')),
    ip_address TEXT,
    user_agent TEXT,

    FOREIGN KEY (customer_id) REFERENCES api_keys(customer_id)
);

CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_customer ON sessions(customer_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

---

## 💳 Stripe Integration for Plan Management

### Problem: No Way to Upgrade/Downgrade Plans

Current dashboard shows plan but no way to change it.

### Solution: Stripe Customer Portal + Checkout

---

## 🔑 Step 1: Add Stripe Secret Keys

### Get Your Keys from Stripe

1. Go to https://dashboard.stripe.com/apikeys
2. Toggle **"Test mode"** (or "Live mode" for production)
3. Copy these:
   - **Publishable key:** `pk_test_...` or `pk_live_...`
   - **Secret key:** `sk_test_...` or `sk_live_...`

### Add to Cloudflare Workers

```bash
cd /Users/jack/Projects\ -\ Xcode/MyPasswordChecker.com/mypasswordchecker

# Add secret key (never visible in code)
wrangler secret put STRIPE_SECRET_KEY
# Paste: sk_test_YOUR_KEY_HERE

# Add publishable key (used in frontend)
wrangler secret put STRIPE_PUBLISHABLE_KEY
# Paste: pk_test_YOUR_KEY_HERE
```

**Verify Secrets:**
```bash
wrangler secret list
# Should show:
# STRIPE_SECRET_KEY
# STRIPE_PUBLISHABLE_KEY
```

---

## 📦 Step 2: Create Stripe Products

### In Stripe Dashboard:

1. Go to **Products** → **Add Product**

2. **Standard Plan - $19/month**
   - Name: "MyPasswordChecker Standard"
   - Description: "3,000 password checks per month"
   - Price: $19.00 USD, monthly recurring
   - Click **Save**
   - Copy **Price ID** (starts with `price_...`)

3. **Quantum Monthly Plan - $150/month**
   - Name: "MyPasswordChecker Quantum"
   - Description: "15,000 password checks + 1,500 quantum estimates per month"
   - Price: $150.00 USD, monthly recurring
   - Click **Save**
   - Copy **Price ID**

4. **Quantum Single - $1.00**
   - Name: "Quantum Estimate (Single)"
   - Description: "One-time quantum resistance estimate"
   - Price: $1.00 USD, one-time payment
   - Click **Save**
   - Copy **Price ID**

### Add Price IDs to wrangler.toml

```toml
# Add to [vars] section in wrangler.toml

[vars]
# ... existing vars ...

# Stripe Price IDs
STRIPE_PRICE_STANDARD = "price_YOUR_STANDARD_ID"
STRIPE_PRICE_QUANTUM_MONTHLY = "price_YOUR_QUANTUM_MONTHLY_ID"
STRIPE_PRICE_QUANTUM_SINGLE = "price_YOUR_SINGLE_ID"
```

---

## 🛒 Step 3: Add Stripe Checkout to API

### A. Create Checkout Session Endpoint

```javascript
// POST /api/create-checkout-session
// Creates Stripe Checkout for plan upgrade

async function createCheckoutSession(request, env) {
  // Validate session
  const auth = await requireAuth(request, env);
  if (!auth.valid) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { price_id } = await request.json();

  // Get user from D1
  const user = await env.DB.prepare(
    'SELECT * FROM api_keys WHERE customer_id = ?'
  ).bind(auth.customer_id).first();

  // Create or get Stripe customer
  let stripeCustomerId = user.stripe_customer_id;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        customer_id: user.customer_id,
        api_key: user.api_key
      }
    });
    stripeCustomerId = customer.id;

    // Save to D1
    await env.DB.prepare(
      'UPDATE api_keys SET stripe_customer_id = ? WHERE customer_id = ?'
    ).bind(stripeCustomerId, user.customer_id).run();
  }

  // Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: price_id === env.STRIPE_PRICE_QUANTUM_SINGLE ? 'payment' : 'subscription',
    line_items: [{ price: price_id, quantity: 1 }],
    success_url: `${env.DOMAIN}/dashboard?success=true`,
    cancel_url: `${env.DOMAIN}/pricing`,
    metadata: {
      customer_id: user.customer_id
    }
  });

  return new Response(JSON.stringify({ checkout_url: session.url }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### B. Add Webhook Handler

```javascript
// POST /api/webhooks/stripe
// Stripe sends events here when payments occur

async function handleStripeWebhook(request, env) {
  const sig = request.headers.get('stripe-signature');
  const body = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;

      // Update user plan in D1
      await env.DB.prepare(
        'UPDATE api_keys SET plan = ?, stripe_subscription_id = ?, subscription_status = ? WHERE customer_id = ?'
      ).bind(
        getPlanFromPriceId(session.line_items.data[0].price.id),
        session.subscription,
        'active',
        session.metadata.customer_id
      ).run();
      break;

    case 'customer.subscription.deleted':
      const subscription = event.data.object;

      // Downgrade to free plan
      await env.DB.prepare(
        'UPDATE api_keys SET plan = ?, subscription_status = ? WHERE stripe_subscription_id = ?'
      ).bind('free', 'canceled', subscription.id).run();
      break;

    case 'invoice.payment_failed':
      // Mark subscription as past_due
      const invoice = event.data.object;
      await env.DB.prepare(
        'UPDATE api_keys SET subscription_status = ? WHERE stripe_subscription_id = ?'
      ).bind('past_due', invoice.subscription).run();
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### C. Add Customer Portal Endpoint

```javascript
// POST /api/create-portal-session
// Opens Stripe Customer Portal for subscription management

async function createPortalSession(request, env) {
  const auth = await requireAuth(request, env);
  if (!auth.valid) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401
    });
  }

  const user = await env.DB.prepare(
    'SELECT * FROM api_keys WHERE customer_id = ?'
  ).bind(auth.customer_id).first();

  if (!user.stripe_customer_id) {
    return new Response(JSON.stringify({ error: 'No Stripe customer found' }), {
      status: 400
    });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${env.DOMAIN}/dashboard`
  });

  return new Response(JSON.stringify({ portal_url: session.url }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

---

## 🎨 Step 4: Update Dashboard UI

Add these buttons to the dashboard:

```html
<!-- In dashboard.html, inside the "Current Plan" card -->

<div class="checker-card" style="margin-bottom: 2rem;">
    <h2 style="margin-bottom: 1rem;">📊 Current Plan</h2>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
        <div>
            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Plan</div>
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary-color);" id="current-plan">Free</div>
        </div>
        <div>
            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Monthly Cost</div>
            <div style="font-size: 1.5rem; font-weight: 700;" id="monthly-cost">$0</div>
        </div>
        <div>
            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Status</div>
            <div style="font-size: 1.5rem; font-weight: 700;" id="subscription-status">Active</div>
        </div>
    </div>

    <!-- Plan Management Buttons -->
    <div style="margin-top: 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap;">
        <!-- Show upgrade button if on free/standard plan -->
        <button id="upgrade-btn" class="btn btn-primary" onclick="showUpgradeOptions()">
            ⬆️ Upgrade Plan
        </button>

        <!-- Show manage subscription button if has active subscription -->
        <button id="manage-subscription-btn" class="btn btn-secondary" onclick="openCustomerPortal()" style="display: none;">
            ⚙️ Manage Subscription
        </button>
    </div>
</div>

<!-- Upgrade Modal (Hidden by default) -->
<div id="upgrade-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center;">
    <div style="background: white; padding: 2rem; border-radius: 0.75rem; max-width: 600px; margin: 2rem;">
        <h2 style="margin-bottom: 1rem;">Upgrade Your Plan</h2>

        <div style="display: grid; gap: 1rem; margin-bottom: 1.5rem;">
            <!-- Standard Plan -->
            <div class="pricing-card" onclick="upgradeToPlan('standard')" style="cursor: pointer; border: 2px solid var(--border-color);">
                <h3>Standard - $19/month</h3>
                <p>3,000 password checks per month</p>
            </div>

            <!-- Quantum Plan -->
            <div class="pricing-card" onclick="upgradeToPlan('quantum_monthly')" style="cursor: pointer; border: 2px solid var(--primary-color);">
                <h3>Quantum Monthly - $150/month</h3>
                <p>15,000 password checks + 1,500 quantum estimates</p>
            </div>
        </div>

        <button class="btn btn-secondary" onclick="closeUpgradeModal()">Cancel</button>
    </div>
</div>

<script>
// Show upgrade options modal
function showUpgradeOptions() {
    document.getElementById('upgrade-modal').style.display = 'flex';
}

function closeUpgradeModal() {
    document.getElementById('upgrade-modal').style.display = 'none';
}

// Upgrade to selected plan
async function upgradeToPlan(plan) {
    const priceIds = {
        'standard': 'price_YOUR_STANDARD_ID',  // From wrangler.toml
        'quantum_monthly': 'price_YOUR_QUANTUM_ID'
    };

    try {
        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ price_id: priceIds[plan] })
        });

        const data = await response.json();

        if (data.checkout_url) {
            // Redirect to Stripe Checkout
            window.location.href = data.checkout_url;
        } else {
            alert('Error creating checkout session');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        alert('Failed to start checkout');
    }
}

// Open Stripe Customer Portal
async function openCustomerPortal() {
    try {
        const response = await fetch('/api/create-portal-session', {
            method: 'POST',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.portal_url) {
            window.location.href = data.portal_url;
        } else {
            alert('Error opening customer portal');
        }
    } catch (error) {
        console.error('Portal error:', error);
        alert('Failed to open customer portal');
    }
}

// Show/hide buttons based on plan
function updatePlanButtons(plan, hasSubscription) {
    const upgradeBtn = document.getElementById('upgrade-btn');
    const manageBtn = document.getElementById('manage-subscription-btn');

    if (plan === 'free') {
        upgradeBtn.style.display = 'block';
        manageBtn.style.display = 'none';
    } else {
        upgradeBtn.style.display = hasSubscription ? 'none' : 'block';
        manageBtn.style.display = hasSubscription ? 'block' : 'none';
    }
}
</script>
```

---

## 🔗 Step 5: Set Up Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. **Endpoint URL:** `https://mypasswordchecker.com/api/webhooks/stripe`
4. **Events to send:**
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_...`)

### Add Webhook Secret:

```bash
wrangler secret put STRIPE_WEBHOOK_SECRET
# Paste: whsec_YOUR_WEBHOOK_SECRET
```

---

## 🧪 Testing Checklist

### Test Authentication:
- [ ] Can't access dashboard without login
- [ ] Login with valid API key works
- [ ] Login with invalid API key fails
- [ ] Session expires after 24 hours
- [ ] Logout works and destroys session

### Test Stripe Integration:
- [ ] Upgrade to Standard plan redirects to Stripe
- [ ] Complete payment in Stripe test mode
- [ ] Webhook updates plan in D1 database
- [ ] Dashboard shows updated plan
- [ ] "Manage Subscription" button appears
- [ ] Customer Portal opens and allows cancellation

### Stripe Test Cards:
```
Success: 4242 4242 4242 4242
Declined: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
```

---

## 📋 Implementation Checklist

When you provide Stripe keys, I'll implement:

### Phase 1: Dashboard Security (Critical)
- [ ] Create sessions table in D1
- [ ] Add `POST /api/auth/login` endpoint
- [ ] Add `POST /api/auth/logout` endpoint
- [ ] Add `GET /api/auth/me` endpoint (check session)
- [ ] Update dashboard.html with login form
- [ ] Add session validation to all protected endpoints
- [ ] Remove localStorage API key storage

### Phase 2: Stripe Integration
- [ ] Add Stripe secrets to Workers
- [ ] Create Stripe products/prices
- [ ] Add `POST /api/create-checkout-session`
- [ ] Add `POST /api/webhooks/stripe`
- [ ] Add `POST /api/create-portal-session`
- [ ] Update dashboard UI with upgrade buttons
- [ ] Set up webhook in Stripe Dashboard

### Phase 3: Testing
- [ ] Test login flow
- [ ] Test session expiration
- [ ] Test plan upgrades
- [ ] Test webhook delivery
- [ ] Test subscription cancellation

---

## 🚀 Quick Start When Ready

**Tell me:**
1. Your Stripe **Publishable Key** (pk_test_... or pk_live_...)
2. Your Stripe **Secret Key** (sk_test_... or sk_live_...)
3. Do you want to create the Stripe products yourself, or should I guide you through it?

**I'll then:**
1. ✅ Add secure authentication to dashboard
2. ✅ Integrate Stripe Checkout
3. ✅ Set up webhook handler
4. ✅ Add upgrade/downgrade buttons
5. ✅ Test complete flow
6. ✅ Deploy to production

---

**Document Version:** 1.0
**Last Updated:** January 2025
**Status:** Ready to implement when Stripe keys provided
