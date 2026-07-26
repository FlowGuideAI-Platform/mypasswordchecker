// Generates the static crack-time table rows for /password-cracker-test.
// Values come from the live model (crack-model.js + real zxcvbn) so the table
// can never contradict the tool. Run as a CLI to print the <tbody> rows, or
// import rows() — scripts/test-crack-model.mjs asserts each row appears
// verbatim in the page, which is what makes "never hand-edit" enforceable.
//
// Usage: node scripts/generate-crack-table.mjs
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
globalThis.zxcvbn = createRequire(import.meta.url)(join(root, 'public/js/vendor/zxcvbn-4.4.2.js'));
const { analyze, DEMO_PASSWORD } = await import(join(root, 'public/js/crack-model.js'));

// Exemplars are random-looking (no dictionary/sequence hits) so each row shows
// the pure charset-and-length behaviour of its class.
const EXEMPLARS = [
  ['8 lowercase letters', 'kqzvmxrw'],
  ['10 digits (PIN-style)', '7391852069'],
  ['8 mixed — upper, lower, digit, symbol', 'Kq7#vXz2'],
  ['12 mixed characters', 'Kq7#vXz2Lm9!'],
  [`${DEMO_PASSWORD.length} mixed characters (like the demo)`, DEMO_PASSWORD],
  ['16 mixed characters', 'Kq7#vXz2Lm9!Tf4&'],
  ['20 mixed characters', 'Kq7#vXz2Lm9!Tf4&Wb6@'],
  ['6 random words, hyphenated', 'plinth-gorse-fjord-umber-quill-basalt'],
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function rows() {
  return EXEMPLARS.map(([label, pw]) => {
    const r = analyze(pw);
    return `<tr><td>${esc(label)}</td><td>${r.bits}</td><td>${esc(`${r.cBig} ${r.cUnit.toLowerCase()}`)}</td><td>${esc(`${r.qBig} ${r.qUnit.toLowerCase()}`)}</td></tr>`;
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const row of rows()) console.log(`          ${row}`);
}
