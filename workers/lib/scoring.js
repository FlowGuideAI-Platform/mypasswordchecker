// Server-side scoring for the v1 API.
//
// This is the SAME model the site's client-side checker runs
// (public/js/crack-model.js): identical charset entropy, identical penalty
// table, identical time ladder and strength labels — so an API answer and the
// public checker never disagree about the same password.
//
// The one implementation difference is the dictionary layer. In the browser
// that layer is zxcvbn (804 KB); in the Worker it is the bundled top-10k list
// (72 KB), applied with the same rule crack-model uses against zxcvbn's
// passwords dictionary: a hit counts only when the matched token covers ≥60%
// of the input, so "Cobalt-Rope-7" is priced by its entropy rather than
// punished for containing a word.
import { COMMON_PASSWORDS, COMMON_RANK } from './common-passwords.js';

export const CLASSICAL_GUESSES_PER_SEC = 1e11; // one rented GPU rig, offline, leaked hash
export const GROVER_ITERS_PER_SEC = 1e6;       // sequential oracle queries + QEC overhead
export const TARGET_BITS = 100;
export const SECONDS_PER_DAY = 86400;
export const SECONDS_PER_YEAR = 31557600;      // Julian year

// Quantum hardware scenarios, matching the site's quantum estimator.
export const QUANTUM_SCENARIOS = {
  pessimistic: { rate: 1e3, scenario: 'Early quantum computers (2025-2030)' },
  plausible:   { rate: 1e5, scenario: 'Mid-term quantum systems (2030-2040)' },
  optimistic:  { rate: 1e7, scenario: 'Mature quantum computers (2040+)' },
};

export const QUANTUM_NOTE =
  'Quantum estimates are theoretical and depend on speculative quantum hardware capabilities. ' +
  'This is an educational estimate only — we make no guarantee of its accuracy in a real-world ' +
  'quantum attack scenario. Passwords are scored in memory and never stored or logged.';

const UNITS = [
  [1, 'seconds'], [60, 'minutes'], [3600, 'hours'], [SECONDS_PER_DAY, 'days'],
  [7 * SECONDS_PER_DAY, 'weeks'], [SECONDS_PER_YEAR, 'years'],
  [SECONDS_PER_YEAR * 1e3, 'thousand years'], [SECONDS_PER_YEAR * 1e6, 'million years'],
  [SECONDS_PER_YEAR * 1e9, 'billion years'], [SECONDS_PER_YEAR * 1e12, 'trillion years'],
  [SECONDS_PER_YEAR * 1e15, 'quadrillion years'], [SECONDS_PER_YEAR * 1e18, 'quintillion years'],
];
const TIME_CAP = UNITS[UNITS.length - 1][0] * 1000;

export function fmtTime(sec) {
  if (!isFinite(sec) || sec > TIME_CAP) return ['∞', 'beyond estimate'];
  if (sec < 1) return ['<1', 'second'];
  let k = 0;
  for (let i = 0; i < UNITS.length; i++) if (sec >= UNITS[i][0]) k = i;
  const v = sec / UNITS[k][0];
  const n = v >= 100 ? Math.round(v).toLocaleString('en-US') : v >= 10 ? String(Math.round(v)) : v.toFixed(1);
  return [n, UNITS[k][1]];
}

export const timeLabel = (sec) => fmtTime(sec).join(' ');

export function strengthLabel(bits) {
  const b = Math.round(bits);
  return b < 28 ? 'Very weak' : b < 36 ? 'Weak' : b < 60 ? 'Fair'
    : b < 80 ? 'Strong' : b < TARGET_BITS ? 'Very strong' : 'Quantum-ready';
}

// zxcvbn-compatible 0–4 score, derived from the same bit thresholds.
export function score0to4(bits) {
  const b = Math.round(bits);
  return b < 28 ? 0 : b < 36 ? 1 : b < 60 ? 2 : b < 80 ? 3 : 4;
}

// Documented `strength` vocabulary (lowercase five-step).
export function strengthCategory(bits) {
  return ['very weak', 'weak', 'medium', 'strong', 'very strong'][score0to4(bits)];
}

// A dictionary hit that dominates the password (≥60% coverage), mirroring the
// client's zxcvbn rule. Returns {token, rank} or null.
function commonPasswordHit(pw) {
  const low = pw.toLowerCase();
  if (COMMON_PASSWORDS.has(low)) return { token: low, rank: COMMON_RANK.get(low) };
  const minLen = Math.ceil(pw.length * 0.6);
  for (let start = 0; start + minLen <= low.length; start++) {
    for (let end = low.length; end - start >= minLen; end--) {
      const slice = low.slice(start, end);
      if (COMMON_PASSWORDS.has(slice)) return { token: slice, rank: COMMON_RANK.get(slice) };
    }
  }
  return null;
}

export function charsetSize(pw) {
  let set = 0;
  if (/[a-z]/.test(pw)) set += 26;
  if (/[A-Z]/.test(pw)) set += 26;
  if (/[0-9]/.test(pw)) set += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) set += 33;
  return set;
}

/**
 * Core analysis — entropy after penalties, plus the named weaknesses.
 * Pure function of the password; nothing is retained.
 */
export function analyze(pw) {
  if (!pw) {
    return { bits: 0, bitsExact: 0, charset: 0, warnings: [], suggestions: ['Enter a password to analyze.'] };
  }
  const set = charsetSize(pw);
  let bits = pw.length * Math.log2(set || 2);
  const warnings = [];
  let pen = 0;

  const hit = commonPasswordHit(pw);
  if (hit) { pen += Math.min(bits * 0.6, 32); warnings.push('Contains one of the ten thousand most common passwords.'); }
  if (/(.)\1{2,}/.test(pw)) { pen += 6; warnings.push('A character repeats three or more times in a row.'); }
  if (/(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|qwer|wert|asdf|zxcv)/i.test(pw)) {
    pen += 9; warnings.push('Contains a keyboard walk or a counting sequence.');
  }
  if (/^[a-z]+$/.test(pw)) { pen += 5; warnings.push('Lowercase letters only — no case, digits or symbols.'); }
  if (/^[0-9]+$/.test(pw)) { pen += 8; warnings.push('Digits only. A PIN-shaped password is guessed first.'); }
  if (/(19|20)\d\d/.test(pw)) { pen += 4; warnings.push('Contains something shaped like a year.'); }
  if (pw.length < 12) { pen += 3; warnings.push('Under twelve characters. Length beats cleverness.'); }

  bits = Math.max(1, bits - pen);

  const suggestions = [];
  if (pw.length < 16) suggestions.push('Add length — every character multiplies the work an attacker must do.');
  if (set < 62) suggestions.push('Mix character classes: upper, lower, digits and symbols.');
  if (hit) suggestions.push('Avoid passwords that appear in breach dictionaries, even with substitutions.');
  if (Math.round(bits) < TARGET_BITS) {
    suggestions.push(`Aim for ${TARGET_BITS}+ bits to stay ahead of a quantum halving — about 25 random characters, or six random words.`);
  }
  if (!warnings.length) warnings.push('No common patterns, walks or repeats found.');

  return { bits: Math.round(bits), bitsExact: bits, charset: set, warnings, suggestions };
}

export function classicalSeconds(bits) {
  return Math.pow(2, Math.max(0, bits - 1)) / CLASSICAL_GUESSES_PER_SEC;
}

// Grover halves the effective exponent: 2^(bits/2) sequential oracle queries.
export function quantumSeconds(bits, rate = GROVER_ITERS_PER_SEC) {
  return Math.pow(2, bits / 2) / rate;
}

/**
 * The full estimate object. Shape matches what the client engine returns, so
 * the bundled PhoneticGenerator can consume it unchanged.
 */
export function estimateTimes(password) {
  const a = analyze(password || '');
  const bits = a.bitsExact;
  const cSec = classicalSeconds(bits);

  const quantum = {};
  for (const [name, { rate, scenario }] of Object.entries(QUANTUM_SCENARIOS)) {
    const qSec = quantumSeconds(bits, rate);
    quantum[name] = {
      rate,
      scenario,
      human: { label: timeLabel(qSec), seconds: qSec },
    };
  }

  return {
    passwordLength: (password || '').length,
    bits: Number(bits.toFixed(3)),
    charset: a.charset,
    classical: {
      R_c: CLASSICAL_GUESSES_PER_SEC,
      human: { label: timeLabel(cSec), seconds: cSec },
      bitsOfSecurity: bits,
    },
    quantum,
    // The site's canonical single-figure Grover estimate (10^6 iterations/sec),
    // the same number the public checker prints.
    grover: { rate: GROVER_ITERS_PER_SEC, human: { label: timeLabel(quantumSeconds(bits)), seconds: quantumSeconds(bits) } },
    zxcvbn: { score: score0to4(bits), feedback: { warning: a.warnings[0] || '', suggestions: a.suggestions } },
    warnings: a.warnings,
    suggestions: a.suggestions,
    note: QUANTUM_NOTE,
  };
}

// Shim for the bundled client engines (phonetic-generator.js reads these as
// globals at call time).
export function installEngineGlobals(scope = globalThis) {
  if (!scope.QuantumEstimator) {
    scope.QuantumEstimator = {
      calculateEntropy: (pw) => analyze(pw || '').bitsExact,
      estimateTimes,
    };
  }
}
