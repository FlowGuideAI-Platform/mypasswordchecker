// Submits all sitemap URLs to IndexNow (Bing, Yandex, Naver, Seznam) after deploy.
// Usage: INDEXNOW_KEY=xxxx node scripts/indexnow-submit.mjs
// The key is public by design (it lives at /<key>.txt), so when the env var is
// unset we fall back to reading the key file from public/.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HOST = 'mypasswordchecker.com';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let KEY = process.env.INDEXNOW_KEY;
if (!KEY) {
  const keyFile = readdirSync(join(root, 'public')).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
  if (keyFile) KEY = readFileSync(join(root, 'public', keyFile), 'utf8').trim();
}
if (!KEY) { console.error('INDEXNOW_KEY not set and no key file in public/'); process.exit(1); }

const sm = await fetch(`https://${HOST}/sitemap.xml`);
if (!sm.ok) { console.error(`sitemap fetch failed: ${sm.status}`); process.exit(1); }
const urls = [...(await sm.text()).matchAll(/<loc>\s*(.*?)\s*<\/loc>/g)].map((m) => m[1]);
if (!urls.length) { console.error('no URLs in sitemap'); process.exit(1); }

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }),
});
console.log(`IndexNow: ${res.status} — submitted ${urls.length} URLs`); // 200 OK, 202 accepted/key pending
if (![200, 202].includes(res.status)) process.exit(1);
