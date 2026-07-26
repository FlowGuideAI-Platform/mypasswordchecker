#!/usr/bin/env bash
# Deploy the static site (mypasswordchecker-main) safely:
#   1. contract test — the model, demo fallbacks, generated table and FAQ
#      mirroring must agree before anything ships
#   2. clean-links guard — no internal .html link may reappear (numbers.html
#      and ads/ are outside the rewrite scope by design)
#   3. wrangler versions upload + deploy (the two-step keeps routes/custom
#      domains untouched — see wrangler-static.toml header)
#   4. IndexNow ping — AFTER deploy so pages are live; never blocks a deploy
set -euo pipefail
cd "$(dirname "$0")/.."

echo "── contract test"
node scripts/test-crack-model.mjs > /dev/null
echo "ok"

echo "── clean-links guard"
if grep -rEn "['\"]/[a-z0-9-]+\.html" public/*.html public/js/*.js 2>/dev/null | grep -v '^public/numbers.html'; then
  echo "FAIL: internal .html link found (see above) — fix before deploying" >&2
  exit 1
fi
echo "ok"

echo "── upload version"
UPLOAD_OUT=$(npx wrangler versions upload --config wrangler-static.toml 2>&1)
VID=$(echo "$UPLOAD_OUT" | grep -o 'Worker Version ID: [a-f0-9-]*' | cut -d' ' -f4)
if [ -z "$VID" ]; then echo "$UPLOAD_OUT"; echo "FAIL: no version id" >&2; exit 1; fi

echo "── deploy version $VID"
npx wrangler versions deploy "$VID" -y --config wrangler-static.toml

echo "── IndexNow ping (non-blocking)"
node scripts/indexnow-submit.mjs || echo "IndexNow ping failed — deploy is live regardless"

echo "── done. Reminder: HTML is edge-cached; purge in the Cloudflare dashboard to see changes."
