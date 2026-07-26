# Ad Pipeline Baseline — Phase 0 (2026-07-25)

Reference record for the Phase 3 regression check. The ad pipeline is the live lead
funnel (global rule 2) — the redesign moves the two slots into the right rail but the
creatives and tracking wiring below must survive unchanged.

## Slots (current, pre-redesign)

Two 300×250 same-origin iframes in `public/index.html` (`section.ad-section`, lines ~299–308):

| Slot ID | Creative URL | Live status | Size |
|---|---|---|---|
| `index-ad-banner-1` | `/ads/forgemcp-ad-300x250` | 200 | 14,757 B |
| `index-ad-banner-2` | `/ads/fgai-ad-300x250-redesigned` | 200 | 17,233 B |

Slots are static iframes (no JS render); a small inline script scales each 300×250
creative up to slot width. A third creative, `/ads/rotating-combo-ad.html`, is used by
`premium.html` only — not part of the homepage move.

## Click-tracking wiring (inside each creative)

1. Page-level: `/js/ad-tracking.js` (loaded by `index.html:447`) sets
   `sessionStorage.mpc_traffic_source` + `mpc_traffic_source_time` once per session.
2. Creative-level: every `a[href]` in the creative gets a click listener that calls
   `track(BANNER_ID, anchor)`:
   - Reads context via **`parent.sessionStorage`** and **`parent.location.pathname`**
     → the iframes MUST remain same-origin or tracking silently dies (the `try/catch`
     swallows the SecurityError).
   - Fires `navigator.sendBeacon('/api/track-click', Blob<application/json>)` with payload:
     ```json
     {
       "banner_id": "forgemcp" | "flowguideai",
       "placement": "homepage",
       "timestamp": "<ISO 8601>",
       "user_agent_type": "desktop|mobile|tablet",
       "traffic_source": "<from sessionStorage or 'unknown'>",
       "time_on_site": <seconds | null>
     }
     ```
   - Appends `utm_term=<traffic_source>` to the outbound href for downstream attribution.

`BANNER_ID` values: `forgemcp` (forgemcp-ad-300x250.html:314), `flowguideai`
(fgai-ad-300x250-redesigned.html:183).

## Server side

`workers/mypasswordchecker-api.js` → `handleTrackClick` (line 1900): validates
`banner_id` against `AD_BANNER_IDS = ['flowguideai', 'forgemcp']` and requires
`placement`; inserts a row into D1 table `ad_clicks`; returns `{ ok: true }` 200.

## Baseline verification (2026-07-25)

- Both creative URLs return 200 on the live site (sizes above).
- End-to-end beacon test: POST to `https://mypasswordchecker.com/api/track-click`
  replicating the sendBeacon payload with `banner_id: "forgemcp"` returned
  **HTTP 200 `{ "ok": true }`**.
  - The test row is filterable: `placement = 'phase0-audit'`, `traffic_source =
    'phase0-audit'` — exclude it from real funnel counts.

## Rail prep (2026-07-25, post-baseline)

Tracked production copies of the redesign rail creatives exist at
`/ads/forgemcp-300x250`, `/ads/flowguideai-300x250`, `/ads/suggestibility-300x250`
(handoff creatives + the same beacon block + `utm_source=mypasswordchecker&utm_medium=house&utm_campaign=rail`).
`AD_BANNER_IDS` now includes `suggestibility` — **requires an API-worker deploy**
(`wrangler.toml`) before suggestibility clicks record; until then they 400 (harmless,
nothing serves that creative yet). The Phase 3 rail should iframe these three; the two
legacy creatives stay untouched until the old slots are removed.

## Phase 3 regression results (2026-07-25, local wrangler dev + Playwright)

- PASS — typing 17 chars in the checker fired **zero** network requests (beacons/fetch/XHR).
- PASS — click inside a rail creative fired `POST /api/track-click` (405 locally where no API
  worker runs; the production endpoint returned 200 `{ok:true}` for the same payload earlier today)
  and appended `utm_term=direct` from the parent's sessionStorage — same-origin access intact.
- PASS — exactly two bright-accent fields on the page: `.meter-fill` and `.cell-quantum`
  (`.btn-primary` is a design-system component, per the prototype's own stylesheet).
- PASS — mobile 390×844: input bottom at 360px (above fold), Show/Hide 44px, visual order
  matches README §2 exactly.
- Owner copy changes vs the handoff (Jack, 2026-07-25): FGAI creative's Databricks badge →
  "MINUTES, NOT DAYS / answer guided questions, get a finished draft" (FGAI teal); rail heading
  "Also from All Aligned Consulting" → "More tools we build".
- Legacy creatives (`forgemcp-ad-300x250`, `fgai-ad-300x250-redesigned`, `rotating-combo-ad`)
  remain in /ads/ — premium.html still uses rotating-combo; the other two are now unreferenced
  by the homepage (kept until premium's next-round redesign).

## Phase 3 regression checklist (must match this baseline)

- [ ] Both creatives load (200) from their unchanged `/ads/...` URLs in the new right rail.
- [ ] Iframes still same-origin (no sandbox attr that blocks `parent.*` access).
- [ ] `/js/ad-tracking.js` still loaded by the rebuilt homepage before user can click.
- [ ] Click inside each creative fires POST `/api/track-click` → 200 `{ok:true}` with the
      same payload shape and `banner_id` values.
- [ ] `utm_term` still appended to outbound href when traffic source is known.
- [ ] Network tab silent while typing in the checker (rule 4).
