/**
 * Password strength + crack-time analyzer for the Free Password Checker page.
 *
 * Reads from #password-input and renders into the strength meter, crack-time
 * display, and feedback panel. Depends on the global QuantumEstimator
 * (/js/quantum-estimator.js) and zxcvbn (loaded from CDN).
 *
 * Uses DOM methods (textContent / createElement) rather than innerHTML so it
 * is safe regardless of what zxcvbn surfaces in its feedback strings.
 */
(function () {
  const passwordInput = document.getElementById('password-input');
  if (!passwordInput) return;

  const toggleBtn = document.getElementById('toggle-btn');
  const strengthMeter = document.getElementById('strength-meter');
  const strengthBar = document.getElementById('strength-bar');
  const strengthLabel = document.getElementById('strength-label');
  const crackTimeDisplay = document.getElementById('crack-time-display');
  const classicalTime = document.getElementById('classical-time');
  const entropyBits = document.getElementById('entropy-bits');
  const feedbackSection = document.getElementById('feedback-section');
  const feedbackWarning = document.getElementById('feedback-warning');
  const feedbackSuggestions = document.getElementById('feedback-suggestions');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      const next = passwordInput.type === 'password' ? 'text' : 'password';
      passwordInput.type = next;
      toggleBtn.textContent = next === 'password' ? '👁️' : '🙈';
    });
  }

  function clear(el) {
    while (el && el.firstChild) el.removeChild(el.firstChild);
  }

  function renderCrackTime(humanLabel, technicalLabel) {
    clear(classicalTime);
    classicalTime.appendChild(document.createTextNode(humanLabel));
    if (technicalLabel) {
      classicalTime.appendChild(document.createElement('br'));
      const span = document.createElement('span');
      span.style.fontSize = '0.85em';
      span.style.opacity = '0.7';
      span.textContent = '(' + technicalLabel + ')';
      classicalTime.appendChild(span);
    }
  }

  function renderSuggestions(suggestions) {
    clear(feedbackSuggestions);
    if (!suggestions || !suggestions.length) return;
    const p = document.createElement('p');
    p.style.fontSize = '0.875rem';
    p.style.marginTop = '0.5rem';
    const strong = document.createElement('strong');
    strong.textContent = 'Suggestions:';
    p.appendChild(strong);
    const ul = document.createElement('ul');
    ul.style.marginLeft = '1.5rem';
    ul.style.fontSize = '0.875rem';
    suggestions.forEach(function (s) {
      const li = document.createElement('li');
      li.textContent = s;
      ul.appendChild(li);
    });
    feedbackSuggestions.appendChild(p);
    feedbackSuggestions.appendChild(ul);
  }

  passwordInput.addEventListener('input', function () {
    const password = passwordInput.value;

    if (password.length === 0) {
      if (strengthMeter) strengthMeter.style.display = 'none';
      if (crackTimeDisplay) crackTimeDisplay.style.display = 'none';
      if (feedbackSection) feedbackSection.style.display = 'none';
      return;
    }

    if (typeof QuantumEstimator === 'undefined') return;
    const result = QuantumEstimator.estimateTimes(password);
    const indicator = QuantumEstimator.getStrengthIndicator(result.zxcvbn.score);

    if (strengthMeter) {
      strengthMeter.style.display = 'block';
      if (strengthBar) {
        strengthBar.style.width = indicator.width;
        strengthBar.style.backgroundColor = indicator.color;
      }
      if (strengthLabel) {
        strengthLabel.textContent = indicator.label;
        strengthLabel.style.color = indicator.color;
      }
    }

    if (crackTimeDisplay && classicalTime) {
      crackTimeDisplay.style.display = 'block';
      renderCrackTime(result.classical.human.label, result.classical.human.technical);
      if (entropyBits) entropyBits.textContent = result.bits.toFixed(1);
    }

    if (feedbackSection) {
      const fb = result.zxcvbn.feedback || {};
      if (fb.warning || (fb.suggestions && fb.suggestions.length)) {
        feedbackSection.style.display = 'block';
        if (feedbackWarning) {
          if (fb.warning) {
            feedbackWarning.style.display = 'block';
            feedbackWarning.textContent = '⚠️ ' + fb.warning;
          } else {
            feedbackWarning.style.display = 'none';
          }
        }
        renderSuggestions(fb.suggestions);
      } else {
        feedbackSection.style.display = 'none';
      }
    }
  });
})();
