# House ad rail — three creatives, two slots, offset rotation

Drop-in package for the right rail of the MyPasswordChecker.com homepage redesign. Three 300×250 house creatives for All Aligned Consulting properties, plus the rotation logic that cycles two slots through them without ever colliding.

```
ad_handoff/
├── README.md                          ← this file
├── rotation.js                        ← vanilla, no dependencies
├── example.html                       ← working demo of the whole rail
├── creatives/
│   ├── forgemcp-300x250.html          ← standalone, self-contained
│   ├── flowguideai-300x250.html
│   └── suggestibility-300x250.html
└── source/                            ← the design-tool originals, for reference
    ├── AdForgeMCP.dc.html
    ├── AdFlowGuideAI.dc.html
    └── AdSuggestibility.dc.html
```

The files in `creatives/` are **plain, self-contained HTML** — open any one in a browser and it renders at 300×250. Use them as iframes, or lift the `<a class="ad">…</a>` block straight into your markup. The `source/` copies are the design-tool originals and are only there if you want to diff.

---

## The rotation rule

> On each tick **exactly one slot flips**, and it takes the creative **neither slot is currently showing**.

Indices are 0, 1, 2 — so the missing one is always `3 - a - b`. That one expression buys three properties:

1. The two slots **never show the same creative.**
2. They **never change at the same moment** — only one flips per tick.
3. The pair walks all six ordered combinations before repeating:
   `(0,1) → (0,2) → (1,2) → (1,0) → (2,0) → (2,1) → (0,1)`

At `INTERVAL = 8000`, something on the rail changes every 8 seconds while any individual creative holds its slot for 16 — long enough to actually be read.

**The transition is a hard cut, deliberately.** Nothing else on this page animates. A cross-fade in the rail would be the only moving thing on screen, and it would pull the eye off the crack-time numerals, which are the entire point of the page.

`rotation.js` also stops the timer when the tab is hidden, and holds the initial pair without cycling under `prefers-reduced-motion`.

## Wiring it up

```html
<link rel="stylesheet" href="rail.css">

<div class="ad-rail">
  <h6>Also from All Aligned Consulting</h6>

  <div class="ad-slot" data-slot="a">
    <div class="ad-creative"><iframe src="creatives/forgemcp-300x250.html"       title="ForgeMCP"></iframe></div>
    <div class="ad-creative"><iframe src="creatives/flowguideai-300x250.html"    title="FlowGuideAI"></iframe></div>
    <div class="ad-creative"><iframe src="creatives/suggestibility-300x250.html" title="suggestibility.ai"></iframe></div>
  </div>

  <div class="ad-slot" data-slot="b">
    <!-- the same three, same order -->
  </div>
</div>

<script src="rotation.js"></script>
<script>initAdRail();</script>
```

```css
.ad-slot     { position: relative; width: 300px; height: 250px; }
.ad-slot + .ad-slot { margin-top: 16px; }
.ad-creative { position: absolute; inset: 0; display: none; }
.ad-creative iframe { width: 300px; height: 250px; border: 0; display: block; }
```

**Order matters.** Both slots must list the creatives in the same order — the rotation addresses them by index.

Inlining the markup instead of using iframes is fine and slightly faster; just note that all three creatives then share the page's CSS cascade, so keep their inline styles intact rather than refactoring them into classes.

## Placement rules (from the redesign — these are not arbitrary)

1. **The rail sits below the answer**, beside the Developer API strip — never between the checker and the result. A visitor reading their own crack time should not have an ad in that path.
2. **The heading is "Also from All Aligned Consulting."** Not "Sponsored," not "Ads." These are first-party products from the same named operator, and on a *security* site that distinction is worth real trust. Framing them as third-party advertising actively costs you.
3. **Two slots. Do not add a third.** Three stacked 300×250s is 750px of house advertising in a column beside the one element on the page with revenue attached to it. Adding a fourth *creative* is free — the rotation generalises, see below. Adding a third *slot* is not.

### Adding a fourth creative

The `3 - a - b` shortcut is specific to three. For N creatives, replace `tick()` with: pick a random index that is neither `a` nor `b`. Everything else — the alternating turn, the interval, the invariants — is unchanged.

---

## The creatives

### ForgeMCP — `forgemcp-300x250.html`

Built to the ForgeMCP brand system, dark mode (the system specifies dark for digital advertising).

- Ground `#0B0E13`, border `rgba(224,104,25,.28)`, accent `#E06819`
- Hex bolt logo, orange stroke, transparent interior — correct for dark. **On any white background it must get the `#1A1A1E` dark fill instead**, or it reads as empty.
- Wordmark: Epilogue 900, "Forge" orange + "MCP" white. Never all-lowercase, never another font.
- Platform row order is **locked**: Claude → ChatGPT → Gemini → Perplexity. Live ones take a filled dot (Claude `#B5855A`, ChatGPT `#68BB7A`); coming-soon take an open ring with a `soon` label in `#A64D14` at 0.75× the platform name size.
- Trust footer phrase is **locked verbatim**: `BUILT IN-HOUSE · SOC 2 ROADMAP · OPEN-SOURCE CAS ENGINE`. It wraps to two lines at 8px. Do not shrink it below 8px or reword it to make it fit — it was already once cut to 6.5px for layout and that dropped it to 2.85:1 contrast.

### FlowGuideAI — `flowguideai-300x250.html`

Built to the FlowGuideAI brand system, dark mode.

- Ground `#1A2744` navy, border `rgba(0,212,184,.25)`, teal `#00D4B8`, amber `#F59E0B`
- Document icon with folded corner, teal accent line
- Wordmark letter colours are **the brand's identity and must not vary**: **F** teal, **G** amber, **A** teal, **I** amber; all other letters white. Never all one colour, never reversed.
- All **six** domain pills, in locked order: Engineering · Compliance · HR · IT · Legal · Finance. Showing only some of them undersells the platform.
- Databricks Native App badge in `#E6210D` with the line "your data never leaves your account". Do not mention Snowflake.
- Never use "FGAI" in public copy — internal only.

### suggestibility.ai — `suggestibility-300x250.html`

⚠ **Interim palette, by design.** Matched to the blue currently on suggestibility.ai rather than a brand system, because there isn't one yet.

- Ground `#0B1220`, border `rgba(59,130,246,.32)`, accent **`#3B82F6`**
- **Confirm this hex against the live site.** It is a close read of the blue, not a copied token. If the real value differs, it appears in exactly five places in the file — find-and-replace `#3B82F6`, plus `rgba(59,130,246, …)` for the border and rule, and `#8AB4FF` for the badge text.
- Copy is real, taken from the live site: the review-board line, the independent-model-families differentiator, and the CONSENSUS / DISSENT / RECOMMENDATIONS triad.
- The mark — three dots, two filled and one open for the dissenting reviewer — is a **placeholder**. The real mark is at `/brand/suggestibility-mark.svg`; swap it in.
- **A violet version is planned** for after the hackathon judging, when the whole site moves off the interim blue. When that happens this creative changes with it — the same five values.

## Slot spec, for any future unit

- 300 × 250, plus a 2× export at 600 × 500
- All type **≥ 8px** and inside a 16px margin — the rail frames the unit, so edge-to-edge artwork gets visually cropped
- One headline (≤ 8 words), one supporting line, one proof row, one CTA, one mark. Nothing else fits legibly.
- Under 80KB so it never delays the checker
- Shared structure, so the family reads as a family: mark + wordmark → 1px rule → headline → support line → proof row → rule → domain CTA bottom-right
- Fonts: Epilogue (400/700/900) and JetBrains Mono (400/500), both from Google Fonts. Self-host them if the rail should work offline.

## Tracking

The creatives link with bare `href`s. If you want attribution, append a UTM to each — suggested:

```
?utm_source=mypasswordchecker&utm_medium=house&utm_campaign=rail
```

Worth knowing which of the three actually earns clicks before deciding what a fourth should be.
