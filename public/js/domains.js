// Domain Verification Dashboard JavaScript
// Handles domain verification UI and API interactions

let currentSession = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadDomains();
});

// Check if user is authenticated
async function checkAuth() {
    try {
        const response = await fetch('/api/dashboard', {
            credentials: 'include'
        });

        if (!response.ok) {
            // Not authenticated, redirect to dashboard
            window.location.href = '/dashboard.html';
            return;
        }

        const data = await response.json();
        currentSession = data;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/dashboard.html';
    }
}

// Load all domains for current user
async function loadDomains() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error-state');
    const containerEl = document.getElementById('domains-container');
    const emptyStateEl = document.getElementById('empty-state');
    const domainsListEl = document.getElementById('domains-list');
    const domainCountEl = document.getElementById('domain-count');

    try {
        loadingEl.style.display = 'block';
        errorEl.style.display = 'none';
        containerEl.style.display = 'none';

        const response = await fetch('/api/domains/list', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Failed to load domains: ${response.statusText}`);
        }

        const data = await response.json();
        const domains = data.domains || [];

        // Update domain count
        domainCountEl.textContent = domains.length;

        // Show container
        loadingEl.style.display = 'none';
        containerEl.style.display = 'block';

        // Show empty state or domains list
        if (domains.length === 0) {
            emptyStateEl.style.display = 'block';
            domainsListEl.style.display = 'none';
        } else {
            emptyStateEl.style.display = 'none';
            domainsListEl.style.display = 'block';
            renderDomains(domains);
        }
    } catch (error) {
        console.error('Error loading domains:', error);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
        document.getElementById('error-message').textContent = error.message;
    }
}

// Render domain cards
function renderDomains(domains) {
    const domainsListEl = document.getElementById('domains-list');
    domainsListEl.innerHTML = '';

    domains.forEach(domain => {
        const card = createDomainCard(domain);
        domainsListEl.appendChild(card);
    });
}

// Create a single domain card
function createDomainCard(domain) {
    const card = document.createElement('div');
    card.className = `domain-card ${domain.status}`;

    const statusBadge = getStatusBadge(domain.status);
    const verifiedInfo = domain.status === 'verified' ? getVerifiedInfo(domain) : '';
    const pendingInfo = domain.status === 'pending' ? getPendingInfo(domain) : '';
    const failedInfo = domain.status === 'failed' ? getFailedInfo(domain) : '';

    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
            <div>
                <h3 style="margin: 0 0 0.5rem 0; font-size: 1.25rem;">${domain.domain}</h3>
                ${statusBadge}
            </div>
            <button class="btn btn-danger" onclick="removeDomain('${domain.domain}')" style="padding: 0.25rem 0.75rem; font-size: 0.875rem;">
                Remove
            </button>
        </div>
        ${verifiedInfo}
        ${pendingInfo}
        ${failedInfo}
    `;

    return card;
}

// Get status badge HTML
function getStatusBadge(status) {
    const badges = {
        verified: '<span class="status-badge verified">✓ Verified</span>',
        pending: '<span class="status-badge pending">⏳ Pending</span>',
        failed: '<span class="status-badge failed">✗ Failed</span>'
    };
    return badges[status] || '';
}

// Get verified domain info
function getVerifiedInfo(domain) {
    const verifiedDate = new Date(domain.verified_at).toLocaleDateString();
    const lastUsed = domain.last_used_at
        ? formatRelativeTime(new Date(domain.last_used_at))
        : 'Never';

    return `
        <div style="margin-top: 1rem;">
            <p style="color: var(--text-secondary); font-size: 0.875rem; margin: 0.25rem 0;">
                <strong>Verified:</strong> ${verifiedDate}
            </p>
            <p style="color: var(--text-secondary); font-size: 0.875rem; margin: 0.25rem 0;">
                <strong>Last used:</strong> ${lastUsed}
            </p>
            <p style="color: var(--text-secondary); font-size: 0.875rem; margin: 0.25rem 0;">
                <strong>Rate Limit:</strong> 100 requests/minute
            </p>
            <div style="margin-top: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: 0.5rem;">
                <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">Domain Secret</label>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <code class="code-block" style="flex: 1; margin: 0; padding: 0.5rem; font-size: 0.75rem; overflow-x: auto;">
                        ${domain.domain_secret}
                    </code>
                    <button class="copy-btn" onclick="copyToClipboard('${domain.domain_secret}', this)">Copy</button>
                </div>
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem; margin-bottom: 0;">
                    Use this secret to sign API requests from your domain
                </p>
            </div>
        </div>
    `;
}

// Get pending domain info
function getPendingInfo(domain) {
    const instructions = domain.verification_method === 'dns'
        ? getDNSInstructions(domain)
        : getHTTPInstructions(domain);

    return `
        <div style="margin-top: 1rem;">
            <p style="color: var(--text-secondary); font-size: 0.875rem; margin: 0.5rem 0;">
                <strong>Verification Method:</strong> ${domain.verification_method === 'dns' ? 'DNS TXT Record' : 'HTTP File'}
            </p>
            ${instructions}
            <button class="btn btn-primary" onclick="verifyDomain('${domain.domain}')" style="margin-top: 1rem;">
                Verify Now
            </button>
        </div>
    `;
}

// Get DNS verification instructions
function getDNSInstructions(domain) {
    return `
        <div class="instructions" style="margin-top: 1rem;">
            <strong>DNS TXT Record Instructions:</strong>
            <ol>
                <li>Log in to your DNS provider (e.g., Cloudflare, GoDaddy, Namecheap)</li>
                <li>Add a TXT record with the following details:
                    <div style="margin-top: 0.5rem;">
                        <strong>Name/Host:</strong> <code>_mypasswordchecker</code>
                        <button class="copy-btn" onclick="copyToClipboard('_mypasswordchecker', this)">Copy</button>
                    </div>
                    <div style="margin-top: 0.5rem;">
                        <strong>Value:</strong>
                        <div style="display: flex; gap: 0.5rem; align-items: center; margin-top: 0.25rem;">
                            <code class="code-block" style="flex: 1; margin: 0; padding: 0.5rem; font-size: 0.75rem;">
                                mypasswordchecker-verify=${domain.verification_token}
                            </code>
                            <button class="copy-btn" onclick="copyToClipboard('mypasswordchecker-verify=${domain.verification_token}', this)">Copy</button>
                        </div>
                    </div>
                </li>
                <li>Wait for DNS propagation (can take up to 48 hours, usually minutes)</li>
                <li>Click "Verify Now" button above</li>
            </ol>
        </div>
    `;
}

// Get HTTP file verification instructions
function getHTTPInstructions(domain) {
    return `
        <div class="instructions" style="margin-top: 1rem;">
            <strong>HTTP File Verification Instructions:</strong>
            <ol>
                <li>Create a text file containing this token:
                    <div style="display: flex; gap: 0.5rem; align-items: center; margin-top: 0.5rem;">
                        <code class="code-block" style="flex: 1; margin: 0; padding: 0.5rem; font-size: 0.75rem;">
                            ${domain.verification_token}
                        </code>
                        <button class="copy-btn" onclick="copyToClipboard('${domain.verification_token}', this)">Copy</button>
                    </div>
                </li>
                <li>Upload the file to one of these locations:
                    <ul style="margin-top: 0.5rem;">
                        <li><code>https://${domain.domain}/.well-known/mypasswordchecker-verify.txt</code> (recommended)</li>
                        <li><code>https://${domain.domain}/mypasswordchecker-verify.txt</code></li>
                    </ul>
                </li>
                <li>Ensure the file is publicly accessible (no authentication required)</li>
                <li>Click "Verify Now" button above</li>
            </ol>
        </div>
    `;
}

// Get failed domain info
function getFailedInfo(domain) {
    return `
        <div style="margin-top: 1rem;">
            <div class="alert alert-error">
                <strong>Verification Failed</strong>
                <p style="margin: 0.5rem 0 0 0;">We couldn't verify your domain. Please check your ${domain.verification_method === 'dns' ? 'DNS TXT record' : 'HTTP file'} and try again.</p>
            </div>
            <button class="btn btn-primary" onclick="verifyDomain('${domain.domain}')" style="margin-top: 1rem;">
                Retry Verification
            </button>
        </div>
    `;
}

// Show add domain modal
function showAddDomainModal() {
    const modal = document.getElementById('addDomainModal');
    modal.style.display = 'block';

    // Reset form
    document.getElementById('domain-input').value = '';
    document.querySelector('input[name="verification-method"][value="dns"]').checked = true;
    document.getElementById('add-domain-error').style.display = 'none';
}

// Close add domain modal
function closeAddDomainModal() {
    const modal = document.getElementById('addDomainModal');
    modal.style.display = 'none';
}

// Add new domain
async function addDomain() {
    const domainInput = document.getElementById('domain-input');
    const methodInput = document.querySelector('input[name="verification-method"]:checked');
    const errorEl = document.getElementById('add-domain-error');
    const addBtn = document.getElementById('add-domain-btn');

    const domain = domainInput.value.trim();
    const method = methodInput.value;

    // Validate domain
    if (!domain) {
        errorEl.textContent = 'Please enter a domain name';
        errorEl.style.display = 'block';
        return;
    }

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
        errorEl.textContent = 'Please enter a valid domain (e.g., example.com)';
        errorEl.style.display = 'block';
        return;
    }

    try {
        errorEl.style.display = 'none';
        addBtn.disabled = true;
        addBtn.textContent = 'Adding...';

        const response = await fetch('/api/domains/add', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ domain, method })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to add domain');
        }

        // Success - close modal and reload domains
        closeAddDomainModal();
        await loadDomains();
    } catch (error) {
        console.error('Error adding domain:', error);
        errorEl.textContent = error.message;
        errorEl.style.display = 'block';
    } finally {
        addBtn.disabled = false;
        addBtn.textContent = 'Add Domain';
    }
}

// Verify domain
async function verifyDomain(domain) {
    try {
        const response = await fetch('/api/domains/verify', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ domain })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Verification failed');
        }

        if (data.success) {
            // Success - reload domains to show updated status
            alert(`✓ Domain ${domain} verified successfully!`);
            await loadDomains();
        } else {
            alert(`✗ Domain verification failed: ${data.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error verifying domain:', error);
        alert(`✗ Domain verification failed: ${error.message}`);
    }
}

// Remove domain
async function removeDomain(domain) {
    if (!confirm(`Are you sure you want to remove ${domain}?\n\nThis will immediately stop API requests from this domain.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/domains/${encodeURIComponent(domain)}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to remove domain');
        }

        // Success - reload domains
        await loadDomains();
    } catch (error) {
        console.error('Error removing domain:', error);
        alert(`Failed to remove domain: ${error.message}`);
    }
}

// Copy text to clipboard
async function copyToClipboard(text, button) {
    try {
        await navigator.clipboard.writeText(text);

        // Show feedback
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.style.background = 'var(--success-color)';
        button.style.color = 'white';

        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
            button.style.color = '';
        }, 2000);
    } catch (error) {
        console.error('Failed to copy:', error);
        alert('Failed to copy to clipboard');
    }
}

// Format relative time (e.g., "5 minutes ago")
function formatRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
    if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;

    return date.toLocaleDateString();
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('addDomainModal');
    if (event.target === modal) {
        closeAddDomainModal();
    }
};
