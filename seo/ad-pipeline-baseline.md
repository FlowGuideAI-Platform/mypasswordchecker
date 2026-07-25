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

## Phase 3 regression checklist (must match this baseline)

- [ ] Both creatives load (200) from their unchanged `/ads/...` URLs in the new right rail.
- [ ] Iframes still same-origin (no sandbox attr that blocks `parent.*` access).
- [ ] `/js/ad-tracking.js` still loaded by the rebuilt homepage before user can click.
- [ ] Click inside each creative fires POST `/api/track-click` → 200 `{ok:true}` with the
      same payload shape and `banner_id` values.
- [ ] `utm_term` still appended to outbound href when traffic source is known.
- [ ] Network tab silent while typing in the checker (rule 4).
