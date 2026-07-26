# IndexNow setup checklist (manual, for Jack)

Key: `7a9f687564cd770336c2d1dcbad4d029` — served at
`https://mypasswordchecker.com/7a9f687564cd770336c2d1dcbad4d029.txt` (public by design).

```
[ ] Cloudflare (SkypathwaysAccount → zone) → Caching → Configuration → Crawler Hints: ON
    (free; auto-IndexNow on content change)
[ ] Bing Webmaster Tools: verify the site (fastest: Import from Google Search Console)
[ ] Bing WMT → Sitemaps: submit https://mypasswordchecker.com/sitemap.xml
[ ] Bing WMT → IndexNow: confirm key detected after first ping (1–2 days)
[x] Manual first run: node scripts/indexnow-submit.mjs → expect 200/202
    (ran automatically with the Phase 5 deploy; see result in the phase notes)
[ ] GSC URL Inspection → request indexing for: /  /generate-phonetic
    /password-cracker-test  /docs   (Google ignores IndexNow)
```

Ongoing: `npm run deploy` runs contract test → clean-links guard → versions
upload/deploy → IndexNow ping. Remember the edge cache purge after HTML deploys
(or hand me a cache-purge API token and I'll automate it into deploy-static.sh).
