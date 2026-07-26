# Handoff: MyPasswordChecker.com redesign

**Package version: v2** · homepage direction selected and built, plus the house ad rail.

## Is this the right package?

If a tool or a teammate tells you it is "missing v2," check these three files exist. If they do, you have v2:

- `designs/Homepage 1a.dc.html` — the approved homepage
- `ad-rail/rotation.js` — the ad rotation logic
- `ad-rail/creatives/suggestibility-300x250.html` — the third house creative

An earlier download contained **only** the `ad-rail/` contents (three creatives + rotation, no homepage). If that is what you were given, this package supersedes it.

### What changed since v1

- **Direction chosen: 1a, Modernist.** v1 presented three competing directions side by side; `designs/Homepage Directions.dc.html` keeps all three for reference, but **build from `designs/Homepage 1a.dc.html`.**
- **Homepage H1 changed** to "How strong is your password?" The crack-time headline is now reserved verbatim for a separate `/password-cracker-test` page (README §5, DESIGN.md §1.3).
- **Two-tier red rule added** — deep `#ae1800` for chrome, bright `#ec3013` for exactly two elements. This is load-bearing; see the colour budget below.
- **`.com` wordmark** resolved to `--color-accent-700`; gold was explored and dropped.
- **Grover rate locked at 10⁶/sec** (→ 12 weeks for the demo password), with the assumption printed beside the figure.
- **Footer domain-reassurance strip added** (§1.9).
- **Ad rail built** — three real creatives replacing v1's placeholders, plus offset rotation. See `ad-rail/README.md`.


## Overview

A search-data-driven redesign of `mypasswordchecker.com` — a free, client-side password strength checker with a quantum-resistance differentiator. The homepage is designed and approved; five further pages are specified here and not yet designed.

The redesign is driven by Google Search Console data (Jan 1 – Jul 25 2026, included in `search-data/`). The reasoning behind every structural decision is in **`DESIGN.md`** — read it before building. The short version:

- The site ranks **#1.8 with 34.6% CTR for "quantum password checker"** — that is the moat, but only 52 impressions in seven months, so it does not get the headline.
- A cluster of ~16 **"how long to crack" queries sits at positions 9–14 with 0% CTR** — the ranking exists, the snippet doesn't earn the click. That intent gets its own page.
- The site is **competing with itself** three ways (extensionless vs `.html`, `www` vs non-`www`, homepage vs `/free-password-checker`). Redirects are the cheapest win on the list and need no design work.

## About the design files

The files in `designs/` are **design references created in HTML** — prototypes showing intended look and behaviour, not production code to copy directly. They are authored in a streaming component format (`.dc.html`) that will not run outside the authoring tool.

**The task is to recreate these designs in the target codebase's environment**, using its established patterns. The current live site is static HTML/CSS/JS with client-side analysis — if that stays, these translate to plain HTML + the design-system stylesheet almost directly. If you are moving to a framework, pick whatever the rest of the stack uses.

### How to read a `.dc.html` file

- The markup between `<x-dc>` and `</x-dc>` is the template. It is ordinary HTML with two additions:
  - `{{ someName }}` is a value hole — a runtime value supplied by the logic class.
  - `<sc-for list="{{ items }}" as="item">…</sc-for>` is a loop; inside it, `{{ item.t }}` reads the current item.
- Everything inside `<helmet>` belongs in `<head>`.
- The `<script data-dc-script>` block at the bottom is a React-class-like component. **`renderVals()` returns the values the template's holes consume** — that method plus `analyze()` and `fmtTime()` are the entire application logic and port directly to any framework (or to plain JS).
- `style="…"` attributes are ordinary inline CSS. `class="…"` names come from the design system stylesheet.

## Fidelity

**High-fidelity.** Final colours, typography, spacing and copy. Recreate the homepage pixel-accurately. All values come from the design system's tokens — use the token, never the literal, with the two documented exceptions below.

---

## Design system

`design-system/styles.css` is the single source of truth. Link it and take every colour, font, spacing and radius from its CSS custom properties. `design-system/readme.md` is the system's own usage guide and its rules are binding.

The system is called **Modernist**: flat, architectural, set entirely in Archivo — near-mono red on paper, a visible modular grid, **zero corner radius**, and strong 2px rules. Nothing floats and nothing is decorated; alignment and the strength of the dividers do the organising.

### Tokens (from `design-system/styles.css`)

**Colour — roles**

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#f3f2f2` | Page ground |
| `--color-surface` | `#eae9e9` | The checker panel's fill |
| `--color-text` | `#201e1d` | All body and heading ink |
| `--color-accent` | `#ec3013` | **Bright red — two places only, see colour budget** |
| `--color-divider` | `color-mix(in srgb, #201e1d 40%, transparent)` | Every 2px rule |

**Colour — ramps** (100 → 900, generated in OKLCH on one shared lightness scale)

- Neutral: `#f8f4f4` `#eae7e7` `#d7d3d3` `#bab6b6` `#9b9797` `#7d7979` `#605d5d` `#444141` `#2d2b2b`
- Accent: `#fff2ef` `#ffe0d9` `#ffc4b8` `#ff9783` `#ff563c` `#dd2b0f` `#ae1800` `#7c1405` `#4d170e`

Use 100–300 for tinted fills and hovers, 500 as base, 700–900 for text on tinted fills and pressed states. Prefer ramp steps over ad-hoc `color-mix()`.

**⚠ Colour budget — the rule that keeps this design working**

Red runs in two tiers and they must not be confused:

| Tier | Token | Allowed in |
|---|---|---|
| **Deep** | `--color-accent-700` `#ae1800` | Small chrome: the `.com`, the eyebrow, card kickers, body-size links. Reads as ink. **7.0:1 on the ground — AA at any size.** |
| **Bright** | `--color-accent` `#ec3013` | **Exactly two elements: the strength-meter fill, and the quantum crack-time panel's background.** |

The bright accent is the page's one loud voice and it is spent entirely on the differentiator. **A third bright-red object on the page is a defect.** Check every addition against this.

Note this also means: `--color-accent` is tuned to only ~3:1 against the ground. It is legal for icons, large display type and interface chrome — **never for paragraph-size text.** Body-size links take `--color-accent-700`. The prototype enforces this with one rule:

```css
.t-modernist a { color: var(--color-accent-700); }
.t-modernist a:hover { text-decoration: underline; }
```

In production, drop the `.t-modernist` scope — it exists only because the prototype had to show three competing design systems in one document. Scope to `body` or the app root instead. **Do not ship the `theme-*.css` files in `designs/`; they are scoped copies for the prototype. Ship `design-system/styles.css`.**

**Type** — Archivo throughout (`--font-heading` and `--font-body` are both Archivo). Heading weight 800, body 400.

```
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800&display=swap');
```

| Element | Size | Notes |
|---|---|---|
| `body` | 15px / 1.55 | weight 400 |
| `h1` | 42px | overridden to **60px** in the hero |
| `h2` | 32px | |
| `h3` | 25px | |
| `h4` | 20px | overridden to 17px in the trust row |
| `h5` | 16px | |
| `h6` | 13px, uppercase, `letter-spacing: 0.08em` | the section kicker |

All headings: weight 800, `line-height: 1.12`, `letter-spacing: -0.015em`, `margin: 0 0 var(--space-2)`.

**Spacing** — `--space-1` 4px · `--space-2` 8px · `--space-3` 12px · `--space-4` 16px · `--space-6` 24px · `--space-8` 32px. Use the variables, not raw numbers.

**Radius** — `--radius-sm/md/lg` are all **0px**. Do not round a corner anywhere.

**Shadow** — `--shadow-sm/md/lg` exist but the homepage uses none. Nothing floats.

### Binding rules from the system's readme

- **Button labels are flush left.** `.btn` ships `justify-content: center`; any button wider than its label must override to `justify-content: flex-start`. Every button in the prototype does this. Do not center button labels or hero copy.
- **Let the grid show** — equal-width cells, strong 2px horizontal and vertical rules between sections.
- **Keep everything flush left** — headings, copy, and labels inside wide buttons.
- **Photographs** go through the `.grayscale` wrapper and print in pure black and white. Never tint or colorize imagery. (The homepage currently has no photography.)
- **Focus** is `outline: 2px solid var(--color-accent); outline-offset: 2px` on `:focus-visible`. Never the browser default. Already in `styles.css` — don't restyle per page.
- **Icons** are Lucide (https://lucide.dev), inline SVG on `currentColor`.

### The two documented literal-value exceptions

1. `#FFD700` — brand gold, for the **lock mark only**, and for the `.com` **on dark surfaces only** (OG images, dark chrome). It measures ~1.4:1 on the light ground and must never be used for type there. On light surfaces `.com` is `--color-accent-700`.
2. The ad-slot placeholder stripe (`repeating-linear-gradient`) — prototype scaffolding only. Replace with the real creative.

---

## Screens / views

### 1. Homepage — `/` — **designed, approved, build this first**

Reference: `designs/Homepage 1a.dc.html`

**Purpose.** Answer "how strong is my password" in under a second, with the crack-time number as the largest object on the screen, and establish the quantum differentiator without letting it take over.

**Page shell.** `max-width: 1280px; margin: 0 auto` on `--color-bg`. Sections are separated by `border-bottom: 2px solid var(--color-divider)`, full bleed to the 1280px edge. Standard section padding is `var(--space-8)` (32px).

**Sections, top to bottom:**

**1.1 Nav** — flex, `space-between`, `padding: var(--space-4) var(--space-8)`, `border-bottom: 2px solid var(--color-divider)`.
- Left: wordmark, `--font-heading` 800 / 19px / `letter-spacing: -0.02em`. `MyPasswordChecker` in `--color-text`, `.com` in `--color-accent-700`.
- Right: flex, `gap: var(--space-6)`, 12px, uppercase, `letter-spacing: 0.08em`, weight 600, colour `--color-text`, `text-decoration: none`.
- Items: CHECKER · PHONETIC GENERATOR · BREACH CHECK · DEVELOPER API · PRICING

**1.2 Hero** — `grid-template-columns: 7fr 5fr`, `border-bottom: 2px solid var(--color-divider)`; the left cell carries `border-right: 2px solid var(--color-divider)`.

*Left cell (padding `var(--space-8)`):*
- Eyebrow: 11px, uppercase, `letter-spacing: 0.12em`, weight 600, `--color-accent-700`, `margin-bottom: var(--space-6)` — “Runs in your browser — nothing is sent”
- H1: 60px, `max-width: 15ch` — **“How strong is your password?”**
  ⚠ **Do not use “How long would it take to crack your password?” here.** That headline is reserved verbatim for `/password-cracker-test` (see §5 below) to avoid the cannibalisation documented in DESIGN.md §1.5.
- Lead: 17px, `max-width: 48ch` — “A free strength test with entropy, GPU crack time, and a quantum resistance estimate — the only checker that models Grover's algorithm. Nothing you type leaves this page.”
- `.hr` (2px divider, `margin: var(--space-4) 0`)
- Two-column method note, `gap: var(--space-6)`, 13px: **zxcvbn pattern matching** / “Dropbox's library, run client-side” · **Grover's algorithm model** / “Halves effective key strength”

*Right cell (padding `var(--space-8)`, `background: var(--color-surface)`):*
- Label: 11px uppercase `letter-spacing: 0.12em` weight 600 — “Your password”
- Row: flex, `gap: var(--space-2)` — `.input` (flex 1, monospace) + `.btn.btn-secondary` (`min-width: 64px`, **`justify-content: flex-start`**) reading “Show” / “Hide”
- Meter: 10px tall, `background: var(--color-neutral-300)`, `margin: var(--space-6) 0 var(--space-2)`; fill 10px `background: var(--color-accent)`, width = `min(100, bits / 128 × 100)%`
- Row: 12px uppercase `letter-spacing: 0.08em` weight 600, `space-between` — strength label · “Target: 100 bits”
- `.hr`
- “What weakens it”, 11px uppercase — then the weakness list: each row flex, `gap: var(--space-2)`, 13px, prefixed by an em-dash in `--color-accent`

**1.3 Result row** — `grid-template-columns: 1fr 1fr 1fr`, `border-bottom: 2px solid var(--color-divider)`. Cells 1 and 2 carry `border-right: 2px solid var(--color-divider)`. Padding `var(--space-8)`.

Every cell has the same anatomy:
- Kicker: 11px, uppercase, `letter-spacing: 0.12em`, weight 600, `margin-bottom: var(--space-4)`
- **Numeral: `--font-heading` 800, 76px, `line-height: 0.9`, `letter-spacing: -0.04em`**
- Unit: `--font-heading` 800, 20px, `letter-spacing: 0.06em`, `margin-top: var(--space-2)`
- Caption: 12px, `.text-muted`, `margin-top: var(--space-4)`

| Cell | Kicker | Value (demo `Cobalt-Rope-7`) | Caption |
|---|---|---|---|
| 1 | CRACK TIME — MODERN GPU | 8.1 / MILLION YEARS | At 10¹¹ guesses per second — a single rented GPU rig, offline, against a leaked hash. |
| 2 | ENTROPY | 85 / BITS | Every bit doubles the work. 60 is fair, 80 is strong, 100 or more survives a quantum halving. |
| 3 | CRACK TIME — QUANTUM (GROVER) | 12 / WEEKS | A machine this large does not exist yet. A future-proofing estimate at 10⁶ Grover iterations per second — not today's threat. |

**Cell 3 is the only bright-red field on the page:** `background: var(--color-accent)`, text `var(--color-bg)`, caption at `opacity: 0.85`. This is the design's single strongest gesture — do not dilute it, do not add a second one.

**1.4 Trust row** — `h6` “Why you can believe the number”, then `grid-template-columns: repeat(4, 1fr)`, `gap: var(--space-8)`. Each: `h4` at 17px + `.text-muted` 13px.

1. **Never leaves your browser** — Open the network tab while you type. There is nothing to see — no request is made.
2. **Readable source** — The whole checker is client-side JavaScript. View source and audit it yourself.
3. **Published method** — zxcvbn for classical patterns; a stated Grover model for quantum, with its assumptions printed.
4. **Honest about quantum** — Large-scale quantum computers do not exist. We say so on every estimate we publish.

**1.5 Tools** — `h2` “Three more tools. Still free, still no sign-up.”, then `repeat(3, 1fr)`, `gap: var(--space-6)`. Each is `.card` with `.card-kicker` / `.card-title` / `.card-body` + a `.btn.btn-primary` (`justify-content: flex-start`, `margin-top: var(--space-4)`).

| Kicker | Title | Body | CTA |
|---|---|---|---|
| Generator | Phonetic password generator | Turn a phrase you can say out loud into a password nothing can guess. Built for people who have to type it on a TV remote. | Generate one → |
| Breach check | 800M+ leaked passwords | Matched against Have I Been Pwned. Only the first five characters of a hash are ever sent — your password stays here. | Check yours → |
| Quantum | Full quantum analysis | Bit-by-bit, with the Grover assumptions written out and a plain-language read on what to change. | Open the analysis → |

**1.6 Developer API + ad rail** — `grid-template-columns: 1fr 340px`; left cell `border-right: 2px solid var(--color-divider)`.

*Left:* `h6` “Developer API” · `h2` “Score passwords inside your own product.” (`max-width: 24ch`) · `.text-muted` lead (`max-width: 52ch`) · a `<pre>` at 13px monospace, `background: var(--color-neutral-900)`, colour `--color-neutral-100`, `padding: var(--space-4)` · two buttons (`.btn-primary` “Read the docs”, `.btn-secondary` “Pricing”), both flush-left.

*Right:* `h6` “Also from All Aligned Consulting”, then two **300×250** slots stacked with `var(--space-4)` between.

**Ad integration — three deliberate rules** (rationale in DESIGN.md §4):
1. Ads sit **below the answer**, never between the checker and the result.
2. Heading is **“Also from All Aligned Consulting”** — first-party product family, not third-party advertising. On a security site that distinction is worth real trust.
3. The creative is **untouched** — same 300×250, same colours. Only the frame around it belongs to this system.

**1.7 FAQ** — `h2` “Questions people actually ask”, `grid-template-columns: 1fr 1fr`, `gap: var(--space-8)`. Four `h4` + `.text-muted` 14px pairs. Exact copy is in the prototype. **Add `FAQPage` structured data** — the copy is written for it.

**1.8 Footer** — `grid-template-columns: 2fr 1fr 1fr 1fr`, `gap: var(--space-6)`, 13px. Brand blurb + Tools / Developers / Legal link columns under `h6` headings.

**1.9 Domain reassurance strip** — `.hr`, then a 13px flex row, wrapping:

> **SAME TOOL, THREE ADDRESSES** — QuantumPasswordChecker.com · MyQuantumPasswordChecker.com · MyPasswordChecker.com — typed one of the others and landed here? You are in the right place.

Because the quantum domains 301 to this host, a visitor who typed `quantumpasswordchecker.com` lands on a differently-named page — a “did I get redirected somewhere sketchy?” moment on a *security* site. **Also put this line at the top of `/about`**, which ranks at position 8.9 and is where a suspicious visitor goes to check who you are.

---

### 2. Homepage — mobile — **not yet designed**

**Mobile converts 1.7× better than desktop** (12.6% vs 7.6% CTR) on a fifth of the impressions. Design it as a first-class layout, not a squeezed grid.

Single-column order: nav (collapsed) → eyebrow → H1 → **input** → **crack-time numeral** → entropy → quantum → weaknesses → lead paragraph → trust row → tools → ads → API → FAQ → footer.

- The input must be reachable without scrolling on a 390×844 viewport.
- Result numerals drop from 76px to ~56px; H1 from 60px to ~40px.
- All three result cells stack full-width; the quantum cell keeps its red field.
- Hit targets ≥ 44px. The Show/Hide button is currently 64px wide and ~34px tall — it needs to grow.
- 2px rules become horizontal-only.

### 3. `/generate-phonetic` — phonetic password generator — **not yet designed, highest ROI**

**87 impressions at position 10.9, zero clicks.** Page-1 ranking on a near-uncontested term, wasted on a weak snippet. The title/meta rewrite alone is pure upside and needs no design work:

- `<title>`: `Phonetic Password Generator — Say It, Don't Guess It`
- meta: `Turn a phrase you can say out loud into a password nothing can guess. Free, no sign-up, runs in your browser.`

Page structure: same nav/footer; hero with the generator control as the hero object (phrase in → password out); show the resulting entropy and crack time inline using the same numeral treatment as the homepage result row, so the two pages visibly share a system.

### 4. `/premium` + `/pricing` — **not yet designed**

Current copy conflicts: the homepage says “free for everyone, no sign-up” while a Premium page and paid API both exist. **Resolve that before designing** — the honesty pillar is load-bearing here. Recommendation: everything consumer-facing is genuinely free and unauthenticated; paid tiers exist only for the API.

### 5. `/password-cracker-test` — **new page, not yet designed**

The reserved home of the crack-time intent (DESIGN.md §1.3): ~16 queries at positions 9–14 with 0% CTR.

- H1, **verbatim, reserved**: **“How long would it take to crack your password?”**
- `<title>`: `Password Cracker Test — How Long to Crack Your Password`
- meta: `Run your password against a real attack model: GPU brute force, dictionary and quantum. See the exact crack time in seconds, days or millennia. Free, in-browser.`

⚠ **Build it as a genuinely different page** — an attack-model explainer (dictionary / brute force / rainbow / credential stuffing, each with its own timing) that happens to contain the calculator. A reskinned homepage recreates the exact `/free-password-checker` cannibalisation this redesign is fixing.

### 6. `/password-api` — developer API landing — **not yet designed**

89 impressions at position 21.1. Expand the homepage's API strip into a full page: endpoint reference, auth, rate limits, response schema, client snippets in 3–4 languages.

---

## Interactions & behaviour

**The checker is the only interactive element on the homepage.**

- Typing in the input recalculates everything **synchronously on every keystroke** — no debounce, no spinner, no async. The immediacy is the product; it is also what makes “no request is made” self-evidently true.
- Show/Hide toggles the input between `type="password"` and `type="text"` and swaps its own label.
- Empty input renders `—` in all three numerals, `0%` meter, label “Nothing to measure”, and a single note: “Type a password above to see the estimate.”
- Hover, pressed and focus states all come from the design system. Do not restyle them per page.
- No animations or transitions anywhere. Nothing floats, nothing moves.

**Non-negotiable privacy behaviour.** No network request may fire as a result of anything typed into the checker — no analytics event carrying input, no length, no character-class summary, no debounced telemetry. The page claims a visitor can watch the network tab and see nothing. That claim must survive an audit; a single stray beacon makes the whole trust row a lie. The one exception is the breach check, which is explicitly described on the page as sending a **five-character SHA-1 prefix only** (HIBP k-anonymity) — never the password.

## State management

Three values:

```
password: string   // default demo value "Cobalt-Rope-7"
revealed: boolean  // Show/Hide
analysis: derived  // pure function of `password` — never stored
```

`analysis` should be memoized by password string. In the prototype it is not memoizing for speed — an earlier version recomputed identity on every render and caused an infinite render loop. Any framework port should keep the derivation pure and referentially stable.

### The analysis algorithm (port verbatim — see `renderVals` / `analyze` / `fmtTime` in the prototype)

**Entropy.** Charset size by class presence: lowercase +26, uppercase +26, digits +10, any other character +33. `bits = length × log2(charsetSize)`.

**Penalties** (subtracted from bits; each adds a named note to the weakness list):

| Condition | Penalty | Note shown |
|---|---|---|
| Contains a top-10k common password | `min(bits × 0.6, 32)` | Contains one of the ten thousand most common passwords. |
| A character repeats 3+ times in a row | 6 | A character repeats three or more times in a row. |
| Keyboard walk or counting sequence | 9 | Contains a keyboard walk or a counting sequence. |
| Lowercase only | 5 | Lowercase letters only — no case, digits or symbols. |
| Digits only | 8 | Digits only. A PIN-shaped password is guessed first. |
| Contains `(19|20)\d\d` | 4 | Contains something shaped like a year. |
| Length < 12 | 3 | Under twelve characters. Length beats cleverness. |

Floor at 1 bit. If no penalties fired: “No common patterns, walks or repeats found.”

> **Production note.** The prototype uses a 12-entry substring list as a stand-in. Ship the **real zxcvbn library** — the page names it explicitly in two places, so it has to actually be running. Keep the penalty *notes* as the user-facing explanation layer; zxcvbn's `feedback` and `sequence` output can drive them.

**Crack times.**
- Classical: `guesses = 2^(bits − 1)`, at **10¹¹ guesses/sec**.
- Quantum: `iterations = 2^(bits / 2)`, at **10⁶ Grover iterations/sec**.

> **⚠ The rate constant and the caption must always move together.** 85 bits → ~2^42.5 ≈ 6×10¹² Grover iterations; at 10⁶/sec that is ~12 weeks, at 10⁹/sec it would be ~2 hours. 10⁶ is the defensible figure — Grover requires *sequential* oracle queries at realistic quantum clock rates plus error-correction overhead, nowhere near GPU parallelism. If anyone ever revises the rate, the printed caption must change in the same commit. “Honest about quantum” is one of the four trust pillars and it is only true if the number and its stated assumption agree.

**Time formatting.** Ladder: seconds → minutes → hours → days → weeks → years → thousand / million / billion / trillion / quadrillion / quintillion years. Pick the largest unit where value ≥ 1. Render `<1` for sub-second, `∞ / beyond estimate` above ~10²¹ years. Number format: ≥100 → rounded with thousands separators; ≥10 → rounded; otherwise one decimal.

**Strength labels** by rounded bits: `<28` Very weak · `<36` Weak · `<60` Fair · `<80` Strong · `<100` Very strong · `≥100` Quantum-ready.

## Assets

- **Archivo** from Google Fonts, weights 400/600/800.
- **Lucide** icons — none currently used on the homepage; use these if any are added.
- **Two 300×250 ad creatives** — ForgeMCP and FlowGuideAI, existing, unchanged. The prototype shows striped placeholders; swap in the real files.
- **Lock mark** — the gold Twemoji lock at `#FFD700`. Not present in the prototype; add it beside the wordmark if wanted.
- **A third 300×250 for suggestibility.ai** is planned — full spec in DESIGN.md §5. Not built; its brand `.md` is still needed.
- No photography. If any is added it goes through `.grayscale`.

## Non-design work that ships with this

These are worth more than the redesign in the short term and need no design input. Full detail in DESIGN.md §3.1 and §3.3.

1. **301 redirects** — every `.html` duplicate to its extensionless form; `www` → non-`www`; `/free-password-checker` → `/`; pick one of `/api-docs` and `/docs`. Then one self-referencing canonical per page, matching the chosen host, and resubmit the sitemap.
   ⚠ Note the live site currently canonicals to `https://mypasswordchecker.com/` while every nav link points at `https://www.mypasswordchecker.com/`. Pick one host and be consistent.
2. **Title and meta rewrites** — the homepage currently carries two competing titles (`<title>` and `og:title` disagree). Rewrites for `/`, `/generate-phonetic`, `/password-api` and `/password-cracker-test` are in DESIGN.md §3.3.
3. **Structured data** — `FAQPage` on the homepage FAQ, `SoftwareApplication` with `"offers": {"price": "0"}` (several ranking queries include “free”).

## Files

```
design_handoff_mypasswordchecker/
├── README.md                        ← this file
├── DESIGN.md                        ← full search analysis + rationale. Read first.
├── designs/
│   ├── Homepage 1a.dc.html          ← THE APPROVED HOMEPAGE
│   ├── Homepage Directions.dc.html  ← all 3 explorations, for context only
│   └── theme-*.css                  ← prototype-scoped copies. DO NOT SHIP.
├── ad-rail/                         ← the house ad rail, buildable on its own
│   ├── README.md                    ← rotation rule + locked brand constraints
│   ├── rotation.js                  ← vanilla, no dependencies
│   ├── example.html                 ← working demo of the rail
│   └── creatives/*.html             ← 3 self-contained 300×250 units
├── design-system/
│   ├── styles.css                   ← SHIP THIS. Single source of truth.
│   └── readme.md                    ← the system's own binding usage guide
└── search-data/                     ← GSC export, Jan 1 – Jul 25 2026
    ├── Queries.csv  Pages.csv  Countries.csv
    └── Devices.csv  Chart.csv  Filters.csv
```

## Open questions for the client

1. **Free vs Premium.** Homepage says “free for everyone, no sign-up”; a Premium page and paid API exist. Resolve before building §4.
2. **Thailand.** #2 country by clicks (43 from only 85 impressions, position 4.5) against 72 clicks from 1,115 US impressions. Filter GSC to Thailand and read the query list — there may be an under-served segment worth a page.
3. **suggestibility.ai** ad unit — its brand `.md`, category line, outcome claim, logo SVG. Note that three stacked 300×250s is 750px of house advertising; rotate two per load rather than stacking all three.
