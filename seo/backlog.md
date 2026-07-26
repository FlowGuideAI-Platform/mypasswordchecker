# SEO / redesign backlog

Standing reminder: **re-pull the GSC report quarterly** (next: late October 2026,
alongside the last recovery-tracking row) and re-check every trigger below.

## Success gates for the rebuild (check against recovery-tracking.csv)

- `.html` / `www` / `free-password-checker` variants out of GSC Pages report — 4–6 weeks
- `/password-cracker-test` impressions > 0 — 2 weeks (Bing first via IndexNow)
- `/generate-phonetic` CTR > 0% — 4 weeks
- Crack-time-cluster CTR > 0% — 6 weeks
- Homepage position/CTR not degraded at 4 weeks. **D1 guardrail:** if homepage CTR
  drops >20% with stable position, revisit the homepage title (crack-time title
  variant is documented in DESIGN.md §3.3).

## Triggers and investigations

- **Quantum-domain split**: when "quantum password checker" variants clear
  ~500 impressions/quarter (52/7mo at baseline), revisit a dedicated
  quantumpasswordchecker.com build. Until then the 301s stay.
- **Thailand**: #2 country by clicks (43 from 85 impressions, 50.6% CTR @ pos 4.5).
  Filter GSC to TH and read the actual query list before acting — could be an
  under-served segment worth a page, could be one navigational term.
- **/breach-check page candidate**: ~28 impressions across "password hack checker"
  variants. Breach check currently lives on /premium; a dedicated landing page
  would target the cluster properly.

## Ads

- **suggestibility.ai violet recolor**: the live creative uses interim blue
  #3B82F6 (five occurrences in public/ads/suggestibility-300x250.html — see the
  ad-rail README for the exact list). After the hackathon judging, the brand
  moves to violet (#8B7CF6 was the earlier exploration); update the creative and
  swap the placeholder mark for the real one at suggestibility.ai/brand/…svg.
- Watch `banner_id` splits in the `ad_clicks` D1 table to learn which of the
  three creatives earns clicks before designing a fourth (exclude
  `placement='phase0-audit'` test rows).

## Copy / next-round redesign

- **premium/pricing conflict**: homepage says "free, no sign-up" while /premium
  and paid API tiers exist. Resolve before the next-round /premium, /pricing,
  /password-api redesign (recommendation on record: consumer tools genuinely
  free; paid tiers API-only). Pricing config is the source of truth.
- Next-round pages still on the old design system: /premium, /pricing,
  /password-api, /docs, /about, legal pages. When each migrates: swap
  /css/styles.css → /css/modernist.css (never load both — class collisions),
  reuse .topnav/.site-footer/.domains-strip/checker components.

## Performance (post-rebuild Lighthouse, mobile)

- Gate result: **SEO 100 on all three pages ✓**. Performance: homepage 67 vs 80
  baseline on like-for-like live runs (pre-font-fix). Diagnostics show no
  structural problem: TBT 100–140 ms, CLS 0, TTFB ~220 ms, zero render-blocking
  resources. The deltas come from the richer page (6 lazy ad iframes vs 2,
  Archivo webfont vs system fonts) plus heavy lab-run variance (same URL scored
  66 and 98 in consecutive runs on the preview host).
- Fix shipped 2026-07-26: Archivo self-hosted (public/fonts/archivo-latin.woff2,
  35 KB variable, font-display swap + preload) replacing the Google Fonts
  @import chain; measured +3 to +8 perf points. Re-measure LIVE after the next
  cache purge and update the post-rebuild rows if materially different.
- If GSC/CrUX field data ever shows real LCP/INP issues: next lever is
  async-initializing zxcvbn (822 KB parse) with a graceful pre-load checker
  state — costs the "synchronous on every keystroke" simplicity, so only if
  field data demands it.

## Infrastructure

- **Edge cache rule caches HTML and ignores query strings** — every HTML deploy
  is invisible until a dashboard purge. Either exclude text/html from the cache
  rule, or give the deploy script a purge-capable API token (deploy-static.sh
  has the hook point).
- **Cloudflare "Content Signals" robots.txt preamble** blocks AI crawlers
  (GPTBot, ClaudeBot, CCBot, meta) site-wide. Decide deliberately: that also
  forfeits AI-search referral visibility. Zone-level toggle if unwanted.
- `.html` URLs with query strings bypass the strip-html edge rule (worker 307
  preserves query) — accepted; revisit only if GSC shows such URLs indexed.
