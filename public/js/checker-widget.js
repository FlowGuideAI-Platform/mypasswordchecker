// Shared checker widget — wires the password panel and the three result cells.
// index.html and password-cracker-test.html share this DOM id contract:
// pw, pw-toggle, meter-fill, strength-label, target-label, num-gpu, unit-gpu,
// num-bits, num-q, unit-q, weak-list, caption-gpu, caption-entropy, caption-q.
import { analyze, CAPTIONS, DEMO_PASSWORD } from '/js/crack-model.js';

export function initChecker() {
  const $ = (id) => document.getElementById(id);
  const input = $('pw');
  const toggle = $('pw-toggle');
  const meterFill = $('meter-fill');
  const strengthLabelEl = $('strength-label');
  const numGpu = $('num-gpu'), unitGpu = $('unit-gpu');
  const numBits = $('num-bits');
  const numQ = $('num-q'), unitQ = $('unit-q');
  const weakList = $('weak-list');

  // Captions are generated from the model's constants so a printed rate can
  // never contradict a computed value (the static HTML text is a no-JS
  // fallback carrying the same strings).
  $('caption-gpu').textContent = CAPTIONS.gpu;
  $('caption-entropy').textContent = CAPTIONS.entropy;
  $('caption-q').textContent = CAPTIONS.quantum;
  $('target-label').textContent = CAPTIONS.target;

  // Synchronous recalculation on every keystroke — no debounce, no spinner,
  // no async, and never a network request (the trust row promises this).
  let lastNotesKey;
  function render() {
    const r = analyze(input.value);
    meterFill.style.width = r.pct;
    strengthLabelEl.textContent = r.label;
    numGpu.textContent = r.cBig;
    unitGpu.textContent = r.cUnit;
    numBits.textContent = r.bits;
    numQ.textContent = r.qBig;
    unitQ.textContent = r.qUnit;
    const notesKey = r.notes.join('\n');
    if (notesKey === lastNotesKey) return;
    lastNotesKey = notesKey;
    weakList.replaceChildren(...r.notes.map((t) => {
      const li = document.createElement('li');
      const dash = document.createElement('span');
      dash.className = 'dash';
      dash.textContent = '—';
      const text = document.createElement('span');
      text.textContent = t;
      li.append(dash, text);
      return li;
    }));
  }

  input.addEventListener('input', render);
  toggle.addEventListener('click', () => {
    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    toggle.textContent = hidden ? 'Hide' : 'Show';
  });

  // The design-pinned demo has one source: the model's export. The HTML value
  // attribute is only the no-JS fallback.
  input.value = DEMO_PASSWORD;
  render();
}
