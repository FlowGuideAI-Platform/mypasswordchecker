# FlowGuideAI Integration - Perpetual Quantum Tier

## Account Details

**API Key:** `mpc_27adf42267ca40a88b37d3a7388dd085`
**Email:** jack@flowguideai.com
**Plan:** Quantum Monthly (Perpetual Free)
**Quotas:**
- Tier 1 (Password Checks): 25,000 requests/month
- Tier 2 (Quantum Estimates): 5,000 requests/month
- Overage: Allowed (won't be charged)

**Status:** Active, no expiration

---

## Integration HTML Snippet

Use this snippet on FlowGuideAI to integrate password checking with proper attribution:

```html
<!-- Password Strength Checker Widget -->
<div class="password-checker-widget">
    <div class="input-group">
        <label for="password-check">Check Password Strength</label>
        <input
            type="password"
            id="password-check"
            placeholder="Enter password to test"
            autocomplete="off"
        >
        <button onclick="checkPassword()">Check Strength</button>
    </div>

    <div id="strength-result" style="display: none;">
        <!-- Results will appear here -->
    </div>

    <!-- Attribution (required) -->
    <div style="margin-top: 0.5rem; text-align: center; font-size: 0.75rem; color: #6b7280;">
        Powered by <a href="https://mypasswordchecker.com" target="_blank" rel="noopener" style="color: #2563eb; text-decoration: none;">MyPasswordChecker.com</a>
    </div>
</div>

<script>
async function checkPassword() {
    const password = document.getElementById('password-check').value;
    if (!password) return;

    try {
        const response = await fetch('https://mypasswordchecker.com/api/v1/check-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'mpc_27adf42267ca40a88b37d3a7388dd085'
            },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        // Display results
        const resultDiv = document.getElementById('strength-result');
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `
            <div style="padding: 1rem; background: #f3f4f6; border-radius: 0.5rem;">
                <p><strong>Password Strength:</strong> ${getStrengthLabel(data.strength)}</p>
                <p><strong>Usage:</strong> ${data.usage}/${data.quota} requests this month</p>
            </div>
        `;
    } catch (error) {
        console.error('Password check failed:', error);
        alert('Failed to check password strength. Please try again.');
    }
}

function getStrengthLabel(score) {
    const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
    return labels[score] || 'Unknown';
}
</script>
```

---

## Alternative: Quantum Estimate Integration

For quantum resistance estimates:

```html
<div class="quantum-estimate-widget">
    <div class="input-group">
        <label for="password-quantum">Check Quantum Resistance</label>
        <input
            type="password"
            id="password-quantum"
            placeholder="Enter password"
            autocomplete="off"
        >
        <button onclick="checkQuantum()">Estimate Quantum Resistance</button>
    </div>

    <div id="quantum-result" style="display: none;">
        <!-- Quantum results -->
    </div>

    <!-- Attribution -->
    <div style="margin-top: 0.5rem; text-align: center; font-size: 0.75rem; color: #6b7280;">
        Quantum estimates powered by <a href="https://mypasswordchecker.com/premium.html" target="_blank" rel="noopener" style="color: #2563eb;">MyPasswordChecker.com</a>
    </div>
</div>

<script>
async function checkQuantum() {
    const password = document.getElementById('password-quantum').value;
    if (!password) return;

    try {
        const response = await fetch('https://mypasswordchecker.com/api/v1/quantum-estimate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'mpc_27adf42267ca40a88b37d3a7388dd085'
            },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        // Display quantum results
        const resultDiv = document.getElementById('quantum-result');
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `
            <div style="padding: 1rem; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border-radius: 0.5rem;">
                <h4>Quantum Resistance Estimates</h4>
                <p><strong>Classical Crack Time:</strong> ${data.classical?.human?.label || 'N/A'}</p>
                <p><strong>Quantum (Plausible):</strong> ${data.quantum?.plausible?.human?.label || 'N/A'}</p>
                <p><strong>Entropy:</strong> ${data.bits} bits</p>
                <p style="font-size: 0.75rem; margin-top: 0.5rem; opacity: 0.9;">
                    ⚠️ Estimates are theoretical and educational only.
                </p>
            </div>
        `;
    } catch (error) {
        console.error('Quantum estimate failed:', error);
        alert('Failed to get quantum estimate. Please try again.');
    }
}
</script>
```

---

## Styling Suggestions

Add this CSS to match FlowGuideAI's design:

```css
.password-checker-widget,
.quantum-estimate-widget {
    max-width: 500px;
    margin: 2rem auto;
    padding: 1.5rem;
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.input-group {
    margin-bottom: 1rem;
}

.input-group label {
    display: block;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #1f2937;
}

.input-group input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.5rem;
    font-size: 1rem;
    transition: border-color 0.2s;
}

.input-group input:focus {
    outline: none;
    border-color: #2563eb;
}

.input-group button {
    width: 100%;
    margin-top: 0.5rem;
    padding: 0.75rem;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s;
}

.input-group button:hover {
    transform: translateY(-2px);
}
```

---

## Attribution Requirements

To maintain perpetual free Quantum tier access, please ensure:

1. **"Powered by MyPasswordChecker.com" link is visible** below the password input
2. **Link is not obscured** (minimum 12px font size, readable color)
3. **Link is clickable** and opens to https://mypasswordchecker.com
4. **rel="noopener"** attribute for security

**Example small print format:**
```html
<div style="text-align: center; font-size: 12px; color: #6b7280; margin-top: 8px;">
    Powered by <a href="https://mypasswordchecker.com" target="_blank" rel="noopener" style="color: #2563eb; text-decoration: none;">MyPasswordChecker.com</a>
</div>
```

---

## Benefits of This Partnership

### For FlowGuideAI:
- Free Quantum tier ($49/mo value)
- 25,000 password checks/month
- 5,000 quantum estimates/month
- Overage allowed (no charges)
- Priority support

### For MyPasswordChecker:
- Brand exposure on FlowGuideAI
- Quality backlink for SEO
- Demonstration of API in production
- Cross-promotion opportunity

---

## API Endpoints Available

### 1. Password Strength Check (Tier 1)
**Endpoint:** `POST /api/v1/check-password`
**Quota:** 25,000/month

**Request:**
```json
{
  "password": "mySecureP@ssw0rd"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Request validated. Perform analysis client-side using zxcvbn.",
  "usage": 42,
  "remaining": 24958,
  "domain_verified": false
}
```

### 2. Quantum Estimate (Tier 2)
**Endpoint:** `POST /api/v1/quantum-estimate`
**Quota:** 5,000/month

**Request:**
```json
{
  "password": "mySecureP@ssw0rd"
}
```

**Response:**
```json
{
  "passwordLength": 16,
  "bits": 52.3,
  "classical": {
    "R_c": 1000000000,
    "human": {
      "label": "3.45 centuries",
      "seconds": 1.09e13
    },
    "bitsOfSecurity": 52.3
  },
  "quantum": {
    "pessimistic": {
      "Rq": 1000,
      "human": {
        "label": "2.1 years"
      },
      "bitsOfSecurity": 26.15
    },
    "plausible": {
      "Rq": 100000,
      "human": {
        "label": "7.6 days"
      },
      "bitsOfSecurity": 26.15
    },
    "optimistic": {
      "Rq": 10000000,
      "human": {
        "label": "2.7 hours"
      },
      "bitsOfSecurity": 26.15
    }
  },
  "note": "⚠️ Quantum estimates are theoretical..."
}
```

---

## Support

**Questions or Issues:**
- Email: jack@aac2.com
- Documentation: https://mypasswordchecker.com/api-docs.html
- Dashboard: https://mypasswordchecker.com/dashboard.html

**API Key Dashboard:**
- View usage: https://mypasswordchecker.com/dashboard.html
- Login with: jack@flowguideai.com / API key

---

## Notes

- **No billing:** This account will never be charged
- **No expiration:** Perpetual Quantum tier access
- **Overage allowed:** Won't be cut off if exceeding quota
- **Rate limits:** 100 requests/minute (verified domain tier)
- **Support:** Priority support for integration issues

**Last Updated:** October 24, 2025
