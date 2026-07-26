// Contract test for the crack model and its design-pinned demo values.
// The homepage's static no-JS fallback and DESIGN.md's product story both
// depend on analyze(DEMO_PASSWORD) yielding exactly these figures — if a
// model change shifts them, this fails and the fallback HTML must be updated
// in the same commit (README: caption and value move together).
//
// Usage: node scripts/test-crack-model.mjs
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
globalThis.zxcvbn = createRequire(import.meta.url)(join(root, 'public/js/vendor/zxcvbn-4.4.2.js'));
const m = await import(join(root, 'public/js/crack-model.js'));

let failures = 0;
const check = (name, got, want) => {
  const ok = got === want;
  if (!ok) { failures++; console.error(`FAIL ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); }
  else console.log(`ok   ${name} = ${JSON.stringify(want)}`);
};

// The pinned demo contract (DESIGN.md §2: "8.1 million years → 12 weeks")
const demo = m.analyze(m.DEMO_PASSWORD);
check('demo.bits', demo.bits, 85);
check('demo.cBig', demo.cBig, '8.1');
check('demo.cUnit', demo.cUnit, 'MILLION YEARS');
check('demo.qBig', demo.qBig, '12');
check('demo.qUnit', demo.qUnit, 'WEEKS');
check('demo.label', demo.label, 'Very strong');

// Empty state
const empty = m.analyze('');
check('empty.bits', empty.bits, '—');
check('empty.pct', empty.pct, '0%');
check('empty.label', empty.label, 'Nothing to measure');

// Penalties still fire through the real zxcvbn
const weak = m.analyze('password123');
check('weak.commonNote', weak.notes.some(n => n.includes('most common')), true);

// Every page carrying the demo as a no-JS fallback must hold the same strings
const pages = {
  'index.html': readFileSync(join(root, 'public/index.html'), 'utf8'),
  'password-cracker-test.html': readFileSync(join(root, 'public/password-cracker-test.html'), 'utf8'),
};
for (const [name, html] of Object.entries(pages)) {
  for (const s of ['>8.1<', '>MILLION YEARS<', '>85<', '>12<', '>WEEKS<', 'value="Cobalt-Rope-7"']) {
    check(`${name} fallback contains ${s}`, html.includes(s), true);
  }
}

// The static crack-time table must be the generator's verbatim output
const { rows } = await import(join(root, 'scripts/generate-crack-table.mjs'));
for (const row of rows()) {
  check(`table row present: ${row.slice(8, 48)}…`, pages['password-cracker-test.html'].includes(row), true);
}

// FAQPage JSON-LD must mirror visible copy (rich-result requirement)
for (const [name, html] of Object.entries(pages)) {
  for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const data = JSON.parse(block[1]);
    if (data['@type'] !== 'FAQPage') continue;
    for (const q of data.mainEntity) {
      const vis = q.acceptedAnswer.text.replace(/&/g, '&amp;');
      check(`${name} FAQ visible: "${q.name.slice(0, 40)}…"`, html.includes(vis) || html.includes(q.acceptedAnswer.text), true);
    }
  }
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nAll crack-model contract checks passed.');
