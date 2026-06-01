// public/js/pricing.js  —  NEW FILE
//
// Single source of truth for the API tier catalog.
// Loaded as <script src="/js/pricing.js"> on dashboard.html (and any other
// surface that wants to render plan info), so prices never drift across pages.
//
// `processor` follows the spec §2 split:
//   - 'paypal' for monthly subscription tiers under $10 (cheaper rail)
//   - 'stripe' for monthly subscription tiers $10+ (cheaper rail)
//   - null     for the free tier (no billing)
//
// Quotas mirror the live worker tier-creation block. Per-tier limits feed
// dashboard usage displays AND the worker's INSERT on subscription activation
// (P3); both must agree.

(function (root) {
  var TIERS = [
    { id: 'free',             tier: 0, name: 'Free',             monthly: 0,    checks: 50,         quantum: 0,       phonetic: 0,       breach: 0,      processor: null,     priority_support: false },
    { id: 'standard',         tier: 1, name: 'Standard',         monthly: 2.50, checks: 12000,      quantum: 100,     phonetic: 100,     breach: 0,      processor: 'paypal', priority_support: false },
    { id: 'basic_quantum',    tier: 2, name: 'Basic Quantum',    monthly: 5,    checks: 50000,      quantum: 1000,    phonetic: 1000,    breach: 0,      processor: 'paypal', priority_support: false, pq_keys: 100 },
    { id: 'standard_quantum', tier: 3, name: 'Standard Quantum', monthly: 20,   checks: 300000,     quantum: 10000,   phonetic: 10000,   breach: 2000,   processor: 'stripe', priority_support: false },
    { id: 'large_quantum',    tier: 4, name: 'Large Quantum',    monthly: 40,   checks: 800000,     quantum: 50000,   phonetic: 50000,   breach: 10000,  processor: 'stripe', priority_support: true  },
    { id: 'xl_quantum',       tier: 5, name: 'XL Quantum',       monthly: 60,   checks: 2000000,    quantum: 200000,  phonetic: 200000,  breach: 40000,  processor: 'stripe', priority_support: true  },
    { id: 'super_quantum',    tier: 6, name: 'Super Quantum',    monthly: 99,   checks: 10000000,   quantum: 1000000, phonetic: 1000000, breach: 400000, processor: 'stripe', priority_support: true  }
  ];

  function formatPrice(monthly) {
    if (!monthly) return '$0';
    return monthly === Math.floor(monthly)
      ? '$' + monthly
      : '$' + monthly.toFixed(2);
  }

  function tierById(id) {
    for (var i = 0; i < TIERS.length; i++) if (TIERS[i].id === id) return TIERS[i];
    return null;
  }

  function tierByLevel(level) {
    for (var i = 0; i < TIERS.length; i++) if (TIERS[i].tier === level) return TIERS[i];
    return null;
  }

  root.TIERS = TIERS;
  root.Pricing = {
    TIERS: TIERS,
    formatPrice: formatPrice,
    tierById: tierById,
    tierByLevel: tierByLevel
  };
})(typeof window !== 'undefined' ? window : this);
