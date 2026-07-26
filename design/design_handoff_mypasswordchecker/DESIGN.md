# MyPasswordChecker.com — Redesign Brief

**Source data:** Google Search Console, `mypasswordchecker.com`, Web, **Jan 1 – Jul 25 2026**.
**Totals:** 305 clicks · 3,626 impressions · 8.4% CTR · avg position 19.7.

---

## 1. What the search data actually says

### 1.1 You own "quantum," and nothing else

| Query | Clicks | Impr. | CTR | Position |
|---|---|---|---|---|
| quantum password checker | **18** | 52 | **34.6%** | **1.8** |
| quantum password | 0 | 3 | 0% | 9.0 |
| password quantum | 0 | 2 | 0% | 7.0 |
| quantum password generator | 0 | 2 | 0% | 14.5 |

18 of your 305 clicks — **6% of all traffic from 1.4% of impressions.** A 34.6% CTR at position 1.8 is a healthy, well-matched result. The term works.

But the volume ceiling is low: 52 impressions in seven months. Quantum is a *moat*, not a *market*.

### 1.2 The generic head terms are unwinnable right now

| Query | Clicks | Impr. | Position |
|---|---|---|---|
| password checker | 0 | 149 | 56.1 |
| password cracker test | 0 | 147 | 31.3 |
| password tester | 0 | 76 | 68.6 |
| password test | 0 | 57 | 55.8 |
| test my password | 0 | 33 | 40.4 |
| password strength checker | 0 | 6 | 56.0 |

**~470 impressions, zero clicks.** Positions 30–90 don't get clicked, ever. These represent demand you can see but cannot touch — chasing them head-on means competing with password managers that have hundreds of referring domains. Do not build the homepage around them.

### 1.3 The real, unexploited opportunity: crack-time queries at positions 9–14

This is the finding that should drive the redesign.

| Query | Impr. | Position | Clicks |
|---|---|---|---|
| password checker how long to crack | 13 | **9.8** | 0 |
| password tester how long to crack | 6 | **10.2** | 0 |
| crack my password test | 6 | **11.2** | 0 |
| how crackable is my password | 1 | 9.0 | 0 |
| password crack time checker | 1 | 9.0 | 0 |
| how long would it take to crack my password test | 2 | 9.0 | 0 |
| password cracker test free | 9 | 13.7 | 0 |
| password strength checker time to crack | 2 | 19.5 | 0 |
| how long to crack my password test | 1 | 10.0 | 0 |
| break my password | 1 | 10.0 | 0 |
| check password crack time | 1 | 11.0 | 0 |
| password crack time test | 1 | 11.0 | 0 |
| password cracker time test | 1 | 11.0 | 0 |
| password time checker | 1 | 12.0 | 0 |
| dictionary attack password checker | 2 | 10.5 | 0 |
| brute force attack password checker free | 2 | 11.5 | 0 |

**A dense cluster sitting at the bottom of page 1 / top of page 2 with a 0% CTR.** These are the cheapest clicks available to you: the ranking already exists. Zero CTR at position 9–11 is almost always a **title, meta description and above-the-fold-answer problem**, not an authority problem.

**Design consequence:** the crack-time *number* becomes the largest object on the homepage — "8.1 million years" — but the crack-time *headline* is reserved for a dedicated page (below). The homepage answers "how strong," and the biggest thing on it answers "how long."

**The split, decided in review:** the homepage H1 is **"How strong is your password?"** and the verbatim headline **"How long would it take to crack your password?"** is reserved for a new **`/password-cracker-test`** page built in the same 1a system. Rationale: the "how strong" cluster is itself substantial and already ranks better —

| Query | Impr. | Position |
|---|---|---|
| how strong is my password | 86 | 19.0 |
| how good is my password | 18 | 50.4 |
| howstrongismypassword | 4 | 35.0 |
| how strong my password | 3 | 37.0 |
| how stong is my password *(sic)* | 3 | 20.3 |
| how strong is my password checker | 2 | 16.0 |
| + ~8 further long-tail variants | ~10 | 9–41 |

≈125 impressions at an average position materially better than the crack-time cluster's. Two pages, two intents, no cannibalisation — provided `/password-cracker-test` is built as a genuinely different page (an attack-model explainer with the calculator, not a reskinned homepage), or it recreates the exact `/free-password-checker` problem from §1.5.

### 1.4 The phonetic generator is a page-1 asset being wasted

| | Impr. | Position | Clicks |
|---|---|---|---|
| query: phonetic password generator | 53 | **10.3** | 0 |
| query: phonetic password | 12 | 12.8 | 0 |
| page: `/generate-phonetic` | 87 | **10.9** | **0** |

87 impressions at position 10.9 and not one click. You have a near-zero-competition niche term where you rank page 1 — and the result isn't compelling enough to click. This is a title/snippet fix worth more than any new content.

### 1.5 You are competing with yourself — three separate ways

**Duplicate extensionless / `.html` URLs both indexed:**

| Pair | Impr. | Position |
|---|---|---|
| `/about` vs `/about.html` | 253 vs 41 | 8.9 vs **4.7** |
| `/free-password-checker` vs `.html` | 465 vs 41 | 34.2 vs **4.7** |
| `/password-api` vs `.html` | 89 vs 41 | 21.1 vs **4.7** |
| `/premium` vs `.html` | 33 vs 26 | 6.1 vs 4.9 |
| `/pricing` vs `.html` | 36 vs 20 | 7.8 vs 4.6 |

The `.html` variants rank *better* (4.7) than the canonical ones. Google is splitting signals between two copies of every page.

**`www` vs non-`www` both indexed:** `www.mypasswordchecker.com/dashboard`, `www.…/api-docs.html`, `www.…/api-docs` all appear as separate rows. Note the live HTML canonical points at `https://mypasswordchecker.com/` while every nav link points at `https://www.mypasswordchecker.com/` — pick one host and be consistent.

**Homepage vs `/free-password-checker` cannibalisation:**

| Page | Clicks | Impr. | CTR | Position |
|---|---|---|---|---|
| `/` | 299 | 2,812 | 10.6% | 17.6 |
| `/free-password-checker` | 4 | 465 | **0.86%** | **34.2** |

Two pages targeting one intent. The second one absorbs 465 impressions and converts almost none of them. **Merge into the homepage and 301 the other.**

### 1.6 Devices

| | Clicks | Impr. | CTR | Position |
|---|---|---|---|---|
| Desktop | 226 | 2,988 | 7.6% | 20.3 |
| Mobile | 77 | 611 | **12.6%** | 15.7 |
| Tablet | 2 | 27 | 7.4% | 8.9 |

**Mobile converts 1.7× better than desktop** on a fifth of the impressions. Design mobile as a first-class layout, not a squeeze of the desktop grid. The single-column mobile order should be: headline → input → the big crack-time number → everything else.

### 1.7 About Thailand — answering your question directly

Thailand: **43 clicks / 85 impressions = 50.6% CTR at position 4.5.** That is **click-through rate from Google search results**, not a purchase or sign-up conversion rate. It means half the Thai searchers who saw your result clicked it — you rank ~4.5 there, which is far better than your 19.6 average in the US.

It is worth a look, though: Thailand is your **#2 country by clicks (43) on only 85 impressions**, while the US delivers 72 clicks from 1,115. Either a genuinely under-served query set, or a narrow branded/navigational term. Filter GSC to Thailand and read the query list before you act on it. Same pattern, smaller: Brunei (2/2, position 2), Seychelles (1/5, position 2.6), Croatia (1/4, position 2.5).

---

## 2. Positioning: quantum as the differentiator, not the identity

Per your answer — **balanced**. The structure that follows from the data:

- **Headline intent = crack time.** That is where the winnable, unconverted demand sits (§1.3), and it is also the question a person actually has.
- **Quantum = the reason to choose you over the ten other checkers.** It gets equal visual weight in the result row and its own dedicated colour field, but it does not take the H1.
- **Entropy = the credibility layer.** Equal size to crack time, per your answer.

The result row is therefore three equal cells: **GPU crack time · entropy · quantum crack time**, with quantum carrying the accent field. One glance answers "how bad is it," "by what measure," and "what about later."

The story the design tells with a single real password (`Cobalt-Rope-7`, 85 bits): **8.1 million years classically → 12 weeks against Grover.** That contrast *is* the product. No other checker on page 1 shows it.

### Domain strategy
Keep **mypasswordchecker.com** as the canonical property. The quantum domains stay as 301 redirects to it until quantum volume justifies a split — which the data says it does not yet (52 impressions vs ~470 for generic checker terms).

The trigger to revisit: **when "quantum password checker" and its variants clear ~500 impressions/quarter**, or when you hold position 1–3 on a second quantum term with real volume. At that point a dedicated `quantumpasswordchecker.com` with its own content stops cannibalising and starts adding. Set a calendar reminder to re-pull this report quarterly and check that one number.

### Grover rate assumption — a deliberate change
The live site models Grover as a straight bit-halving at GPU-class speeds, which produces alarmingly short numbers. The redesign states the assumed rate explicitly (**10⁶ Grover iterations/sec** vs **10¹¹ classical guesses/sec**) and prints it next to the figure. Slower, more defensible, still dramatic — and it makes the "honest about quantum" trust pillar true rather than decorative.

---

## 3. Information architecture

### 3.1 Redirect map (do this before or with the redesign)

| From | To | Why |
|---|---|---|
| `/free-password-checker` + `.html` | `/` (301) | §1.5 cannibalisation |
| `/about.html` | `/about` (301) | duplicate |
| `/password-api.html` | `/password-api` (301) | duplicate |
| `/premium.html` | `/premium` (301) | duplicate |
| `/pricing.html` | `/pricing` (301) | duplicate |
| `/privacy.html`, `/terms.html`, `/disclaimer.html` | extensionless (301) | duplicate |
| `/api-docs` ⟷ `/docs` | pick one, 301 the other | both indexed |
| `www.` | non-`www` (301) | host split |

Then: one self-referencing `<link rel="canonical">` per page, matching the chosen host, and resubmit the sitemap.

### 3.2 Page inventory after the merge

| Page | Target intent | Status |
|---|---|---|
| `/` | crack time + strength + quantum | **redesigned — this round** |
| `/generate-phonetic` | "phonetic password generator" (pos 10.3) | high priority — ranking already there |
| `/premium` + `/pricing` | consumer upgrade / API tiers | next round |
| `/password-api` | developer API landing | next round |
| `/about` | trust, operator, methodology | keep, retitle |
| `/password-cracker-test` | "how long to crack" cluster (§1.3), pos 9–14 | **new — reserved H1**, build in 1a |
| `/breach-check` | "password hack checker" cluster | consider — 11+11+4+2 impressions across variants |

### 3.3 Title & meta rewrites (the cheapest wins on this list)

The current homepage carries **two** competing titles — `<title>` says "Password Strength Checker - Free Online Tool & Quantum Test" while `og:title` says "Quantum Password Checker + Phonetic Generator + PQ Crypto | MyPasswordChecker". Fix that, and lead with the crack-time promise:

- **`/`** — `How Long to Crack Your Password? Free Strength & Quantum Test`
  *meta:* `See the exact crack time for your password — GPU and quantum estimates, entropy in bits, and what's weakening it. Runs entirely in your browser; nothing is ever sent.`
- **`/generate-phonetic`** — `Phonetic Password Generator — Say It, Don't Guess It`
  *meta:* `Turn a phrase you can say out loud into a password nothing can guess. Free, no sign-up, runs in your browser.`
- **`/password-api`** — `Password Strength API — Entropy & Crack Time in One POST`
- **`/password-cracker-test`** — `Password Cracker Test — How Long to Crack Your Password`
  *meta:* `Run your password against a real attack model: GPU brute force, dictionary and quantum. See the exact crack time in seconds, days or millennia. Free, in-browser.`

Also worth adding: `FAQPage` structured data on the homepage FAQ block (it is already written for it), and `SoftwareApplication` schema with `"offers": {"price": "0"}` — the "free" queries in your data (`password checker online free`, `password cracker test free`, `brute force attack password checker free`, `free password checker`) suggest price is part of the intent.

---

## 4. The chosen direction — 1a, Modernist

**Selected.** `Homepage 1a.dc.html` is the working homepage. `Homepage Directions.dc.html` keeps all three explorations as the record of the comparison.

| | System | Character | Argues for |
|---|---|---|---|
| **1a** | Modernist | Archivo, red on paper, visible modular grid, 2px rules, zero radius | **SELECTED — instrument.** The grid reads as measurement. The quantum cell is a full red field: the one place colour runs, so the differentiator is unmissable. The restraint is the point — red appears in exactly three places on the page, which is what makes the quantum block land. |
| **1b** | Broadsheet | Source Serif 4, cyan + magenta spot colour, no boxes at all | Editorial authority; a dateline rail and thick-thin rules borrow front-page furniture. Most differentiated in the SERP, least like a security tool. |
| **1c** | Industry | Barlow Condensed, steel blue, blueprint frames with registration marks | Engineering spec sheet. Closest in feel to ForgeMCP and FlowGuideAI — which is why it lost: when the host page shares a system with the house ads, the ads stop reading as separate products and become page furniture. 1a's red-on-paper makes the two steel-blue 300×250s the only objects of their kind on the page. |

The homepage is live: type in the input and every number recalculates.

### Shared structure (unchanged across directions)
1. Nav — Checker · Phonetic Generator · Breach Check · Developer API
2. Hero — crack-time H1, privacy claim above it, input immediately to the right
3. **Result row** — GPU crack time · entropy · quantum (accent field), all equal size
4. Weakness list — the specific patterns found, named
5. Trust row — four pillars, per your selection: browser-only · readable source · published method · honest about quantum
6. Tools — phonetic generator, breach check, quantum analysis. All free, no sign-up.
7. Developer API strip with a real request/response
8. Sponsor rail — ForgeMCP + FlowGuideAI 300×250
9. FAQ — four questions, matched to real query phrasings from §1.3
10. Footer — legal, operator, and a **"same tool, three addresses"** line naming all three domains

### The domain reassurance line
Because the quantum domains 301 to this host (§2), a visitor who typed `quantumpasswordchecker.com` lands on a page with a different name in the masthead — a moment of "did I get redirected somewhere sketchy?" on a *security* site. The footer now names all three addresses explicitly and says so in plain words. Worth also adding a one-line note at the top of `/about`, since that page ranks at position 8.9 and is where a suspicious visitor goes to check who you are.

### Two open items from the 1a copy pass

**1. The `.com` takes the deep red — `--color-accent-700` (`#ae1800`).** Same colour as the RUNS IN YOUR BROWSER eyebrow. Gold was explored and dropped: neither candidate earned its place. `#FFD700` measures ~1.4:1 on the `#f3f2f2` ground (unusable); `#B45309` (4.49:1) and `#8A6D00` (4.40:1) are effectively tied on contrast and both clear AA only at the 19px/800 wordmark size, never at body size. More to the point, the `.com` is not a thing that needs to win attention — **"CRACK TIME — QUANTUM (GROVER)" in the bright red field is.** Putting the wordmark in the same deep red as the eyebrow files it as chrome and leaves the bright accent solitary.

`#ae1800` on `#f3f2f2` measures **7.0:1** — comfortably AA at any size, unlike either gold.

The gold Twemoji lock can still carry `#FFD700` if it is used as a mark: a mark is not type, so the text contrast floor does not apply the same way. On dark surfaces (OG images, dark-mode chrome) `#FFD700` remains available for the `.com` as well.

**2. Grover rate — settled at 10⁶.** 85 bits → ~2^42.5 ≈ 6×10¹² Grover iterations; at 10⁹/sec that is ~2 hours, at 10⁶/sec ~12 weeks. The page states **10⁶ / 12 weeks**. Sequential oracle queries at realistic quantum clock rates plus error-correction overhead put it nowhere near GPU parallelism, so 10⁶ is both the defensible figure and the one consistent with the "Honest about quantum" pillar. The assumption is printed next to the number on the page — if the rate is ever revised, the caption and the value move together.

### Colour budget — the rule that keeps 1a working

Red runs in **two tiers, and they must not be confused**:

| Tier | Token | Where it is allowed |
|---|---|---|
| **Deep** | `--color-accent-700` `#ae1800` | Small chrome: the `.com`, the eyebrow, card kickers, body-size links. Reads as ink, not as signal. |
| **Bright** | `--color-accent` `#ec3013` | **Two places only:** the strength-meter fill and the quantum crack-time field. |

The bright accent is the page's one loud voice, and it is spent entirely on the differentiator. Every addition to this page — or any future page in the system — gets checked against that count first: a third bright-red object costs the quantum block its impact, which is the one thing the direction was chosen to deliver.

### Emoji
Reduced to zero on the page and replaced by typographic labelling. You asked to keep a few as functional icons — the systems all specify real icon sets (Lucide for 1a/1c at 1.5 stroke, Phosphor duotone for 1b), which do the same job without costing credibility on a security site. If you want emoji back, the honest place for them is the nav and the tool cards, not the result panel.

### Ad integration — what "integrate better" means
The creative itself is untouched: same 300×250, same colours, same artwork. Three changes to the *frame* around it:

1. **Moved out of the content flow.** Currently the two ads sit between the checker and "How It Works" — the exact place a visitor is reading their result. In the redesign they sit in the right rail beside the Developer API strip, below the answer.
2. **Labelled as a portfolio, not as advertising.** The heading is "Also from All Aligned Consulting" — same operator, named in the footer. That reframes them from third-party ads (which cost trust on a security site) to a first-party product family (which builds it).
3. **Framed in the host system.** In 1a the slot sits in a grid cell divided by the same 2px rule; in 1c it wears a blueprint frame with registration marks. The creative keeps its own colours inside a frame that belongs to the page.

---

## 5. The ad rail — three creatives, two slots, offset rotation

Built as three standalone 300×250 design components, each reusable outside this page:

| File | Brand | Source of truth |
|---|---|---|
| `AdForgeMCP.dc.html` | ForgeMCP | `forgemcp-brand` system, dark mode |
| `AdFlowGuideAI.dc.html` | FlowGuideAI | `flowguideai-brand` system, dark mode |
| `AdSuggestibility.dc.html` | suggestibility.ai | **provisional — see below** |

All three are dark-mode: both brand systems specify dark for digital advertising, and the dark units read as distinct objects against the paper ground rather than dissolving into the page.

### The rotation

Two slots, three creatives, one shared rule:

> On each tick, **exactly one slot flips**, and it takes the creative **neither slot is currently showing**.

Because the indices are 0, 1 and 2, the missing one is always `3 - a - b`. That single expression guarantees three properties at once: the two slots never show the same ad, they never change at the same moment, and the pair cycles through all six ordered combinations before repeating. Ticks alternate between slots every 8 seconds, so something on the rail changes every 8s while each individual creative holds for 16s — long enough to actually be read.

The transition is a **hard cut**. Nothing else on this page animates; a cross-fade in the rail would be the only moving thing on the screen and would pull the eye away from the result numerals.

### suggestibility.ai — interim blue, violet planned

The creative uses **`#3B82F6` on `#0B1220`**, matched to the blue currently live on suggestibility.ai — the colour Codex landed on during the OpenAI hackathon build and which Fable then built against. It is an interim, not a brand token: **confirm the hex against the live site.** It appears in five places in the file (`#3B82F6`, the `rgba(59,130,246, …)` border and rule, and `#8AB4FF` on the badge).

The copy is real, taken from the live site: the review-board line, the independent-model-families differentiator, and the CONSENSUS / DISSENT / RECOMMENDATIONS triad. The mark — three dots, two filled and one open for the dissenting reviewer — is a **placeholder**; the real one is at `/brand/suggestibility-mark.svg`.

**A violet version is planned** for after the hackathon judging and winner announcement, when the whole site moves off the interim blue. Violet `#8B7CF6` was the earlier exploration and sits further from ForgeMCP's orange and FlowGuideAI's teal than the blue does — worth reviving then, since three house units in one rail benefit from being unmistakably three products.

### Slot spec, for any future unit

- 300 × 250, plus a 2× export at 600 × 500
- All type ≥ 6.5px and inside a 16px margin — the rail frames the unit, so edge-to-edge artwork gets visually cropped
- One headline (≤ 8 words), one supporting line, one proof row, one CTA, one mark. Nothing else fits legibly.
- Under 80KB so it never delays the checker
- Structural pattern all three share: mark + wordmark → 1px rule → headline → support line → proof row (platform dots / domain pills / method triad) → rule → domain CTA bottom-right

**A caution on adding a fourth:** two slots showing three creatives is already the right density. Adding a fourth creative is free; adding a third *slot* is 750px of house advertising in a column beside the Developer API strip — the one thing on this page with revenue attached. Rotate more, stack no more.

---

## 6. Recommended sequence

1. **Redirects and canonicals** (§3.1). Cheapest, biggest, needs no design.
2. **Titles and metas** (§3.3), starting with `/generate-phonetic` — you rank 10.3 with 0% CTR; a better snippet is pure upside.
3. ~~Pick a direction~~ — **done: 1a, Modernist.**
4. **Build out** the mobile homepage, `/generate-phonetic`, `/password-cracker-test`, premium/pricing and the API landing in 1a.
5. **Replace the suggestibility.ai creative** once its brand `.md` lands (§5).
5. **Re-pull this report in 90 days** and check three numbers: crack-time cluster CTR (currently 0%), `/generate-phonetic` CTR (currently 0%), and quantum-term impressions (currently 52).
