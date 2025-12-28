/**
 * Quantum Password Crack Time Estimator
 * Uses an advanced algorithm model for quantum resistance estimation
 * All calculations run client-side - passwords never leave the browser
 */

(function(window) {
    'use strict';

    // Configuration: attacker attempt rates (per second)
    const DEFAULTS = {
        R_c: 1e9, // Classical attempts/sec (1 billion/sec - high-end GPU)

        // Quantum Grover iteration rates (speculative ranges)
        Rq_presets: {
            "pessimistic": 1e3,   // Conservative: early quantum hardware
            "plausible": 1e5,      // Plausible near-term capability
            "optimistic": 1e7      // Optimistic future high-rate machines
        },

        premiumNote: "⚠️ Quantum estimates are theoretical and depend on speculative quantum hardware capabilities. This is an educational estimate only - we make no guarantee of its accuracy in a real-world quantum attack scenario. We never transmit or store your password - all calculations run in your browser."
    };

    /**
     * Convert seconds (as log10 seconds) to human-readable format
     */
    function humanizeSecondsFromLog10(log10Seconds) {
        if (!isFinite(log10Seconds)) {
            return { label: "∞ (effectively unbreakable)", seconds: Infinity };
        }

        const seconds = Math.pow(10, log10Seconds);

        if (seconds < 1) {
            const ms = Math.round(seconds * 1000);
            return { label: `${ms} milliseconds`, seconds };
        }

        const minute = 60;
        const hour = 3600;
        const day = 86400;
        const year = 31557600; // 365.25 days
        const century = year * 100;
        const millennium = year * 1000;

        if (seconds < minute) {
            return { label: `${Math.round(seconds)} seconds`, seconds };
        }
        if (seconds < hour) {
            return { label: `${(seconds/minute).toFixed(1)} minutes`, seconds };
        }
        if (seconds < day) {
            return { label: `${(seconds/hour).toFixed(1)} hours`, seconds };
        }
        if (seconds < year) {
            return { label: `${(seconds/day).toFixed(1)} days`, seconds };
        }
        if (seconds < century) {
            return { label: `${(seconds/year).toFixed(2)} years`, seconds };
        }
        if (seconds < millennium) {
            return { label: `${(seconds/year).toFixed(0)} years`, seconds };
        }

        // For very large numbers, convert to readable formats
        const years = seconds / year;
        const exponent = Math.floor(log10Seconds);

        // Show in different scales for readability
        if (years < 1e6) { // Less than 1 million years
            return {
                label: `${formatLargeNumber(years)} years`,
                technical: `10^${exponent} seconds`,
                seconds
            };
        }
        if (years < 1e9) { // Less than 1 billion years
            return {
                label: `${formatLargeNumber(years / 1e6)} million years`,
                technical: `10^${exponent} seconds`,
                seconds
            };
        }
        if (years < 1e12) { // Less than 1 trillion years
            return {
                label: `${formatLargeNumber(years / 1e9)} billion years`,
                technical: `10^${exponent} seconds`,
                seconds
            };
        }
        if (years < 1e15) { // Less than 1 quadrillion years
            return {
                label: `${formatLargeNumber(years / 1e12)} trillion years`,
                technical: `10^${exponent} seconds`,
                seconds
            };
        }

        // For extremely large numbers
        return {
            label: `${formatLargeNumber(years / 1e15)} quadrillion years`,
            technical: `10^${exponent} seconds`,
            seconds
        };
    }

    /**
     * Format large numbers with commas for readability
     */
    function formatLargeNumber(num) {
        if (num < 1000) {
            return num.toFixed(2);
        }
        if (num < 1000000) {
            return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
        }
        return num.toFixed(2);
    }

    /**
     * Main estimation function
     * @param {string} password - The password to analyze
     * @param {object} opts - Optional configuration overrides
     * @returns {object} Analysis results with classical and quantum estimates
     */
    function estimateTimes(password, opts = {}) {
        const cfg = Object.assign({}, DEFAULTS, opts || {});

        // Require zxcvbn library
        if (typeof zxcvbn === 'undefined') {
            throw new Error("zxcvbn library not found. Include zxcvbn before using the estimator.");
        }

        // Run zxcvbn analysis
        const zx = zxcvbn(password || '');

        // Extract entropy in bits from zxcvbn's guesses
        // zxcvbn.guesses_log10 is log10(number of guesses)
        // Convert to bits: bits = log2(guesses) = guesses_log10 * log2(10)
        const guesses_log10 = (typeof zx.guesses_log10 === 'number')
            ? zx.guesses_log10
            : Math.log10(Math.max(1, zx.guesses || 1));

        const bits = guesses_log10 * Math.log2(10);

        // Compute log10(N) where N = 2^bits is the search space
        const log10N = bits * Math.log10(2);

        // Classical time: T_c = N / R_c = 10^(log10N - log10(R_c))
        const log10Rc = Math.log10(cfg.R_c);
        const log10Tc = log10N - log10Rc;

        // Quantum times for each Rq preset
        // Grover's algorithm: sqrt(N) iterations
        const log10SqrtN = 0.5 * log10N;
        const quantum = {};

        for (const [name, Rq] of Object.entries(cfg.Rq_presets)) {
            const log10Rq = Math.log10(Rq);
            const log10Tq = log10SqrtN - log10Rq;

            quantum[name] = {
                Rq,
                log10Tq,
                human: humanizeSecondsFromLog10(log10Tq),
                bitsOfSecurity: bits / 2 // Effective quantum bits of security
            };
        }

        // Convert classical time to human-readable
        const classicalHuman = humanizeSecondsFromLog10(log10Tc);

        // Extract zxcvbn display info
        const zxcvbn_display = {
            score: zx.score, // 0-4
            feedback: zx.feedback || {},
            crack_times_display: zx.crack_times_display || {},
            sequence: zx.sequence || []
        };

        return {
            // Input info
            passwordLength: (password || '').length,

            // zxcvbn analysis
            zxcvbn: zxcvbn_display,

            // Entropy
            bits: Number(bits.toFixed(3)),
            log10N: Number(log10N.toFixed(4)),

            // Classical estimates
            classical: {
                R_c: cfg.R_c,
                log10Seconds: Number(log10Tc.toFixed(4)),
                human: classicalHuman,
                bitsOfSecurity: bits
            },

            // Quantum estimates (range)
            quantum,

            // Disclaimer
            note: cfg.premiumNote
        };
    }

    /**
     * Generate a visual strength indicator (0-4 scale)
     */
    function getStrengthIndicator(score) {
        const indicators = [
            { label: "Very Weak", color: "#d32f2f", width: "20%" },
            { label: "Weak", color: "#f57c00", width: "40%" },
            { label: "Fair", color: "#fbc02d", width: "60%" },
            { label: "Strong", color: "#689f38", width: "80%" },
            { label: "Very Strong", color: "#388e3c", width: "100%" }
        ];

        return indicators[score] || indicators[0];
    }

    /**
     * Format large numbers with commas
     */
    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    /**
     * Calculate entropy in bits for a password
     * Uses zxcvbn to estimate password strength
     */
    function calculateEntropy(password) {
        if (typeof zxcvbn === 'undefined') {
            throw new Error("zxcvbn library not found. Include zxcvbn before using the estimator.");
        }

        const zx = zxcvbn(password || '');

        // Extract entropy in bits from zxcvbn's guesses
        const guesses_log10 = (typeof zx.guesses_log10 === 'number')
            ? zx.guesses_log10
            : Math.log10(Math.max(1, zx.guesses || 1));

        const bits = guesses_log10 * Math.log2(10);

        return bits;
    }

    // Expose public API
    window.QuantumEstimator = {
        estimateTimes,
        getStrengthIndicator,
        humanizeSecondsFromLog10,
        formatNumber,
        calculateEntropy,
        defaults: DEFAULTS
    };

})(window);
