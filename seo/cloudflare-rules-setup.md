# Cloudflare Rules Setup — Phase 1A (manual)

Where: Cloudflare dashboard → **SkypathwaysAccount** (be1ad24…) → zone **mypasswordchecker.com**.
All redirects live at the edge (Rules), NOT in a worker — zero Worker CPU (global rule 3).

## 0. Always Use HTTPS — currently OFF (Phase 0 finding)

`http://mypasswordchecker.com/` serves **200** today, not a redirect. Fix first:

**SSL/TLS → Edge Certificates → Always Use HTTPS = ON.**
This covers every `http://` variant with a 301 before any rule below runs.

## 1. Redirect Rules (Rules → Redirect Rules → Single Redirects)

Create these five **wildcard**-type rules, all **301 (Permanent)**, in this exact order —
Cloudflare evaluates top-down and stops at the first match, so specific rules sit above
the `*.html` wildcard:

| # | Rule name | Wildcard pattern (Request URL) | Target URL | Preserve query string |
|---|---|---|---|---|
| 1 | `www-to-apex` | `https://www.mypasswordchecker.com/*` | `https://mypasswordchecker.com/${1}` | **ON** |
| 2 | `index-html-to-root` | `https://mypasswordchecker.com/index.html` | `https://mypasswordchecker.com/` | OFF |
| 3 | `merge-free-checker` | `https://mypasswordchecker.com/free-password-checker*` | `https://mypasswordchecker.com/` | OFF |
| 4 | `merge-api-docs` | `https://mypasswordchecker.com/api-docs*` | `https://mypasswordchecker.com/docs` | OFF |
| 5 | `strip-html-extension` | `https://mypasswordchecker.com/*.html` | `https://mypasswordchecker.com/${1}` | OFF |

Uses 5 of the 10 free Single Redirect slots.

Notes:
- Rule 3 catches both `/free-password-checker` and `/free-password-checker.html` (D3).
- Rule 4 catches both `/api-docs` and `/api-docs.html` (D2).
- Rule 5 turns today's **307** (Workers Static Assets `html_handling`) into a proper
  **301** at the edge; the worker redirect becomes unreachable for `.html` URLs.
- Worst chain is 2 hops (`www.../x.html` → apex `.html` → clean) — acceptable.
- Exception check: rule 5 also matches `/dashboard.html` → `/dashboard` (fine, same page)
  and `/numbers.html`? `/numbers` is only ever accessed extension-less — no impact.

## 2. Transform Rule (Rules → Transform Rules → Modify Response Header)

- Name: `dashboard-noindex`
- When: hostname equals `mypasswordchecker.com` AND URI path starts with `/dashboard`
- Then: **Set static** response header `X-Robots-Tag` = `noindex, nofollow`
- Does not touch `/api/*` or `/numbers` (path prefix is `/dashboard` only).

## 3. Verification (run after rules are live, then tell CC to re-run the matrix)

```bash
curl -sI http://mypasswordchecker.com/ | head -3                      # expect 301 → https
curl -sI https://www.mypasswordchecker.com/ | head -3                 # expect 301 → apex
curl -sI https://mypasswordchecker.com/index.html | head -3           # expect 301 → /
curl -sI https://mypasswordchecker.com/free-password-checker | head -3 # expect 301 → /
curl -sI https://mypasswordchecker.com/api-docs.html | head -3        # expect 301 → /docs
curl -sI https://mypasswordchecker.com/about.html | head -3           # expect 301 → /about
curl -sI https://mypasswordchecker.com/dashboard | grep -i x-robots   # expect noindex, nofollow
```

Wrangler note (1B): `wrangler-static.toml` sets no explicit `html_handling`; the default
(`auto-trailing-slash`) already serves clean URLs (verified: all clean paths 200 in the
Phase 0 audit). Left unchanged per the plan.

## 4. Post-verification follow-up (do after the matrix passes)

Once rules 3 and 4 are live and verified, `public/free-password-checker.html` and
`public/api-docs.html` become permanently unreachable (the edge 301 intercepts before
the worker). Delete both files from `public/` then — deleting earlier would 404 two
ranked URLs. Nothing links to them internally anymore as of Phase 1B.
