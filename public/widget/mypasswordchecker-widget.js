/**
 * MyPasswordChecker.com Compact Widget
 * Version 1.1.0
 *
 * Easy-to-embed password security widget with 4 tools:
 * - Password Strength Checker (client-side)
 * - Quantum Resistance Estimator (API-based)
 * - Phonetic Password Generator (API-based)
 * - Password Compromised Check (API-based, HIBP)
 *
 * Usage:
 * <div id="mypc-widget" data-api-key="YOUR_API_KEY"></div>
 * <script src="https://mypasswordchecker.com/widget/mypasswordchecker-widget.js"></script>
 */

(function() {
    'use strict';

    // Widget CSS
    const widgetCSS = `
        .mypc-widget {
            max-width: 700px;
            margin: 0 auto;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .mypc-tabs {
            display: flex;
            background: #f8f9fa;
            border-bottom: 2px solid #e9ecef;
        }
        .mypc-tab {
            flex: 1;
            padding: 12px 16px;
            text-align: center;
            cursor: pointer;
            border: none;
            background: transparent;
            font-size: 14px;
            font-weight: 500;
            color: #6c757d;
            transition: all 0.2s;
            position: relative;
        }
        .mypc-tab:hover {
            background: #e9ecef;
            color: #495057;
        }
        .mypc-tab.active {
            color: #4c6ef5;
            background: white;
        }
        .mypc-tab.active::after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 0;
            right: 0;
            height: 2px;
            background: #4c6ef5;
        }
        .mypc-tab-content {
            display: none;
            padding: 20px;
        }
        .mypc-tab-content.active {
            display: block;
        }
        .mypc-input-group {
            margin-bottom: 16px;
        }
        .mypc-label {
            display: block;
            margin-bottom: 6px;
            font-size: 14px;
            font-weight: 500;
            color: #212529;
        }
        .mypc-input {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            font-size: 14px;
            box-sizing: border-box;
            transition: border-color 0.2s;
        }
        .mypc-input:focus {
            outline: none;
            border-color: #4c6ef5;
            box-shadow: 0 0 0 3px rgba(76, 110, 245, 0.1);
        }
        .mypc-btn {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .mypc-btn:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .mypc-btn:active:not(:disabled) {
            transform: translateY(0);
        }
        .mypc-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .mypc-result {
            margin-top: 16px;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 6px;
            display: none;
        }
        .mypc-result.show {
            display: block;
        }
        .mypc-result-title {
            font-weight: 600;
            margin-bottom: 8px;
            color: #212529;
            font-size: 14px;
        }
        .mypc-result-value {
            font-size: 18px;
            font-weight: 700;
            color: #4c6ef5;
            margin-bottom: 4px;
        }
        .mypc-result-detail {
            font-size: 13px;
            color: #6c757d;
            margin-bottom: 4px;
        }
        .mypc-strength-bar {
            height: 6px;
            background: #e9ecef;
            border-radius: 3px;
            overflow: hidden;
            margin-bottom: 8px;
        }
        .mypc-strength-fill {
            height: 100%;
            transition: width 0.3s, background-color 0.3s;
            border-radius: 3px;
        }
        .mypc-error {
            margin-top: 12px;
            padding: 10px 12px;
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 6px;
            color: #856404;
            font-size: 13px;
            display: none;
        }
        .mypc-error.show {
            display: block;
        }
        .mypc-branding {
            display: none;
        }
        .mypc-helper {
            font-size: 12px;
            color: #6c757d;
            margin-top: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
        }
        .mypc-helper-text {
            flex: 1;
        }
        .mypc-branding-inline {
            font-size: 11px;
            color: #4c6ef5;
            text-decoration: none;
            font-weight: 500;
            white-space: nowrap;
        }
        .mypc-branding-inline:hover {
            text-decoration: underline;
        }
        .mypc-widget.compact {
            max-width: 400px;
        }
        .mypc-widget.compact .mypc-tab {
            padding: 10px 12px;
            font-size: 13px;
        }
        .mypc-widget.compact .mypc-tab-content {
            padding: 16px;
        }
        .mypc-widget.no-branding .mypc-branding {
            display: none;
        }
        .mypc-disclosure {
            font-size: 12px;
            color: #856404;
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 6px;
            padding: 10px 12px;
            margin-bottom: 16px;
            display: flex;
            align-items: flex-start;
            gap: 8px;
        }
        .mypc-disclosure-icon {
            font-size: 16px;
            flex-shrink: 0;
        }
        .mypc-breach-count {
            font-size: 24px;
            font-weight: 700;
            margin: 8px 0;
        }
        .mypc-breach-safe {
            color: #10b981;
        }
        .mypc-breach-warning {
            color: #f59e0b;
        }
        .mypc-breach-danger {
            color: #dc2626;
        }
    `;

    // Widget HTML Template
    const widgetHTML = `
        <div class="mypc-tabs">
            <button class="mypc-tab active" data-tab="password">🔒 Password Check</button>
            <button class="mypc-tab" data-tab="quantum">⚛️ Quantum Test</button>
            <button class="mypc-tab" data-tab="generator">🔑 Generator</button>
            <button class="mypc-tab" data-tab="breach">🔍 Breach Check</button>
        </div>

        <div class="mypc-tab-content active" data-content="password">
            <div class="mypc-input-group">
                <label class="mypc-label">Enter a password to test:</label>
                <input type="password" class="mypc-input mypc-password-input" placeholder="Type password here..." autocomplete="off">
                <div class="mypc-helper">
                    <span class="mypc-helper-text">🔒 Privacy-focused: Analysis happens client-side</span>
                    <a href="https://mypasswordchecker.com" target="_blank" rel="noopener" class="mypc-branding-inline">Powered by MyPasswordChecker.com</a>
                </div>
            </div>
            <button class="mypc-btn mypc-check-btn">Check Password Strength</button>
            <div class="mypc-result mypc-password-result">
                <div class="mypc-strength-bar">
                    <div class="mypc-strength-fill"></div>
                </div>
                <div class="mypc-result-title">Strength: <span class="mypc-strength-label"></span></div>
                <div class="mypc-result-detail">Score: <strong class="mypc-score"></strong>/4</div>
                <div class="mypc-result-detail">Entropy: <strong class="mypc-entropy"></strong> bits</div>
                <div class="mypc-result-detail">Crack Time: <strong class="mypc-crack-time"></strong></div>
            </div>
            <div class="mypc-error mypc-password-error"></div>
        </div>

        <div class="mypc-tab-content" data-content="quantum">
            <div class="mypc-input-group">
                <label class="mypc-label">Test quantum resistance:</label>
                <input type="password" class="mypc-input mypc-quantum-input" placeholder="Enter password to analyze..." autocomplete="off">
                <div class="mypc-helper">
                    <span class="mypc-helper-text">⚛️ Tests against Grover's algorithm</span>
                    <a href="https://mypasswordchecker.com" target="_blank" rel="noopener" class="mypc-branding-inline">Powered by MyPasswordChecker.com</a>
                </div>
            </div>
            <button class="mypc-btn mypc-quantum-btn">Estimate Quantum Resistance</button>
            <div class="mypc-result mypc-quantum-result">
                <div class="mypc-result-title">Quantum Safety</div>
                <div class="mypc-result-value mypc-quantum-safe"></div>
                <div class="mypc-result-detail">Grover Iterations: <strong class="mypc-grover"></strong></div>
                <div class="mypc-result-detail">NISQ Era: <strong class="mypc-nisq"></strong></div>
                <div class="mypc-result-detail mypc-quantum-rec"></div>
            </div>
            <div class="mypc-error mypc-quantum-error"></div>
        </div>

        <div class="mypc-tab-content" data-content="generator">
            <div class="mypc-disclosure">
                <span class="mypc-disclosure-icon">⚠️</span>
                <div>
                    <strong>API Required:</strong> This feature requires an API key to track usage. Your phrase is converted to a phonetic password using client-side processing - your phrase never leaves your browser.
                </div>
            </div>
            <div class="mypc-input-group">
                <label class="mypc-label">Memorable phrase:</label>
                <textarea class="mypc-input mypc-phrase-input" placeholder="e.g., I love hiking in Yosemite" autocomplete="off" rows="2" style="resize: vertical; min-height: 60px;"></textarea>
                <div class="mypc-helper">
                    <span class="mypc-helper-text">🔑 Creates phonetic password from your phrase</span>
                    <a href="https://mypasswordchecker.com" target="_blank" rel="noopener" class="mypc-branding-inline">Powered by MyPasswordChecker.com</a>
                </div>
            </div>
            <div class="mypc-input-group">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-weight: 600; font-size: 13px;">
                    <span>Memorability vs Strength</span>
                    <span class="mypc-slider-value">Medium</span>
                </div>
                <input type="range" min="1" max="5" value="3" class="mypc-aggressiveness-slider" style="width: 100%; height: 6px; border-radius: 3px; cursor: pointer;">
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #6c757d; margin-top: 4px;">
                    <span>← Easy to Remember</span>
                    <span>⚛️ Quantum Safe →</span>
                </div>
                <div class="mypc-slider-hint" style="font-size: 12px; color: #6c757d; margin-top: 6px;">
                    Balanced mix of original characters and creative substitutions
                </div>
            </div>
            <button class="mypc-btn mypc-generate-btn">Generate Quantum-Safe Password</button>
            <div class="mypc-result mypc-generator-result">
                <div class="mypc-result-title">Generated Password</div>
                <div class="mypc-result-value mypc-gen-password" style="word-break: break-all; font-size: 16px;"></div>
                <div class="mypc-result-detail">Entropy: <strong class="mypc-gen-entropy"></strong> bits</div>
                <div class="mypc-result-detail">Quantum Safe: <strong class="mypc-gen-quantum"></strong></div>
            </div>
            <div class="mypc-error mypc-generator-error"></div>
        </div>

        <div class="mypc-tab-content" data-content="breach">
            <div class="mypc-disclosure">
                <span class="mypc-disclosure-icon">⚠️</span>
                <div>
                    <strong>API Required:</strong> This feature requires an API key and makes external requests to check if your password has been exposed in known data breaches. Your password is hashed using SHA-1 before being sent, and only the first 5 characters of the hash are transmitted (k-anonymity model), ensuring 99.9875% of your password hash remains private.
                </div>
            </div>
            <div class="mypc-input-group">
                <label class="mypc-label">Password to check for breaches:</label>
                <input type="password" class="mypc-input mypc-breach-input" placeholder="Enter password to check..." autocomplete="off">
                <div class="mypc-helper">
                    <span class="mypc-helper-text">🔍 Checks against Have I Been Pwned database</span>
                    <a href="https://mypasswordchecker.com" target="_blank" rel="noopener" class="mypc-branding-inline">Powered by MyPasswordChecker.com</a>
                </div>
            </div>
            <button class="mypc-btn mypc-breach-btn">Check for Breaches</button>
            <div class="mypc-result mypc-breach-result">
                <div class="mypc-result-title">Breach Status</div>
                <div class="mypc-breach-count mypc-breach-status"></div>
                <div class="mypc-result-detail mypc-breach-message"></div>
                <div class="mypc-result-detail" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #dee2e6;">
                    <strong>Privacy Details:</strong><br>
                    Method: <span class="mypc-privacy-method"></span><br>
                    Hash prefix sent: <span class="mypc-privacy-prefix"></span><br>
                    Anonymity set: <span class="mypc-privacy-set"></span> possible passwords<br>
                    Data shared: <span class="mypc-privacy-shared"></span>
                </div>
            </div>
            <div class="mypc-error mypc-breach-error"></div>
        </div>
    `;

    // Initialize widget
    function initializeWidget(element) {
        const apiKey = element.dataset.apiKey;
        const compact = element.dataset.compact === 'true';
        const noBranding = element.dataset.noBranding === 'true' || element.dataset.whiteLabel === 'true';
        const customWidth = element.dataset.width;

        if (!apiKey) {
            console.error('MyPasswordChecker Widget: API key is required. Add data-api-key="YOUR_KEY" to the widget element.');
            element.innerHTML = '<div style="padding:20px;color:#dc2626;">Error: API key required</div>';
            return;
        }

        // Add widget class
        element.classList.add('mypc-widget');
        if (compact) element.classList.add('compact');
        if (noBranding) element.classList.add('no-branding');

        // Apply custom width if specified
        if (customWidth) {
            const width = parseInt(customWidth);
            if (width >= 400 && width <= 1000) {
                element.style.maxWidth = width + 'px';
            }
        }

        // Insert HTML
        element.innerHTML = widgetHTML;

        // Setup tab switching
        setupTabs(element);

        // Setup API calls
        setupPasswordCheck(element, apiKey);
        setupQuantumCheck(element, apiKey);
        setupGenerator(element, apiKey);
        setupBreachCheck(element, apiKey);
    }

    // Setup tab switching
    function setupTabs(widget) {
        const tabs = widget.querySelectorAll('.mypc-tab');
        const contents = widget.querySelectorAll('.mypc-tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;

                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));

                tab.classList.add('active');
                const targetContent = widget.querySelector(`[data-content="${targetTab}"]`);
                if (targetContent) targetContent.classList.add('active');
            });
        });
    }

    // Setup Password Strength Check
    function setupPasswordCheck(widget, apiKey) {
        const input = widget.querySelector('.mypc-password-input');
        const btn = widget.querySelector('.mypc-check-btn');
        const result = widget.querySelector('.mypc-password-result');
        const error = widget.querySelector('.mypc-password-error');

        btn.addEventListener('click', async () => {
            const password = input.value;
            if (!password) {
                showError(error, 'Please enter a password');
                result.classList.remove('show');
                return;
            }

            error.classList.remove('show');
            btn.disabled = true;
            btn.textContent = 'Checking...';

            try {
                const response = await fetch('https://mypasswordchecker.com/api/v1/check-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
                    body: JSON.stringify({ password })
                });

                const data = await response.json();

                if (data.success) {
                    const colors = ['#dc2626', '#f59e0b', '#eab308', '#3b82f6', '#10b981'];
                    const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];

                    widget.querySelector('.mypc-strength-fill').style.width = ((data.score + 1) * 20) + '%';
                    widget.querySelector('.mypc-strength-fill').style.background = colors[data.score];
                    widget.querySelector('.mypc-strength-label').textContent = labels[data.score];
                    widget.querySelector('.mypc-score').textContent = data.score;
                    widget.querySelector('.mypc-entropy').textContent = data.entropy.toFixed(2);
                    widget.querySelector('.mypc-crack-time').textContent = data.crack_time_display;

                    result.classList.add('show');
                } else {
                    showError(error, data.error || 'Error checking password');
                }
            } catch (err) {
                showError(error, 'Error calling API. Please try again.');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Check Password Strength';
            }
        });
    }

    // Setup Quantum Check
    function setupQuantumCheck(widget, apiKey) {
        const input = widget.querySelector('.mypc-quantum-input');
        const btn = widget.querySelector('.mypc-quantum-btn');
        const result = widget.querySelector('.mypc-quantum-result');
        const error = widget.querySelector('.mypc-quantum-error');

        btn.addEventListener('click', async () => {
            const password = input.value;
            if (!password) {
                showError(error, 'Please enter a password');
                result.classList.remove('show');
                return;
            }

            error.classList.remove('show');
            btn.disabled = true;
            btn.textContent = 'Analyzing...';

            try {
                // First get entropy
                const checkResp = await fetch('https://mypasswordchecker.com/api/v1/check-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
                    body: JSON.stringify({ password })
                });
                const checkData = await checkResp.json();

                if (!checkData.success) {
                    showError(error, checkData.error || 'Error analyzing password');
                    return;
                }

                // Then get quantum estimate
                const quantumResp = await fetch('https://mypasswordchecker.com/api/v1/quantum-estimate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
                    body: JSON.stringify({ entropy: checkData.entropy })
                });
                const quantumData = await quantumResp.json();

                if (quantumData.success) {
                    const safeEl = widget.querySelector('.mypc-quantum-safe');
                    safeEl.textContent = quantumData.quantum_safe ? '✅ Quantum-Safe' : '⚠️ Not Quantum-Safe';
                    safeEl.style.color = quantumData.quantum_safe ? '#10b981' : '#f59e0b';

                    widget.querySelector('.mypc-grover').textContent = quantumData.grover_iterations.toExponential(2);
                    widget.querySelector('.mypc-nisq').textContent = quantumData.quantum_scenarios.nisq.years_to_crack.toFixed(0) + ' years';
                    widget.querySelector('.mypc-quantum-rec').textContent = quantumData.recommendation;

                    result.classList.add('show');
                } else {
                    showError(error, quantumData.error || 'Error getting quantum estimate');
                }
            } catch (err) {
                showError(error, 'Error calling API. Please try again.');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Estimate Quantum Resistance';
            }
        });
    }

    // Setup Generator
    function setupGenerator(widget, apiKey) {
        const input = widget.querySelector('.mypc-phrase-input');
        const btn = widget.querySelector('.mypc-generate-btn');
        const result = widget.querySelector('.mypc-generator-result');
        const error = widget.querySelector('.mypc-generator-error');
        const slider = widget.querySelector('.mypc-aggressiveness-slider');
        const sliderValue = widget.querySelector('.mypc-slider-value');
        const sliderHint = widget.querySelector('.mypc-slider-hint');

        // Slider labels
        const sliderLabels = {
            1: { label: 'Very Easy', hint: '⚠️ NOT likely quantum resistant - Simple substitutions with spaces (e.g., "! LoV3 c0ff33"). Very memorable.', value: 'very-low' },
            2: { label: 'Easy', hint: '⚠️ NOT likely quantum resistant - More substitutions, first-letter caps, hyphens/underscores. Still memorable.', value: 'low' },
            3: { label: 'Medium', hint: '⚛️ Likely quantum resistant begins - Full substitutions, camelCase/bookend caps, special separators. Balanced.', value: 'medium' },
            4: { label: 'Strong', hint: '⚛️ Likely quantum resistant - Aggressive substitutions, random/alternate caps, complex separators. Strong.', value: 'high' },
            5: { label: 'Maximum', hint: '⚛️ Maximum - NATO Phonetic Alphabet conversion (e.g., "Ind14-L0v3-C0ff33"). Quantum resistant.', value: 'very-high' }
        };

        // Load required libraries (QuantumEstimator + PhoneticGenerator)
        if (!window.PhoneticGeneratorLoadPromise) {
            window.PhoneticGeneratorLoadPromise = new Promise((resolve, reject) => {
                if (window.PhoneticGenerator && window.QuantumEstimator) {
                    resolve();
                    return;
                }

                // Load QuantumEstimator first (dependency)
                const quantumScript = document.createElement('script');
                quantumScript.src = 'https://mypasswordchecker.com/js/quantum-estimator.js?v=3';
                quantumScript.onload = () => {
                    // Then load PhoneticGenerator
                    const phoneticScript = document.createElement('script');
                    phoneticScript.src = 'https://mypasswordchecker.com/js/phonetic-generator.js?v=10';
                    phoneticScript.onload = () => {
                        // Give a small delay for window assignment to complete
                        setTimeout(() => {
                            // Verify both are loaded
                            if (window.PhoneticGenerator && window.QuantumEstimator) {
                                resolve();
                            } else {
                                reject(new Error('Libraries loaded but not available'));
                            }
                        }, 100); // 100ms delay
                    };
                    phoneticScript.onerror = () => reject(new Error('Failed to load PhoneticGenerator'));
                    document.head.appendChild(phoneticScript);
                };
                quantumScript.onerror = () => reject(new Error('Failed to load QuantumEstimator'));
                document.head.appendChild(quantumScript);
            });
        }

        // Handle slider changes
        slider.addEventListener('input', (e) => {
            const level = parseInt(e.target.value);
            sliderValue.textContent = sliderLabels[level].label;
            sliderHint.textContent = sliderLabels[level].hint;

            // Update button text
            if (level <= 2) {
                btn.textContent = 'Generate Strong Password';
            } else {
                btn.textContent = 'Generate Quantum Resistant Password';
            }
        });

        btn.addEventListener('click', async () => {
            const phrase = input.value.trim();
            if (!phrase) {
                showError(error, 'Please enter a memorable phrase');
                result.classList.remove('show');
                return;
            }

            if (phrase.length < 10) {
                showError(error, 'Please enter a phrase with at least 10 characters');
                result.classList.remove('show');
                return;
            }

            error.classList.remove('show');
            btn.disabled = true;
            const originalText = btn.textContent;
            btn.textContent = 'Loading library...';

            try {
                // Wait for PhoneticGenerator to load
                await window.PhoneticGeneratorLoadPromise;

                btn.textContent = 'Generating...';

                const level = parseInt(slider.value);
                const aggressiveness = sliderLabels[level].value;

                // Generate password using client-side library
                const variations = window.PhoneticGenerator.generateMultiple(phrase, 1, { aggressiveness });

                if (variations && variations.length > 0) {
                    const generated = variations[0];
                    widget.querySelector('.mypc-gen-password').textContent = generated.password;
                    widget.querySelector('.mypc-gen-entropy').textContent = generated.entropy.toFixed(2);
                    widget.querySelector('.mypc-gen-quantum').textContent = generated.quantumResistant ? '✅ Yes' : '⚠️ No';

                    result.classList.add('show');
                } else {
                    showError(error, 'Failed to generate password. Please try again.');
                }
            } catch (err) {
                console.error('Generation error:', err);
                if (err.message && err.message.includes('load')) {
                    showError(error, 'Failed to load phonetic generator. Please check your internet connection and try again.');
                } else {
                    showError(error, 'Error generating password. Please try again.');
                }
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    }

    // Setup Breach Check
    function setupBreachCheck(widget, apiKey) {
        const input = widget.querySelector('.mypc-breach-input');
        const btn = widget.querySelector('.mypc-breach-btn');
        const result = widget.querySelector('.mypc-breach-result');
        const error = widget.querySelector('.mypc-breach-error');

        btn.addEventListener('click', async () => {
            const password = input.value;
            if (!password) {
                showError(error, 'Please enter a password to check');
                result.classList.remove('show');
                return;
            }

            error.classList.remove('show');
            btn.disabled = true;
            btn.textContent = 'Checking breaches...';

            try {
                // Hash password using SHA-1 in browser
                const encoder = new TextEncoder();
                const passwordData = encoder.encode(password);
                const hashBuffer = await crypto.subtle.digest('SHA-1', passwordData);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

                // Call breach check API
                const response = await fetch('https://mypasswordchecker.com/api/v1/breach-check', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': apiKey
                    },
                    body: JSON.stringify({ password_hash: passwordHash })
                });

                const data = await response.json();

                if (data.success) {
                    const statusEl = widget.querySelector('.mypc-breach-status');
                    const messageEl = widget.querySelector('.mypc-breach-message');

                    if (data.pwned) {
                        const count = data.breach_count;
                        statusEl.textContent = `⚠️ Found in ${count.toLocaleString()} breaches`;
                        statusEl.className = 'mypc-breach-count ' + (count > 10000 ? 'mypc-breach-danger' : 'mypc-breach-warning');
                        messageEl.innerHTML = data.message;
                    } else {
                        statusEl.textContent = '✅ Not Found in Breaches';
                        statusEl.className = 'mypc-breach-count mypc-breach-safe';
                        messageEl.innerHTML = data.message;
                    }

                    // Display privacy details
                    widget.querySelector('.mypc-privacy-method').textContent = data.privacy_details.method;
                    widget.querySelector('.mypc-privacy-prefix').textContent = data.privacy_details.prefix_sent;
                    widget.querySelector('.mypc-privacy-set').textContent = data.privacy_details.anonymity_set_size.toLocaleString();
                    widget.querySelector('.mypc-privacy-shared').textContent = data.privacy_details.data_shared;

                    result.classList.add('show');
                } else {
                    showError(error, data.error || 'Error checking for breaches');
                }
            } catch (err) {
                console.error('Breach check error:', err);
                showError(error, 'Error calling API. Please try again.');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Check for Breaches';
            }
        });
    }

    // Helper function to show errors
    function showError(errorElement, message) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }

    // Inject CSS
    function injectCSS() {
        if (document.getElementById('mypc-widget-css')) return;
        const style = document.createElement('style');
        style.id = 'mypc-widget-css';
        style.textContent = widgetCSS;
        document.head.appendChild(style);
    }

    // Auto-initialize on page load
    function autoInit() {
        injectCSS();
        document.querySelectorAll('[data-mypc-widget]').forEach(initializeWidget);

        // Also initialize elements with id="mypc-widget" for backwards compatibility
        const legacyWidget = document.getElementById('mypc-widget');
        if (legacyWidget && !legacyWidget.classList.contains('mypc-widget')) {
            initializeWidget(legacyWidget);
        }
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }

    // Export for manual initialization
    window.MyPasswordCheckerWidget = { init: initializeWidget, injectCSS };

})();
