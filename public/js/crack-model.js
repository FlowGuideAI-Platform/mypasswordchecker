// Single source of truth for every crack-time figure on the site.
// The printed caption and the computed value MUST move together (README: "Interactions") —
// captions below are generated from these constants; never hand-type a rate elsewhere.
export const CLASSICAL_GUESSES_PER_SEC = 1e11; // one rented GPU rig, offline, leaked hash
export const GROVER_ITERS_PER_SEC = 1e6;       // sequential oracle queries + QEC overhead — NOT GPU-parallel
export const TARGET_BITS = 100;

export const DEMO_PASSWORD = 'Cobalt-Rope-7';  // design-pinned demo (DESIGN.md §2); contract enforced by scripts/test-crack-model.mjs
export const METER_FULL_BITS = 128;            // strength-meter full scale

export const SECONDS_PER_DAY = 86400;
export const SECONDS_PER_YEAR = 31557600;      // Julian year

const SUPERSCRIPTS = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const pow10 = (n) => '10' + String(Math.round(Math.log10(n))).split('').map(d => SUPERSCRIPTS[d]).join('');

export const CAPTIONS = {
  gpu: `At ${pow10(CLASSICAL_GUESSES_PER_SEC)} guesses per second — a single rented GPU rig, offline against a leaked hash.`,
  entropy: `Every bit doubles the work. 60 is fair, 80 is strong, ${TARGET_BITS} or more survives a quantum halving.`,
  quantum: `A machine this large does not exist yet. This is a future-proofing estimate at ${pow10(GROVER_ITERS_PER_SEC)} Grover iterations per second, not today's threat.`,
  target: `Target: ${TARGET_BITS} bits`,
};

const UNITS = [[1, 'seconds'], [60, 'minutes'], [3600, 'hours'], [SECONDS_PER_DAY, 'days'], [7 * SECONDS_PER_DAY, 'weeks'], [SECONDS_PER_YEAR, 'years'], [SECONDS_PER_YEAR * 1e3, 'thousand years'], [SECONDS_PER_YEAR * 1e6, 'million years'], [SECONDS_PER_YEAR * 1e9, 'billion years'], [SECONDS_PER_YEAR * 1e12, 'trillion years'], [SECONDS_PER_YEAR * 1e15, 'quadrillion years'], [SECONDS_PER_YEAR * 1e18, 'quintillion years']];

const TIME_CAP = UNITS[UNITS.length - 1][0] * 1000; // ~10²¹ years — "beyond estimate"

export function fmtTime(sec) {
  if (!isFinite(sec) || sec > TIME_CAP) return ['∞', 'beyond estimate'];
  if (sec < 1) return ['<1', 'second'];
  let k = 0;
  for (let i = 0; i < UNITS.length; i++) if (sec >= UNITS[i][0]) k = i;
  const v = sec / UNITS[k][0];
  const n = v >= 100 ? Math.round(v).toLocaleString('en-US') : v >= 10 ? String(Math.round(v)) : v.toFixed(1);
  return [n, UNITS[k][1]];
}

export function strengthLabel(bits) {
  const b = Math.round(bits);
  return b < 28 ? 'Very weak' : b < 36 ? 'Weak' : b < 60 ? 'Fair' : b < 80 ? 'Strong' : b < TARGET_BITS ? 'Very strong' : 'Quantum-ready';
}

// The real zxcvbn (self-hosted, loaded as a classic script before this module).
// The bare typeof resolves through the global scope in both browser and Node.
const zx = () => (typeof zxcvbn === 'function' ? zxcvbn : undefined);

// "Contains a common password" means the password essentially IS one — a
// passwords-dictionary match (rank ≤ 10k) covering ≥60% of the input. A strong
// hyphenated password that merely contains a word ("Cobalt-Rope-7") is priced
// by the entropy math, not punished twice.
function zxcvbnSignals(pw) {
  const fn = zx();
  if (typeof fn !== 'function') return { common: false, walk: false, repeat: false };
  // zxcvbn matching is superlinear in length; cap the signal pass so a long
  // paste stays under a keystroke budget. Entropy math still uses full length.
  const seq = fn(pw.slice(0, 72)).sequence || [];
  return {
    common: seq.some(m => m.pattern === 'dictionary' && m.dictionary_name === 'passwords'
      && m.rank <= 10000 && m.token.length / pw.length >= 0.6),
    // spatial = keyboard adjacency; sequence = counting runs (incl. descending)
    walk: seq.some(m => (m.pattern === 'spatial' || m.pattern === 'sequence') && m.token.length >= 4),
    repeat: seq.some(m => m.pattern === 'repeat' && m.token.length >= 3),
  };
}

// One-entry memo: the prototype re-invokes analysis on renders that don't change
// the password (Show/Hide toggle, ad-rail tick); zxcvbn is the dominant cost.
let lastPw, lastResult;

export function analyze(pw) {
  if (pw === lastPw && lastResult) return lastResult;
  lastPw = pw; lastResult = compute(pw);
  return lastResult;
}

function compute(pw) {
  if (!pw) return { bits: '—', bitsExact: null, classicalSeconds: null, quantumSeconds: null, pct: '0%', label: 'Nothing to measure', cBig: '—', cUnit: '', qBig: '—', qUnit: '', notes: ['Type a password above to see the estimate.'] };
  let set = 0;
  if (/[a-z]/.test(pw)) set += 26;
  if (/[A-Z]/.test(pw)) set += 26;
  if (/[0-9]/.test(pw)) set += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) set += 33;
  let bits = pw.length * Math.log2(set || 2);
  const notes = [];
  let pen = 0;
  const sig = zxcvbnSignals(pw);
  // zxcvbn is the primary detector; the regexes are a deliberate fallback so the
  // repeat/walk penalties survive if the library ever fails to load.
  if (sig.common) { pen += Math.min(bits * 0.6, 32); notes.push('Contains one of the ten thousand most common passwords.'); }
  if (/(.)\1{2,}/.test(pw) || sig.repeat) { pen += 6; notes.push('A character repeats three or more times in a row.'); }
  if (/(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|qwer|wert|asdf|zxcv)/i.test(pw) || sig.walk) { pen += 9; notes.push('Contains a keyboard walk or a counting sequence.'); }
  if (/^[a-z]+$/.test(pw)) { pen += 5; notes.push('Lowercase letters only — no case, digits or symbols.'); }
  if (/^[0-9]+$/.test(pw)) { pen += 8; notes.push('Digits only. A PIN-shaped password is guessed first.'); }
  if (/(19|20)\d\d/.test(pw)) { pen += 4; notes.push('Contains something shaped like a year.'); }
  if (pw.length < 12) { pen += 3; notes.push('Under twelve characters. Length beats cleverness.'); }
  if (!notes.length) notes.push('No common patterns, walks or repeats found.');
  bits = Math.max(1, bits - pen);

  const classicalSeconds = Math.pow(2, Math.max(0, bits - 1)) / CLASSICAL_GUESSES_PER_SEC;
  const quantumSeconds = Math.pow(2, bits / 2) / GROVER_ITERS_PER_SEC;
  const [cBig, cUnit] = fmtTime(classicalSeconds);
  const [qBig, qUnit] = fmtTime(quantumSeconds);

  return {
    bits: Math.round(bits),
    bitsExact: bits,
    classicalSeconds,
    quantumSeconds,
    pct: Math.min(100, Math.round((bits / METER_FULL_BITS) * 100)) + '%',
    label: strengthLabel(bits),
    cBig, cUnit: cUnit.toUpperCase(),
    qBig, qUnit: qUnit.toUpperCase(),
    notes,
  };
}
