# Black Friday 2025 Coupon Setup Instructions

## Stripe Dashboard Setup

### 1. Login to Stripe Dashboard
Go to: https://dashboard.stripe.com/coupons

### 2. Create Coupons

#### Coupon 1: $1 Premium 25% Off
- **Name**: Black Friday 2025 - $1 Premium
- **Coupon ID**: `BF2025_DOLLAR`
- **Type**: Percentage discount
- **Discount**: 25%
- **Duration**: Once
- **Applies to**: One-time payments only
- **Redemption limit**: 1000 uses
- **Valid dates**: Nov 28, 2025 - Dec 2, 2025 (5 days)

**Final price**: $1.00 → $0.75

#### Coupon 2: API Tiers 25% Off First Month
- **Name**: Black Friday 2025 - API Monthly
- **Coupon ID**: `BF2025_API`
- **Type**: Percentage discount
- **Discount**: 25%
- **Duration**: Once (first invoice only)
- **Applies to**: Subscriptions
- **Products**: Standard ($12), Basic Quantum ($29), Standard Quantum ($49)
- **Redemption limit**: 500 uses
- **Valid dates**: Nov 28, 2025 - Dec 2, 2025

**Final prices (first month only)**:
- Standard: $12 → $9
- Basic Quantum: $29 → $21.75
- Standard Quantum: $49 → $36.75

#### Coupon 3: Super Quantum 50% Off First Month
- **Name**: Black Friday 2025 - Super Quantum
- **Coupon ID**: `BF2025_SUPER`
- **Type**: Percentage discount
- **Discount**: 50%
- **Duration**: Once (first invoice only)
- **Applies to**: Subscriptions
- **Products**: Super Quantum Monthly ($295), Super Quantum Annual ($2,950)
- **Redemption limit**: 100 uses
- **Valid dates**: Nov 28, 2025 - Dec 2, 2025

**Final prices (first month/year only)**:
- Super Quantum Monthly: $295 → $147.50
- Super Quantum Annual: $2,950 → $1,475

## Frontend Integration

### Add Coupon Input to Checkout

Already implemented in `/api/create-checkout-session` - Stripe automatically applies coupons when users enter the code.

### Promotion Banner (Add to pricing.html)

```html
<!-- Black Friday Banner - Add at top of pricing section -->
<div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 1.5rem; border-radius: 0.75rem; text-align: center; margin-bottom: 2rem;">
    <h3 style="margin: 0 0 0.5rem 0; font-size: 1.5rem;">🎉 Black Friday Sale - Nov 28 - Dec 2</h3>
    <p style="margin: 0; font-size: 1.125rem;">
        <strong>25% off</strong> $1 Premium & API tiers • <strong>50% off</strong> Super Quantum
    </p>
    <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; opacity: 0.9;">
        Use codes: <code style="background: rgba(0,0,0,0.2); padding: 0.25rem 0.5rem; border-radius: 0.25rem;">BF2025_DOLLAR</code> •
        <code style="background: rgba(0,0,0,0.2); padding: 0.25rem 0.5rem; border-radius: 0.25rem;">BF2025_API</code> •
        <code style="background: rgba(0,0,0,0.2); padding: 0.25rem 0.5rem; border-radius: 0.25rem;">BF2025_SUPER</code>
    </p>
</div>
```

## Marketing Posts

### Twitter/X Post (Nov 28, 8am PST)

```
🚨 BLACK FRIDAY: Quantum-Safe Security for Less

25% OFF $1 Premium Tool ($0.75!)
✓ Grover algorithm analysis
✓ Phonetic password generator
✓ 24-hour unlimited access

25-50% OFF API Tiers
✓ Post-quantum crypto (Kyber, Dilithium)
✓ Domain verification included
✓ First month/year discount

Code: BF2025_DOLLAR | BF2025_API | BF2025_SUPER

https://mypasswordchecker.com/pricing

#BlackFriday #PostQuantum #CyberSecurity
```

### Hacker News Post (Nov 28)

**Title**: Show HN: MyPasswordChecker.com - Black Friday: 25% off quantum-resistant password tools + PQ crypto API

**Body**:
```
Hey HN! I built MyPasswordChecker.com - a privacy-first password strength checker with Grover algorithm quantum resistance estimates.

For Black Friday (Nov 28-Dec 2), I'm offering:

• $1 Premium → $0.75 (25% off) - 24-hour access to quantum analysis + phonetic generator
• API tiers 25-50% off first month - includes Kyber-512 & Dilithium key generation

Everything runs client-side for maximum privacy. No passwords ever leave your browser.

New features:
- Post-quantum cryptography API (Kyber-512, Dilithium signatures)
- Phonetic password generator with entropy slider
- Domain verification for API security
- 4 usage tiers from free to enterprise

Tech stack: Cloudflare Workers + D1, Stripe, vanilla JS. All code is privacy-first.

Try it: https://mypasswordchecker.com
API docs: https://mypasswordchecker.com/password-api

Would love feedback from the community!
```

### Reddit Posts

**r/programming**, **r/netsec**, **r/webdev**

Same content as HN but add:
```
Black Friday discount codes in comments ↓
```

Then comment:
```
Black Friday codes (Nov 28-Dec 2):
- BF2025_DOLLAR: $1 → $0.75 (25% off premium)
- BF2025_API: 25% off API tiers first month
- BF2025_SUPER: 50% off Super Quantum first month

All tools run 100% client-side. Your passwords never touch my servers.
```

## Analytics Tracking

Monitor in Stripe Dashboard:
- Coupon redemptions per day
- Revenue vs. discount amount
- Conversion rate (visitors → paying customers)

Target: 50+ $1 purchases, 10+ API subscriptions during 5-day period.
