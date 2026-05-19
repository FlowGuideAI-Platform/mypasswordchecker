# Changelog

All notable changes to MyPasswordChecker.com are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/).

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
