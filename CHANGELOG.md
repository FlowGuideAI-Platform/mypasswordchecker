# Changelog

All notable changes to MyPasswordChecker.com are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/).

## [2026-06-01]

### Fixed
- **Root cause of the aac2.com API outage / customer-base collapse:** the
  `api_keys` table was missing the `quantum_limit/used`, `phonetic_limit/
  used`, `breach_limit/used` columns that the worker's paid-tier INSERT
  references. Every paid-key creation has been silently failing with
  `no such column` since whenever those INSERTs were added. Fixed with
  `migrations/d1-add-pq-quotas.sql` (additive ALTER TABLE only).
- Stripped the rest of the stale `$295` / `$75` / `$150` / `$2,950` etc.
  pricing copy from `pricing.html`, `password-api.html`, `about.html`,
  and `api-docs.html`; corrected Super Quantum quotas (6M → 10M checks,
  600K → 1M quantum + phonetic) and dropped XL Quantum to $60, Super to
  $99 per spec §4.

### Added — Developer Dashboard rebuild P1 (foundation)
Following the `CC BUILD PROMPT — Rebuild MyPasswordChecker Developer
Dashboard` spec. P1 only; P2–P6 land in subsequent commits.
- `public/js/pricing.js` — single source of truth for the API tier
  catalog (spec §4). Exports `window.Pricing.TIERS`,
  `Pricing.tierById/tierByLevel`, `Pricing.formatPrice`. Dashboard
  reads from this; future surfaces should too so prices can't drift.
- `POST /api/auth/register` — thin worker wrapper for the dashboard's
  email-register form. Same internal flow as `/api/create-free-api-key`
  but accepts `{email, name}` (no domain up front). Free tier is
  created active immediately; P6 re-introduces email-verification
  gating once the EMAIL binding is configured.
- `public/dashboard.html` JS rewired to API-key-as-credential
  (spec §3): API key stored in `localStorage`, sent as `X-API-Key`
  header or `?api_key=…` query param. All `credentials: 'include'`
  cookie-session reliance removed. Replaced `/api/auth/login` and
  `/api/auth/me` with localStorage + `/api/verify-api-key`. Plan
  names + monthly costs sourced from `Pricing.tierByLevel(data.tier)`
  instead of stale hardcoded maps.
- `public/js/domains.js` ported off cookie sessions to the same
  API-key model; rewired `/api/domains/{add,verify,list}` to the
  worker's actual paths `/api/dashboard/{add,verify,get}-domain`.
- Upgrade buttons relabeled with current permanent prices ($2.50 /
  $5 / $20 / $40 / $60 / $99); the dead `super_quantum_annual` and
  `$1 Premium` buttons removed. Until P3 wires Stripe Checkout +
  PayPal subscriptions, the upgrade button just lands the user on
  `/pricing.html`.
- Overage Protection panel hidden (P5 re-enables); admin panel
  remains hidden (P5). The wrapper that fired `/api/admin/check` +
  `/api/dashboard/overage-setting` on every dashboard load is gated
  off so the console isn't spammed with 404s in the meantime.
- All dashboard rendering switched to DOM methods (`textContent`,
  `createElement`) rather than `innerHTML`, so any worker-supplied
  string is safe regardless of upstream validation.

P1 acceptance verified end-to-end against the live API:
`/api/auth/register` → `{api_key, tier:0, status:'active'}` ✓ ·
`/api/verify-api-key` → `{valid:true, tier:0}` ✓ ·
`/api/dashboard/usage` → tier + quota_used/limit ✓ ·
`/api/dashboard/get-domains` ✓ ·
`/api/dashboard/add-domain` → verification token issued ✓.

### Added — Developer Dashboard rebuild P2 (IP allowlist)
- `migrations/d1-ip-verification.sql` — new `ip_verifications` table
  (pending/verified workflow); existing `api_keys.allowed_ips` holds
  the JSON allowlist consulted on `/api/verify-api-key`.
- Worker: `/api/dashboard/{add,verify,get}-ips` (mirrors the domain
  pattern). `verify-ip` requires the request to come *from* the
  claimed IP — `CF-Connecting-IP` proves ownership.
- `handleVerifyAPIKey` (both KV-cache and D1 paths) now rejects
  requests with `CF-Connecting-IP` outside `allowed_ips` (403).
  Cached payload carries `allowed_ips` so enforcement doesn't cost
  an extra D1 read.
- `/domains.html` renamed "Domain & IP Verification"; new IP section
  with curl example for the verify step.

### Added — Developer Dashboard rebuild P3 (recurring subscriptions)
- Stripe Checkout (mode:subscription) for tiers $20+:
  `/api/create-checkout-session`, `/api/create-portal-session`.
  Existing `/api/stripe/webhook` extended with `checkout.session.
  completed`, `customer.subscription.{created,updated,deleted}`,
  and `invoice.payment_failed`. Tier comes from
  `price.metadata.tier` — no hardcoded price IDs in code.
- PayPal recurring subscriptions for tiers under $10 (Standard,
  Basic Quantum) — better net at micropayment pricing:
  `/api/paypal/create-subscription`, `/api/paypal/webhook` (PayPal's
  /v1/notifications/verify-webhook-signature), and
  `/api/paypal/cancel-subscription`.
- Dashboard `upgradePlan` dispatches by `tier.processor` from
  `pricing.js` (single source). `manageSubscription` opens the
  Stripe Customer Portal or runs PayPal cancel based on the key's
  `payment_processor`. Handles `?upgrade=success|cancel` return
  params from hosted checkouts.
- `tierQuotas(tier)` shared by both webhook rails so quotas can't
  drift between Stripe and PayPal activations.
- Setup scripts: `scripts/stripe-setup.md`, `scripts/paypal-setup.md`.

### Added — Developer Dashboard rebuild P4 (GitHub OAuth)
- Worker: `GET /api/auth/github` (CSRF state in `SESSION_CACHE`,
  redirect to GitHub authorize) + `GET /api/auth/github/callback`
  (validate state, exchange code, fetch primary verified email, look
  up or create a free-tier api_keys row, redirect to
  `/dashboard.html#token=<api_key>`).
- Dashboard load handler reads the `#token=…` hash, stores it in
  localStorage, strips the hash. Surfaces `?error=oauth_failed |
  invalid_state | no_email` return params.
- Setup script: `scripts/github-oauth-setup.md` (OAuth app
  registration + GITHUB_CLIENT_ID/SECRET).

### Added — Developer Dashboard rebuild P5 (admin + overage)
- `migrations/d1-overage.sql` — `api_keys.overage_blocked INTEGER
  DEFAULT 1` (safe default — 429 past quota unless owner opts in).
- Admin endpoints (Authorization: Bearer ADMIN_TOKEN):
  `/api/admin/check`, `/api/admin/domain-alerts`,
  `/api/admin/unverified-users`, `/api/admin/domain-alerts/<id>/
  update`, `/api/admin/resend-verification`.
- Overage endpoints (owner): `GET/POST /api/dashboard/
  overage-setting`. `allow_overage` (API contract) is inverse of
  `overage_blocked` (database). KV cache busted on POST.
- `handleVerifyAPIKey` (both paths) honors `overage_blocked`: past
  quota with `overage_blocked=0` returns `valid:true,
  over_quota:true` instead of 429.
- Dashboard: re-enabled the Overage Protection card; the
  `loadUsageData` wrapper that calls overage + admin checks is back.
  All admin fetches send `Authorization: Bearer <ADMIN_TOKEN>` from
  `sessionStorage`; a small "Enter admin token" link below the API
  key triggers a prompt to store it.

### Added — Developer Dashboard rebuild P6 (email via Resend)
- `sendEmail()` rewritten to POST `https://api.resend.com/emails`.
  Same `(env, to, subject, html, text)` signature so call sites
  don't change. When `RESEND_API_KEY` isn't set, the helper logs
  `email_send_skipped_no_provider` and returns false — register
  still issues the api_key, nothing throws.
- Setup script: `scripts/email-resend-setup.md`.

## [2026-05-31]

### Fixed
- **Phonetic password generator on `/generate-phonetic`** was returning
  "Endpoint not found" — the page was calling `/api/v1/generate-phonetic-
  password`, an endpoint that doesn't exist. Removed the dead API
  authorization step; the tool now generates client-side via
  `PhoneticGenerator.generateMultiple`, matching how `/premium` already
  does it. (Premium is free for everyone, no quota gate to check.)
- **`/free-password-checker` was loading `/js/password-checker.js`
  which 404'd**, leaving the strength meter, crack-time display, and
  feedback panel completely inert. Created the missing file with
  DOM-based rendering (`textContent` / `createElement` rather than
  `innerHTML`) so it's safe against any zxcvbn feedback strings.

### Changed
- Stripped the remaining `$1` / `($1 one-time)` / `Premium access ($1)`
  language from `/free-password-checker` body copy and footer.
- Footer "Tools" menu across all main pages: "Quantum Estimate" relabeled
  to "Premium Tools" to match the page's actual content (three tools, not
  just quantum).

## [2026-05-19]

### Changed
- `/generate-phonetic`: removed the on-page Pricing block (Quantum / Standard
  / Pay-per-use figures no longer matched the permanent tiers).
- `/free-password-checker`: "Premium Access ($1)" button now reads
  "Premium Tools" and links to `/premium` with no dollar amount. The two
  older JS-rendered ads at the bottom were replaced with the same
  ForgeMCP + FlowGuideAI iframe creatives as the homepage, and
  `ad-tracking.js` is now loaded so origin attribution works there too.
- `/about`: API tier pricing in the "Can I use this for my business?"
  FAQ refreshed to the permanent rates and doubled Quantum-tier quotas;
  "Premium Tools ($1)" feature box commented out (preserved for
  restoration); "Why does the premium version cost $1?" FAQ rewritten
  as "What's included in the Premium tools?" — pricing language stripped,
  tool descriptions kept and expanded to cover all three tools (quantum
  analysis, phonetic generator, breach check) for AEO/SEO clarity.
- `/premium`: title and meta description rewritten to cover all three
  tools (quantum, phonetic, breach); og / twitter tags refreshed;
  JSON-LD `WebApplication` schema added; added to `sitemap.xml`; removed
  from the `robots.txt` Disallow list (premium is free for everyone).
- Header nav on every public page: Premium link added next to Free Tool.
- Corner-link carousel: Premium inserted into the ring between Free Tool
  and Developer API, so the ring is now Home → Free Tool → Premium →
  Developer API → Docs → Pricing → About → Home.

## [2026-05-18]

### Changed
- **Pricing is now permanent.** The launch-promo prices ($2.50 / $5 / $20 /
  $40 / $75 / $150 per month) are now the standing prices on `pricing.html`
  and `password-api.html` — no more "50% OFF" / strikethrough / revert logic.
- **API quotas doubled on the Quantum tiers** (Standard Quantum, Large, XL,
  Super) across the pricing pages, the comparison table, and the API worker's
  tier-assignment logic. Standard and Basic Quantum quotas unchanged.
- **Premium tools are free for everyone.** The payment gate on `premium.html`
  is neutralized — `verifyPayment()` grants access to all visitors. The
  original PayPal/Stripe logic is preserved verbatim in a block comment for
  later restoration.
- **API worker tier thresholds re-keyed** to the new permanent prices; the old
  thresholds would have mis-tiered every new payment.
- Homepage: hero tagline split into three lines; password checker moved above
  the Recommended Security Tools section; premium CTA de-promo'd with buttons
  linking directly to the tool pages.
- Quantum tiers now advertise breach checks alongside the existing PQ-key
  generation lines.

### Added
- Corner-link page carousel — prev/next links in the top and bottom corners of
  the six main pages, cycling as a ring: Home → Free Tool → Developer API →
  Docs → Pricing → About → Home.
- Privacy-respecting ad click tracking — clicks on the ForgeMCP / FlowGuideAI
  banners are logged to a new `ad_clicks` D1 table with no PII (no IP, no
  cookies, no identifiers). The visitor's traffic origin (Google, Claude,
  direct, …) is captured once per session and appended to the outbound link
  as `utm_term`, so it carries through to FlowGuideAI / ForgeMCP for
  conversion attribution.
- New rotating combo banner (ForgeMCP + FlowGuideAI) on the Premium page,
  replacing the previous horizontal ad.
- Hidden `/numbers` analytics dashboard — API-key gated, `noindex` and
  disallowed in `robots.txt` — showing clicks by banner, traffic source, and
  placement. Worker endpoints `/api/track-click` and `/api/ad-analytics`
  added to the existing API worker.

### Removed
- Promotional banners and their countdown / auto-revert scripts from
  `index.html`, `premium.html`, `pricing.html`, and `password-api.html`.

## [2026-05-17]

### Added
- 301 redirects for the alternate domains (`mypasswordcheck.com`,
  `myquantumpasswordchecker.com`, `quantumpasswordchecker.com`) — apex and
  `www` both redirect to `https://mypasswordchecker.com`, preserving path and
  query, so search engines see one canonical destination.
- Two new homepage ad units — ForgeMCP and the redesigned FlowGuideAI creative
  (self-contained 300×250 HTML, served from `/ads/`).
- `wrangler-static.toml` — deploy config for the `mypasswordchecker-main`
  static-assets worker (the repo previously had no current config for it).
- `/security` page added to `sitemap.xml`.

### Changed
- Replaced both homepage ad slots with static iframe creatives, scaled to fill
  the full width of their grid column.
- Trimmed every meta description to ≤159 characters (Bing flagged over-length
  metadata); shortened the `index` and `free-password-checker` titles to fit
  Google's ~60-character display width.
- Retargeted `free-password-checker.html` to "how strong is my password" query
  intent to reduce keyword cannibalization with the homepage.
- `sitemap.xml` rewritten to extensionless URLs with current `lastmod` dates.

### Fixed
- Ad creatives were clipping their own content — raised the ad box height from
  250px to 350px so the CTA bars are no longer cut off.
- `robots.txt`: fixed a bot-group scoping bug where the `Disallow` rules
  applied only to YandexBot, leaving Googlebot/Bingbot free to crawl paywalled
  and `/api/` paths.

### Removed
- `robots.txt` `Crawl-delay` directive — its launch-protection purpose had
  passed and it was slowing Bing/Yandex indexing.
