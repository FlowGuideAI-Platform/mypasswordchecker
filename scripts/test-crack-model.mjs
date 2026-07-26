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

// The homepage's no-JS fallback must carry the same demo strings
const html = readFileSync(join(root, 'public/index.html'), 'utf8');
for (const s of ['>8.1<', '>MILLION YEARS<', '>85<', '>12<', '>WEEKS<', 'value="Cobalt-Rope-7"']) {
  check(`index.html fallback contains ${s}`, html.includes(s), true);
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nAll crack-model contract checks passed.');
