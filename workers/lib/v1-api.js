// v1 public API — the paid product.
//
// Every endpoint runs the same gate before doing any work:
//   key active → IP allowlist → verified-domain origin → per-feature quota,
// then increments that feature's counter and logs metadata only.
//
// The domain/IP gate is the anti-abuse story the site advertises: a key only
// answers from origins its owner proved they control, so a leaked or resold
// key cannot be pointed at a phishing page to harvest passwords.
//
// PASSWORDS ARE NEVER LOGGED, STORED, OR ECHOED. Scoring happens in memory and
// the request body is discarded with the request.
import {
  analyze, estimateTimes, classicalSeconds, quantumSeconds, timeLabel,
  strengthCategory, score0to4, strengthLabel, TARGET_BITS,
  SECONDS_PER_DAY, SECONDS_PER_YEAR, QUANTUM_NOTE, installEngineGlobals,
} from './scoring.js';
import { PhoneticGenerator } from '../../public/js/phonetic-generator.js';

installEngineGlobals();

// feature → the api_keys columns holding its allowance.
const FEATURES = {
  check:    { used: 'quota_used',    limit: 'quota_limit',    label: 'password checks' },
  quantum:  { used: 'quantum_used',  limit: 'quantum_limit',  label: 'quantum estimates' },
  phonetic: { used: 'phonetic_used', limit: 'phonetic_limit', label: 'phonetic generations' },
  breach:   { used: 'breach_used',   limit: 'breach_limit',   label: 'breach checks' },
};

const json = (data, status, headers) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });

function readKey(request) {
  const h = request.headers;
  const direct = h.get('X-API-Key');
  if (direct) return direct.trim();
  const auth = h.get('Authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function ipAllowed(allowedIpsJson, sourceIp) {
  if (!allowedIpsJson) return true;
  let list;
  try { list = JSON.parse(allowedIpsJson); } catch (e) { return true; }
  if (!Array.isArray(list) || list.length === 0) return true;
  return !!sourceIp && list.includes(sourceIp);
}

function originHost(request) {
  const raw = request.headers.get('Origin') || request.headers.get('Referer') || '';
  if (!raw) return null;
  try { return new URL(raw).hostname.toLowerCase().replace(/^www\./, ''); } catch (e) { return null; }
}

// Server-to-server calls carry no Origin/Referer — those are gated by the IP
// allowlist instead. A browser-origin call must come from a verified domain.
async function domainAllowed(env, key, request) {
  const host = originHost(request);
  if (!host) return { ok: true, origin: null };

  const rows = await env.DB.prepare(
    `SELECT domain FROM domain_verifications WHERE api_key = ? AND status = 'verified'`
  ).bind(key.api_key).all();
  const verified = (rows.results || []).map((r) => String(r.domain).toLowerCase().replace(/^www\./, ''));

  if (key.allowed_domains) {
    try {
      const extra = JSON.parse(key.allowed_domains);
      if (Array.isArray(extra)) for (const d of extra) verified.push(String(d).toLowerCase().replace(/^www\./, ''));
    } catch (e) { /* malformed column — fall back to the verifications table */ }
  }

  if (!verified.length) return { ok: false, origin: host, reason: 'no_verified_domains' };
  const ok = verified.some((d) => host === d || host.endsWith('.' + d));
  return { ok, origin: host, verified };
}

/**
 * The gate. Returns {error: Response} or {key, feature, usage}.
 * Increments the feature counter on success (D1 + KV cache invalidation).
 */
async function authorize(request, env, feature) {
  const apiKey = readKey(request);
  if (!apiKey) {
    return { error: json({ error: 'Missing API key', message: 'Send your key as X-API-Key or Authorization: Bearer.' }, 401) };
  }

  const key = await env.DB.prepare(
    `SELECT * FROM api_keys WHERE api_key = ? AND status = 'active'`
  ).bind(apiKey).first();
  if (!key) {
    return { error: json({ error: 'Invalid API key', message: 'Key not found, inactive, or suspended.' }, 401) };
  }

  const sourceIp = request.headers.get('CF-Connecting-IP') || '';
  if (!ipAllowed(key.allowed_ips, sourceIp)) {
    return { error: json({
      error: 'IP not allowed',
      message: 'This key is restricted to verified IP addresses and this request did not come from one.',
      source_ip: sourceIp || null,
    }, 403) };
  }

  const dom = await domainAllowed(env, key, request);
  if (!dom.ok) {
    return { error: json({
      error: 'Domain not verified',
      message: dom.reason === 'no_verified_domains'
        ? 'This key has no verified domains. Verify the domain you are calling from in the developer dashboard.'
        : `Requests from "${dom.origin}" are not permitted for this key. Verify that domain in the developer dashboard.`,
      origin: dom.origin,
      docs: 'https://mypasswordchecker.com/docs#domain-verification',
    }, 403) };
  }

  const col = FEATURES[feature];
  const limit = Number(key[col.limit] ?? 0);
  const used = Number(key[col.used] ?? 0);
  const overageBlocked = key.overage_blocked === 0 ? 0 : 1;

  if (limit > 0 && used >= limit && overageBlocked) {
    return { error: json({
      error: 'Rate limit exceeded',
      message: `You have used all ${limit} ${col.label} for this billing period.`,
      quota_reset: key.billing_cycle_end || null,
    }, 429) };
  }
  if (limit <= 0) {
    return { error: json({
      error: 'Feature not included',
      message: `Your tier does not include ${col.label}. See https://mypasswordchecker.com/pricing.`,
    }, 403) };
  }

  await env.DB.prepare(
    `UPDATE api_keys SET ${col.used} = ${col.used} + 1, total_requests = COALESCE(total_requests, 0) + 1,
     last_used_at = ? WHERE api_key = ?`
  ).bind(new Date().toISOString(), apiKey).run();

  // The cached verify-api-key payload now has a stale counter — drop it.
  try { await env.API_KEYS.delete(apiKey); } catch (e) { /* cache miss is fine */ }

  return {
    key,
    usage: {
      used: used + 1,
      quota: limit,
      remaining: Math.max(0, limit - (used + 1)),
      over_quota: used + 1 > limit,
    },
  };
}

// Metadata only — feature, endpoint, status. Never the password.
async function logUsage(env, ctx, { apiKey, feature, endpoint, request, status, ms }) {
  const write = env.DB.prepare(
    `INSERT INTO usage_tracking (timestamp, api_key, feature, endpoint, user_ip, user_agent, request_duration_ms, success, http_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    new Date().toISOString(), apiKey, feature, endpoint,
    request.headers.get('CF-Connecting-IP') || null,
    (request.headers.get('User-Agent') || '').slice(0, 255),
    ms, status < 400 ? 1 : 0, status
  ).run().catch((e) => console.error('usage log failed:', e.message));
  if (ctx && ctx.waitUntil) ctx.waitUntil(write); else await write;
}

async function readBody(request) {
  try { return await request.json(); } catch (e) { return null; }
}

// ── POST /api/v1/check-password ────────────────────────────────────────────
async function checkPassword(request, env, gate) {
  const body = await readBody(request);
  const password = body && typeof body.password === 'string' ? body.password : null;
  if (!password) return json({ error: 'Invalid request', message: 'Body must be JSON with a "password" string.' }, 400);

  const a = analyze(password);
  const cSec = classicalSeconds(a.bitsExact);
  const qSec = quantumSeconds(a.bitsExact);

  return json({
    success: true,
    strength: strengthCategory(a.bitsExact),
    score: score0to4(a.bitsExact),
    label: strengthLabel(a.bitsExact),
    entropy: Number(a.bitsExact.toFixed(2)),
    crack_time: {
      classical_display: timeLabel(cSec),
      classical_seconds: cSec,
      quantum_display: timeLabel(qSec),
      quantum_seconds: qSec,
      assumptions: 'Classical: 10^11 guesses/sec (one rented GPU rig, offline against a leaked hash). Quantum: 10^6 Grover iterations/sec.',
    },
    quantum_resistant: Math.round(a.bitsExact) >= TARGET_BITS,
    feedback: { warning: a.warnings[0] || '', warnings: a.warnings, suggestions: a.suggestions },
    usage: gate.usage,
  }, 200);
}

// ── POST /api/v1/estimate-quantum (alias: /quantum-estimate) ───────────────
async function estimateQuantum(request, env, gate) {
  const body = await readBody(request);
  const password = body && typeof body.password === 'string' ? body.password : null;
  if (!password) return json({ error: 'Invalid request', message: 'Body must be JSON with a "password" string.' }, 400);

  const est = estimateTimes(password);
  const quantum = {};
  for (const [name, v] of Object.entries(est.quantum)) {
    quantum[name] = { time_display: v.human.label, time_seconds: v.human.seconds, iterations_per_sec: v.rate, scenario: v.scenario };
  }

  return json({
    success: true,
    entropy_bits: est.bits,
    classical: { time_display: est.classical.human.label, time_seconds: est.classical.human.seconds, guesses_per_sec: est.classical.R_c },
    quantum,
    grover: { time_display: est.grover.human.label, time_seconds: est.grover.human.seconds, iterations_per_sec: est.grover.rate },
    quantum_resistant: Math.round(est.bits) >= TARGET_BITS,
    recommendation: Math.round(est.bits) >= TARGET_BITS
      ? `This password holds ${Math.round(est.bits)} bits — past the ${TARGET_BITS}-bit bar that survives a Grover halving.`
      : `Password should have ${TARGET_BITS}+ bits to stay ahead of a quantum halving; this one has ${Math.round(est.bits)}.`,
    note: QUANTUM_NOTE,
    usage: gate.usage,
  }, 200);
}

// ── POST /api/v1/generate-phonetic ─────────────────────────────────────────
async function generatePhonetic(request, env, gate) {
  const body = await readBody(request);
  const phrase = body && typeof body.phrase === 'string' ? body.phrase.trim() : null;
  if (!phrase) return json({ error: 'Invalid request', message: 'Body must be JSON with a "phrase" string.' }, 400);
  if (phrase.length < 10) return json({ error: 'Phrase too short', message: 'Use at least 10 characters — longer phrases make stronger passwords.' }, 400);

  const count = Math.min(Math.max(parseInt(body.count, 10) || 5, 1), 10);
  const allowed = ['very-low', 'low', 'medium', 'high', 'very-high'];
  const aggressiveness = allowed.includes(body.aggressiveness) ? body.aggressiveness : 'medium';

  let variations;
  try {
    variations = PhoneticGenerator.generateMultiple(phrase, count, { aggressiveness });
  } catch (e) {
    return json({ error: 'Generation failed', message: e.message }, 400);
  }

  return json({
    success: true,
    variations: variations.map((v) => {
      const a = analyze(v.password);
      return {
        password: v.password,
        entropy: Number(a.bitsExact.toFixed(1)),
        length: v.password.length,
        pattern: v.pattern,
        quantum_resistant: Math.round(a.bitsExact) >= TARGET_BITS,
        classical_time: timeLabel(classicalSeconds(a.bitsExact)),
        quantum_time: timeLabel(quantumSeconds(a.bitsExact)),
      };
    }),
    usage: gate.usage,
  }, 200);
}

// ── POST /api/v1/breach-check ──────────────────────────────────────────────
// k-anonymity: only the first 5 characters of the SHA-1 ever leave this Worker.
async function breachCheck(request, env, gate) {
  const body = await readBody(request);
  if (!body) return json({ error: 'Invalid request', message: 'Body must be JSON.' }, 400);

  let hash = typeof body.password_hash === 'string' ? body.password_hash.trim().toUpperCase() : null;
  if (!hash && typeof body.password === 'string' && body.password) {
    const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(body.password));
    hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  if (!hash || !/^[0-9A-F]{40}$/.test(hash)) {
    return json({ error: 'Invalid request', message: 'Send "password_hash" (SHA-1 hex) or "password".' }, 400);
  }

  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { 'Add-Padding': 'true', 'User-Agent': 'mypasswordchecker.com-api' },
  });
  if (!res.ok) return json({ error: 'Breach service unavailable', message: `Upstream returned ${res.status}.` }, 502);

  const text = await res.text();
  let count = 0;
  let setSize = 0;
  for (const line of text.split('\n')) {
    const [suf, c] = line.trim().split(':');
    if (!suf) continue;
    const n = parseInt(c, 10) || 0;
    if (n > 0) setSize++;
    if (suf.toUpperCase() === suffix) count = n;
  }

  return json({
    success: true,
    pwned: count > 0,
    breach_count: count,
    message: count > 0
      ? `Password found in ${count.toLocaleString('en-US')} data breaches. Change it immediately.`
      : 'Password not found in known data breaches.',
    privacy_details: {
      method: 'k-anonymity',
      prefix_sent: prefix,
      anonymity_set_size: setSize,
      data_shared: '5 characters of hash (99.9875% kept private)',
    },
    usage: gate.usage,
  }, 200);
}

const ROUTES = {
  '/api/v1/check-password':    { feature: 'check',    handler: checkPassword },
  '/api/v1/estimate-quantum':  { feature: 'quantum',  handler: estimateQuantum },
  '/api/v1/quantum-estimate':  { feature: 'quantum',  handler: estimateQuantum }, // documented alias
  '/api/v1/generate-phonetic': { feature: 'phonetic', handler: generatePhonetic },
  '/api/v1/breach-check':      { feature: 'breach',   handler: breachCheck },
};

export const V1_ROUTES = Object.keys(ROUTES);

/**
 * Dispatch a /api/v1/* request. Returns null when the path isn't ours, so the
 * caller can fall through to its own routing.
 */
export async function handleV1(request, env, ctx, corsHeaders = {}) {
  const url = new URL(request.url);
  const route = ROUTES[url.pathname];
  if (!route) return null;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed', message: `${url.pathname} accepts POST.` }, 405, corsHeaders);
  }

  const started = Date.now();
  let response;
  let apiKey = readKey(request) || null;
  try {
    const gate = await authorize(request, env, route.feature);
    response = gate.error ? gate.error : await route.handler(request, env, gate);
  } catch (err) {
    console.error(`v1 ${url.pathname} error:`, err && err.message);
    response = json({ error: 'Internal error', message: 'The request could not be completed.' }, 500);
  }

  await logUsage(env, ctx, {
    apiKey, feature: route.feature, endpoint: url.pathname, request,
    status: response.status, ms: Date.now() - started,
  });

  for (const [k, v] of Object.entries(corsHeaders)) response.headers.set(k, v);
  return response;
}
