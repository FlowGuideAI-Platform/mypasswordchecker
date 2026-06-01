// File Path: /Users/jack/Projects - Xcode/mypasswordchecker/workers/mypasswordchecker-api.js
// Action: NEW FILE (replaces skeleton)
// Dependencies: D1 database, R2 bucket, 3 KV namespaces, PayPal API, Stripe API
//
// PURPOSE: Complete API worker with dual payment processing
// PAYMENT PROCESSORS:
//   - PayPal: Transactions ≤$5 (5% + $0.09 fee - better for small amounts)
//   - Stripe: Transactions >$5 (2.9% + $0.30 fee - better for large amounts)
// COST SAVINGS: $228/year at 100 premium + 10 API subs/month
//
// ENDPOINTS:
//   POST /api/create-payment          - Smart routing payment creation
//   POST /api/paypal/create-order      - Create PayPal order
//   POST /api/paypal/verify-payment    - Verify PayPal payment & activate premium
//   POST /api/stripe/create-intent     - Create Stripe payment intent
//   POST /api/stripe/webhook           - Handle Stripe webhooks
//   GET  /api/verify-session           - Verify premium session
//   GET  /api/verify-api-key           - Verify API key & quota
//   POST /api/track-usage              - Track feature usage

/**
 * Main Worker Entry Point
 */
export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		// ═══════════════════════════════════════════════
		// ALTERNATE DOMAIN 301 REDIRECTS (SEO consolidation)
		// ═══════════════════════════════════════════════
		// Alternate domains route all traffic (/*) to this worker.
		// 301-redirect them to the canonical domain instead of 404ing,
		// which preserves link equity and avoids SEO penalties.
		// All alternate domains (apex + www) 301 directly to the canonical
		// apex so search engines see a single hop to one canonical URL.
		const ALTERNATE_DOMAINS = {
			'mypasswordcheck.com': 'mypasswordchecker.com',
			'www.mypasswordcheck.com': 'mypasswordchecker.com',
			'myquantumpasswordchecker.com': 'mypasswordchecker.com',
			'www.myquantumpasswordchecker.com': 'mypasswordchecker.com',
			'quantumpasswordchecker.com': 'mypasswordchecker.com',
			'www.quantumpasswordchecker.com': 'mypasswordchecker.com',
		};
		const canonicalHost = ALTERNATE_DOMAINS[url.hostname];
		if (canonicalHost) {
			const target = `https://${canonicalHost}${url.pathname}${url.search}`;
			return new Response(null, {
				status: 301,
				headers: {
					'Location': target,
					'Cache-Control': 'public, max-age=3600',
				},
			});
		}

		// Only handle /api/* routes
		if (!url.pathname.startsWith('/api/')) {
			return new Response('Not Found - This worker handles /api/* routes only', {
				status: 404
			});
		}

		// CORS headers
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
			'Access-Control-Max-Age': '86400',
			'X-Robots-Tag': 'noindex, nofollow',
		};

		// Handle preflight OPTIONS requests
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: corsHeaders
			});
		}

		try {
			// ═══════════════════════════════════════════════
			// PAYMENT ENDPOINTS
			// ═══════════════════════════════════════════════

			// Unified payment creation (smart routing)
			if (url.pathname === '/api/create-payment' && request.method === 'POST') {
				return await handleCreatePayment(request, env, corsHeaders);
			}

			// PayPal specific endpoints
			if (url.pathname === '/api/paypal/create-order' && request.method === 'POST') {
				return await handleCreatePayPalOrder(request, env, corsHeaders);
			}

			if (url.pathname === '/api/paypal/verify-payment' && request.method === 'POST') {
				return await handlePayPalVerify(request, env, corsHeaders);
			}

			// P3b — PayPal subscription rail (under-$10 tiers: Standard, Basic Quantum).
			if (url.pathname === '/api/paypal/create-subscription' && request.method === 'POST') {
				return await handlePayPalCreateSubscription(request, env, corsHeaders);
			}
			if (url.pathname === '/api/paypal/webhook' && request.method === 'POST') {
				return await handlePayPalWebhook(request, env, corsHeaders);
			}
			if (url.pathname === '/api/paypal/cancel-subscription' && request.method === 'POST') {
				return await handlePayPalCancelSubscription(request, env, corsHeaders);
			}

			// Stripe specific endpoints
			if (url.pathname === '/api/stripe/create-intent' && request.method === 'POST') {
				return await handleCreateStripeIntent(request, env, corsHeaders);
			}

			if (url.pathname === '/api/stripe/webhook' && request.method === 'POST') {
				return await handleStripeWebhook(request, env, corsHeaders);
			}

			// P3a — Stripe Checkout subscription rail ($10+ tiers: Std Quantum, Large, XL, Super).
			if (url.pathname === '/api/create-checkout-session' && request.method === 'POST') {
				return await handleCreateCheckoutSession(request, env, corsHeaders);
			}
			if (url.pathname === '/api/create-portal-session' && request.method === 'POST') {
				return await handleCreatePortalSession(request, env, corsHeaders);
			}

			// ═══════════════════════════════════════════════
			// SESSION & API KEY MANAGEMENT
			// ═══════════════════════════════════════════════

			// Verify premium session
			if (url.pathname === '/api/verify-session' && request.method === 'GET') {
				return await handleVerifySession(request, env, corsHeaders);
			}

			// Verify API key
			if (url.pathname === '/api/verify-api-key' && request.method === 'GET') {
				return await handleVerifyAPIKey(request, env, corsHeaders);
			}

			// ═══════════════════════════════════════════════
			// USAGE TRACKING
			// ═══════════════════════════════════════════════

			if (url.pathname === '/api/track-usage' && request.method === 'POST') {
				return await handleTrackUsage(request, env, corsHeaders);
			}

			// ═══════════════════════════════════════════════
			// AD CLICK TRACKING + /numbers ANALYTICS
			// ═══════════════════════════════════════════════

			if (url.pathname === '/api/track-click' && request.method === 'POST') {
				return await handleTrackClick(request, env, corsHeaders);
			}

			if (url.pathname === '/api/ad-analytics' && request.method === 'POST') {
				return await handleAdAnalytics(request, env, corsHeaders);
			}

			// ═══════════════════════════════════════════════
			// DEVELOPER DASHBOARD
			// ═══════════════════════════════════════════════

			if (url.pathname === '/api/dashboard/usage' && request.method === 'GET') {
				return await handleDashboardUsage(request, env, corsHeaders);
			}

			if (url.pathname === '/api/dashboard/add-domain' && request.method === 'POST') {
				return await handleAddDomain(request, env, corsHeaders);
			}

			if (url.pathname === '/api/dashboard/verify-domain' && request.method === 'POST') {
				return await handleVerifyDomain(request, env, corsHeaders);
			}

			if (url.pathname === '/api/dashboard/get-domains' && request.method === 'GET') {
				return await handleGetDomains(request, env, corsHeaders);
			}

			// P2 — IP allowlist verification (mirrors the domain flow).
			if (url.pathname === '/api/dashboard/add-ip' && request.method === 'POST') {
				return await handleAddIp(request, env, corsHeaders);
			}

			if (url.pathname === '/api/dashboard/verify-ip' && request.method === 'POST') {
				return await handleVerifyIp(request, env, corsHeaders);
			}

			if (url.pathname === '/api/dashboard/get-ips' && request.method === 'GET') {
				return await handleGetIps(request, env, corsHeaders);
			}

			if (url.pathname === '/api/dashboard/rotate-key' && request.method === 'POST') {
				return await handleRotateKey(request, env, corsHeaders);
			}

			if (url.pathname === '/api/dashboard/send-verification' && request.method === 'POST') {
				return await handleSendVerification(request, env, corsHeaders);
			}

			if (url.pathname === '/api/dashboard/verify-email' && request.method === 'POST') {
				return await handleVerifyEmail(request, env, corsHeaders);
			}

			// Email verification via link (GET request)
			if (url.pathname === '/api/verify-email' && request.method === 'GET') {
				return await handleEmailVerificationLink(request, env);
			}


		// Create free API key (POST request)
		if (url.pathname === '/api/create-free-api-key' && request.method === 'POST') {
			return await handleCreateFreeAPIKey(request, env, corsHeaders);
		}

		// P1 — frontend register flow (email + name only, no domain up front).
		if (url.pathname === '/api/auth/register' && request.method === 'POST') {
			return await handleAuthRegister(request, env, corsHeaders);
		}

		// P4 — GitHub OAuth sign-in.
		if (url.pathname === '/api/auth/github' && request.method === 'GET') {
			return await handleGitHubAuthStart(request, env, corsHeaders);
		}
		if (url.pathname === '/api/auth/github/callback' && request.method === 'GET') {
			return await handleGitHubAuthCallback(request, env, corsHeaders);
		}
			// ═══════════════════════════════════════════════
			// ADMIN DASHBOARD (Requires ADMIN_TOKEN)
			// ═══════════════════════════════════════════════

			if (url.pathname === '/api/admin/all-keys' && request.method === 'GET') {
				return await handleAdminAllKeys(request, env, corsHeaders);
			}

			if (url.pathname === '/api/admin/usage-stats' && request.method === 'GET') {
				return await handleAdminUsageStats(request, env, corsHeaders);
			}

			if (url.pathname === '/api/admin/abuse-alerts' && request.method === 'GET') {
				return await handleAdminAbuseAlerts(request, env, corsHeaders);
			}

			if (url.pathname === '/api/admin/suspend-key' && request.method === 'POST') {
				return await handleAdminSuspendKey(request, env, corsHeaders);
			}

		if (url.pathname === '/api/admin/free-tier-stats' && request.method === 'GET') {
			return await handleAdminFreeTierStats(request, env, corsHeaders);
		}

			// Unknown endpoint
			return jsonResponse({
				error: 'Endpoint not found',
				available_endpoints: [
					'POST /api/create-payment',
					'POST /api/paypal/create-order',
					'POST /api/paypal/verify-payment',
					'POST /api/stripe/create-intent',
					'POST /api/stripe/webhook',
					'GET /api/verify-session',
					'GET /api/verify-api-key',
					'POST /api/track-usage',
					'GET /api/dashboard/usage',
					'POST /api/dashboard/add-domain',
					'POST /api/dashboard/verify-domain',
					'GET /api/dashboard/get-domains',
					'POST /api/dashboard/rotate-key',
					'POST /api/dashboard/send-verification',
					'POST /api/dashboard/verify-email',
					'GET /api/admin/all-keys',
					'GET /api/admin/usage-stats',
					'GET /api/admin/abuse-alerts',
					'POST /api/admin/suspend-key',
				]
			}, 404, corsHeaders);

		} catch (error) {
			console.error('API Error:', error);

			// Log error to R2 audit logs
			await logAudit(env, {
				event: 'api_error',
				error: error.message,
				stack: error.stack,
				path: url.pathname,
				method: request.method,
			});

			return jsonResponse({
				error: 'Internal server error',
				message: error.message
			}, 500, corsHeaders);
		}
	}
};

// ═══════════════════════════════════════════════════════════════
// PAYMENT ROUTING & SMART SELECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Select best payment processor based on transaction amount
 *
 * Strategy:
 * - Amount ≤ $5 → PayPal (5% + $0.09 = $0.14 for $1.00)
 * - Amount > $5 → Stripe (2.9% + $0.30 = $0.88 for $20.00)
 *
 * Examples:
 * - $1.00 premium: PayPal saves $0.19 vs Stripe
 * - $20.00 API sub: Stripe saves $0.21 vs PayPal
 * - 100 premium/mo + 10 API/mo = $228/year savings
 */
function selectPaymentProcessor(amount, env) {
	const threshold = parseFloat(env.PAYMENT_THRESHOLD || '5.00');

	if (amount <= threshold) {
		console.log(`Amount $${amount} ≤ $${threshold} → Using PayPal`);
		return 'paypal';
	} else {
		console.log(`Amount $${amount} > $${threshold} → Using Stripe`);
		return 'stripe';
	}
}

/**
 * Calculate processing fee for a given amount and processor
 */
function calculateFee(amount, processor) {
	if (processor === 'paypal') {
		return (amount * 0.05) + 0.09;  // 5% + $0.09
	} else {
		return (amount * 0.029) + 0.30;  // 2.9% + $0.30
	}
}

/**
 * Unified payment creation with smart routing
 *
 * POST /api/create-payment
 * Body: { amount: "1.00", description: "Premium Access", customer_email?: "user@example.com" }
 *
 * Response:
 * {
 *   processor: "paypal" | "stripe",
 *   amount: "1.00",
 *   fee: "0.14",
 *   [paypal fields] | [stripe fields]
 * }
 */
async function handleCreatePayment(request, env, corsHeaders) {
	try {
		const body = await request.json();
		const { amount, description, customer_email } = body;

		if (!amount || !description) {
			return jsonResponse({
				error: 'Missing required fields: amount, description'
			}, 400, corsHeaders);
		}

		const amountNum = parseFloat(amount);
		if (isNaN(amountNum) || amountNum <= 0) {
			return jsonResponse({
				error: 'Invalid amount - must be positive number'
			}, 400, corsHeaders);
		}

		// Smart processor selection
		const processor = selectPaymentProcessor(amountNum, env);
		const fee = calculateFee(amountNum, processor);

		// Log payment creation
		await logAudit(env, {
			event: 'payment_created',
			processor: processor,
			amount: amount,
			fee: fee.toFixed(2),
			description: description,
		});

		// Route to appropriate processor
		if (processor === 'paypal') {
			const result = await createPayPalOrder(amountNum, description, env);

			if (result.error) {
				return jsonResponse({
					error: 'PayPal order creation failed',
					details: result.error
				}, 500, corsHeaders);
			}

			return jsonResponse({
				processor: 'paypal',
				order_id: result.id,
				amount: amount,
				fee: fee.toFixed(2),
				approval_url: result.links.find(l => l.rel === 'approve')?.href,
			}, 200, corsHeaders);

		} else {
			const result = await createStripeIntent(amountNum, description, customer_email, env);

			if (result.error) {
				return jsonResponse({
					error: 'Stripe intent creation failed',
					details: result.error
				}, 500, corsHeaders);
			}

			return jsonResponse({
				processor: 'stripe',
				client_secret: result.client_secret,
				payment_intent_id: result.id,
				amount: amount,
				fee: fee.toFixed(2),
				publishable_key: env.STRIPE_PUBLISHABLE_KEY,
			}, 200, corsHeaders);
		}

	} catch (error) {
		console.error('Create payment error:', error);
		return jsonResponse({
			error: 'Failed to create payment',
			message: error.message
		}, 500, corsHeaders);
	}
}

// ═══════════════════════════════════════════════════════════════
// PAYPAL INTEGRATION
// ═══════════════════════════════════════════════════════════════

/**
 * Get PayPal OAuth access token
 */
async function getPayPalAccessToken(env) {
	const auth = btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`);
	const baseURL = env.PAYPAL_ENVIRONMENT === 'sandbox'
		? 'https://api-m.sandbox.paypal.com'
		: 'https://api-m.paypal.com';

	const response = await fetch(`${baseURL}/v1/oauth2/token`, {
		method: 'POST',
		headers: {
			'Authorization': `Basic ${auth}`,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: 'grant_type=client_credentials',
	});

	if (!response.ok) {
		throw new Error(`PayPal auth failed: ${response.status}`);
	}

	const data = await response.json();
	return data.access_token;
}

/**
 * Create PayPal order
 */
async function createPayPalOrder(amount, description, env) {
	const accessToken = await getPayPalAccessToken(env);
	const baseURL = env.PAYPAL_ENVIRONMENT === 'sandbox'
		? 'https://api-m.sandbox.paypal.com'
		: 'https://api-m.paypal.com';

	const response = await fetch(`${baseURL}/v2/checkout/orders`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${accessToken}`,
		},
		body: JSON.stringify({
			intent: 'CAPTURE',
			purchase_units: [{
				amount: {
					currency_code: 'USD',
					value: amount.toFixed(2),
				},
				description: description,
			}],
			application_context: {
				return_url: `${env.DOMAIN || 'https://mypasswordchecker.com'}/payment-success`,
				cancel_url: `${env.DOMAIN || 'https://mypasswordchecker.com'}/payment-cancel`,
			},
		}),
	});

	const data = await response.json();

	if (!response.ok) {
		console.error('PayPal order creation failed:', data);
		return { error: data };
	}

	return data;
}

/**
 * Handle PayPal order creation
 *
 * POST /api/paypal/create-order
 * Body: { amount: "1.00", description: "Premium Access" }
 */
async function handleCreatePayPalOrder(request, env, corsHeaders) {
	try {
		const body = await request.json();
		const { amount, description } = body;

		if (!amount || !description) {
			return jsonResponse({
				error: 'Missing required fields: amount, description'
			}, 400, corsHeaders);
		}

		const result = await createPayPalOrder(parseFloat(amount), description, env);

		if (result.error) {
			return jsonResponse({
				error: 'PayPal order creation failed',
				details: result.error
			}, 500, corsHeaders);
		}

		await logAudit(env, {
			event: 'paypal_order_created',
			order_id: result.id,
			amount: amount,
		});

		return jsonResponse({
			order_id: result.id,
			approval_url: result.links.find(l => l.rel === 'approve')?.href,
		}, 200, corsHeaders);

	} catch (error) {
		console.error('PayPal order creation error:', error);
		return jsonResponse({
			error: 'Failed to create PayPal order',
			message: error.message
		}, 500, corsHeaders);
	}
}

/**
 * Verify and capture PayPal payment, then activate premium session
 *
 * POST /api/paypal/verify-payment
 * Body: { order_id: "PAYPAL_ORDER_ID" }
 */
async function handlePayPalVerify(request, env, corsHeaders) {
	try {
		const body = await request.json();
		const { order_id } = body;

		if (!order_id) {
			return jsonResponse({
				error: 'Missing order_id'
			}, 400, corsHeaders);
		}

		const accessToken = await getPayPalAccessToken(env);
		const baseURL = env.PAYPAL_ENVIRONMENT === 'sandbox'
			? 'https://api-m.sandbox.paypal.com'
			: 'https://api-m.paypal.com';

		// Capture the payment
		const captureResponse = await fetch(
			`${baseURL}/v2/checkout/orders/${order_id}/capture`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${accessToken}`,
				},
			}
		);

		const captureData = await captureResponse.json();

		if (!captureResponse.ok || captureData.status !== 'COMPLETED') {
			return jsonResponse({
				success: false,
				error: 'Payment not completed',
				details: captureData
			}, 400, corsHeaders);
		}

		// Extract payment details
		const capture = captureData.purchase_units[0].payments.captures[0];
		const amount = parseFloat(capture.amount.value);
		const payerEmail = captureData.payer?.email_address;

		// Create premium session
		const session_id = `sess_${generateRandomId(32)}`;
		const now = Date.now();
		const durationHours = parseInt(env.PREMIUM_DURATION_HOURS || '24');
		const expires = now + (durationHours * 60 * 60 * 1000);

		// Insert into D1 database
		await env.DB.prepare(`
			INSERT INTO sessions (
				session_id, user_email, created_at, expires_at,
				payment_processor, payment_id, amount, currency,
				features, status
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).bind(
			session_id,
			payerEmail || null,
			now,
			expires,
			'paypal',
			order_id,
			amount,
			'USD',
			JSON.stringify(['phonetic', 'quantum', 'breach']),
			'active'
		).run();

		// Cache session in KV (24 hours)
		await env.SESSION_CACHE.put(session_id, JSON.stringify({
			expires_at: expires,
			features: ['phonetic', 'quantum', 'breach'],
			processor: 'paypal',
			email: payerEmail,
		}), { expirationTtl: durationHours * 3600 });

		// Log successful activation
		await logAudit(env, {
			event: 'premium_activated',
			session_id: session_id,
			payment_id: order_id,
			amount: amount,
			processor: 'paypal',
			email: payerEmail,
		});

		// Record transaction
		await recordTransaction(env, {
			transaction_id: `txn_${generateRandomId(24)}`,
			payer_email: payerEmail,
			amount: amount,
			fee: calculateFee(amount, 'paypal'),
			payment_processor: 'paypal',
			processor_transaction_id: order_id,
			transaction_type: 'premium_purchase',
			session_id: session_id,
			status: 'completed',
		});

		return jsonResponse({
			success: true,
			session_id: session_id,
			expires_at: expires,
			features: ['phonetic', 'quantum', 'breach'],
			hours_remaining: durationHours,
		}, 200, corsHeaders);

	} catch (error) {
		console.error('PayPal verify error:', error);
		return jsonResponse({
			success: false,
			error: 'Failed to verify PayPal payment',
			message: error.message
		}, 500, corsHeaders);
	}
}

// ═══════════════════════════════════════════════════════════════
// STRIPE INTEGRATION
// ═══════════════════════════════════════════════════════════════

/**
 * Create Stripe payment intent
 */
async function createStripeIntent(amount, description, customer_email, env) {
	const amountCents = Math.round(amount * 100);

	const params = new URLSearchParams({
		amount: amountCents.toString(),
		currency: 'usd',
		description: description,
		'automatic_payment_methods[enabled]': 'true',
	});

	if (customer_email) {
		params.append('metadata[customer_email]', customer_email);
		params.append('receipt_email', customer_email);
	}

	const response = await fetch('https://api.stripe.com/v1/payment_intents', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: params,
	});

	const data = await response.json();

	if (!response.ok) {
		console.error('Stripe intent creation failed:', data);
		return { error: data };
	}

	return data;
}

/**
 * Handle Stripe payment intent creation
 *
 * POST /api/stripe/create-intent
 * Body: { amount: "20.00", description: "API Subscription", customer_email: "user@example.com" }
 */
async function handleCreateStripeIntent(request, env, corsHeaders) {
	try {
		const body = await request.json();
		const { amount, description, customer_email } = body;

		if (!amount || !description) {
			return jsonResponse({
				error: 'Missing required fields: amount, description'
			}, 400, corsHeaders);
		}

		const result = await createStripeIntent(
			parseFloat(amount),
			description,
			customer_email,
			env
		);

		if (result.error) {
			return jsonResponse({
				error: 'Stripe intent creation failed',
				details: result.error
			}, 500, corsHeaders);
		}

		await logAudit(env, {
			event: 'stripe_intent_created',
			payment_intent_id: result.id,
			amount: amount,
			email: customer_email,
		});

		return jsonResponse({
			client_secret: result.client_secret,
			payment_intent_id: result.id,
			publishable_key: env.STRIPE_PUBLISHABLE_KEY,
		}, 200, corsHeaders);

	} catch (error) {
		console.error('Stripe intent creation error:', error);
		return jsonResponse({
			error: 'Failed to create Stripe intent',
			message: error.message
		}, 500, corsHeaders);
	}
}

/**
 * Handle Stripe webhooks
 *
 * POST /api/stripe/webhook
 * Processes: payment_intent.succeeded, payment_intent.payment_failed
 */
async function handleStripeWebhook(request, env, corsHeaders) {
	try {
		const signature = request.headers.get('stripe-signature');
		const body = await request.text();

		// Verify webhook signature
		const verified = await verifyStripeSignature(
			body,
			signature,
			env.STRIPE_WEBHOOK_SECRET
		);

		if (!verified) {
			console.error('Invalid Stripe webhook signature');
			return jsonResponse({ error: 'Invalid signature' }, 401, corsHeaders);
		}

		const event = JSON.parse(body);
		console.log('Stripe webhook received:', event.type);

		// Handle payment success
		if (event.type === 'payment_intent.succeeded') {
			const paymentIntent = event.data.object;
			const amount = paymentIntent.amount / 100;
			const email = paymentIntent.metadata?.customer_email || paymentIntent.receipt_email;

			// Determine if this is premium access or API subscription
			if (amount <= parseFloat(env.PAYMENT_THRESHOLD || '5.00')) {
				// Premium access (small amount via Stripe - unusual but supported)
				const session_id = `sess_${generateRandomId(32)}`;
				const now = Date.now();
				const durationHours = parseInt(env.PREMIUM_DURATION_HOURS || '24');
				const expires = now + (durationHours * 60 * 60 * 1000);

				await env.DB.prepare(`
					INSERT INTO sessions (
						session_id, user_email, created_at, expires_at,
						payment_processor, payment_id, amount, currency,
						features, status
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`).bind(
					session_id, email, now, expires,
					'stripe', paymentIntent.id, amount, 'USD',
					JSON.stringify(['phonetic', 'quantum', 'breach']),
					'active'
				).run();

				await env.SESSION_CACHE.put(session_id, JSON.stringify({
					expires_at: expires,
					features: ['phonetic', 'quantum', 'breach'],
					processor: 'stripe',
					email: email,
				}), { expirationTtl: durationHours * 3600 });

				await logAudit(env, {
					event: 'premium_activated_stripe',
					session_id: session_id,
					payment_intent_id: paymentIntent.id,
					amount: amount,
					email: email,
				});

			} else {
				// API subscription (large amount)
				const api_key = `sk_live_${generateRandomId(32)}`;


			// Determine tier based on amount
			// NOTE: Tier 0 (free) is created via /api/create-free-api-key endpoint
			// Stripe payments start at tier 1 ($5+)
			let tier = 1;
			let quota_limit = 12000;        // Password checks
			let quantum_limit = 100;        // Quantum estimates
			let phonetic_limit = 100;       // Phonetic generations
			let breach_limit = 0;           // Breach checks (tier 3+)

			// Tier thresholds keyed off the permanent prices (amount in cents).
			// Quantum tiers (3-6) carry the doubled quotas.
			if (amount >= 15000) {          // $150+ = Tier 6 (Super Quantum)
				tier = 6;
				quota_limit = 6000000;
				quantum_limit = 600000;
				phonetic_limit = 600000;
				breach_limit = 400000;
			} else if (amount >= 7500) {    // $75+ = Tier 5 (XL Quantum)
				tier = 5;
				quota_limit = 2000000;
				quantum_limit = 200000;
				phonetic_limit = 200000;
				breach_limit = 40000;
			} else if (amount >= 4000) {    // $40+ = Tier 4 (Large Quantum)
				tier = 4;
				quota_limit = 800000;
				quantum_limit = 50000;
				phonetic_limit = 50000;
				breach_limit = 10000;
			} else if (amount >= 2000) {    // $20+ = Tier 3 (Standard Quantum)
				tier = 3;
				quota_limit = 300000;
				quantum_limit = 10000;
				phonetic_limit = 10000;
				breach_limit = 2000;
			} else if (amount >= 500) {     // $5+ = Tier 2 (Basic Quantum)
				tier = 2;
				quota_limit = 50000;
				quantum_limit = 1000;
				phonetic_limit = 1000;
				breach_limit = 0;
			} else if (amount >= 250) {     // $2.50+ = Tier 1 (Standard)
				tier = 1;
				quota_limit = 12000;
				quantum_limit = 100;
				phonetic_limit = 100;
				breach_limit = 0;
			}

				const now = Date.now();
				const billingCycleEnd = now + (30 * 24 * 60 * 60 * 1000);  // 30 days


			await env.DB.prepare(`
				INSERT INTO api_keys (
					api_key, user_email, tier, created_at,
					quota_limit, quota_used,
					quantum_limit, quantum_used,
					phonetic_limit, phonetic_used,
					breach_limit, breach_used,
					billing_cycle_start, billing_cycle_end,
					payment_processor, stripe_payment_intent_id, status
				) VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?, 0, ?, 0, ?, ?, ?, ?, 'active')
			`).bind(
				api_key, email, tier, now,
				quota_limit, quantum_limit, phonetic_limit, breach_limit,
				now, billingCycleEnd,
				'stripe', paymentIntent.id
			).run();












				// Cache API key
				await env.API_KEYS.put(api_key, JSON.stringify({
					email, tier, quota, used: 0,
					billing_cycle_end: billingCycleEnd,
				}), { expirationTtl: 30 * 86400 });  // 30 days

				await logAudit(env, {
					event: 'api_key_created',
					api_key: api_key,
					email: email,
					tier: tier,
					payment_intent_id: paymentIntent.id,
					amount: amount,
				});
			}

			// Record transaction
			await recordTransaction(env, {
				transaction_id: `txn_${generateRandomId(24)}`,
				payer_email: email,
				amount: amount,
				fee: calculateFee(amount, 'stripe'),
				payment_processor: 'stripe',
				processor_transaction_id: paymentIntent.id,
				transaction_type: amount <= 5 ? 'premium_purchase' : 'api_subscription',
				status: 'completed',
			});
		}

		// Handle payment failure
		if (event.type === 'payment_intent.payment_failed') {
			const paymentIntent = event.data.object;

			await logAudit(env, {
				event: 'payment_failed',
				payment_intent_id: paymentIntent.id,
				amount: paymentIntent.amount / 100,
				error: paymentIntent.last_payment_error?.message,
			});
		}

		// ─────────────────────────────────────────────────────────────
		// P3a — Stripe Checkout subscription lifecycle (tiers $10+).
		// Single source of truth for tier mapping is price.metadata.tier
		// on the Stripe Price; this handler never hardcodes price IDs.
		// ─────────────────────────────────────────────────────────────

		// Checkout finished — link customer + subscription to the api_key.
		if (event.type === 'checkout.session.completed') {
			const session = event.data.object;
			const apiKey = session.client_reference_id;
			if (apiKey && session.customer && session.subscription) {
				await env.DB.prepare(`
					UPDATE api_keys
					SET stripe_customer_id = ?,
					    stripe_subscription_id = ?,
					    payment_processor = 'stripe'
					WHERE api_key = ?
				`).bind(session.customer, session.subscription, apiKey).run();
				await env.API_KEYS.delete(apiKey);
				await logAudit(env, {
					event: 'stripe_checkout_completed',
					api_key: apiKey,
					customer_id: session.customer,
					subscription_id: session.subscription,
				});
			}
		}

		// Subscription created or updated — set tier + reset the matching
		// quota counters from the catalog, mark active.
		if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
			const sub = event.data.object;
			const item = sub.items && sub.items.data && sub.items.data[0];
			const tier = Number(item && item.price && item.price.metadata && item.price.metadata.tier || 0);
			if (tier > 0 && sub.customer) {
				const q = tierQuotas(tier);
				const now = Date.now();
				const cycleEnd = (Number(sub.current_period_end) || (Date.now()/1000 + 30*86400)) * 1000;
				await env.DB.prepare(`
					UPDATE api_keys
					SET tier = ?, status = 'active',
					    quota_limit = ?, quota_used = 0,
					    quantum_limit = ?, quantum_used = 0,
					    phonetic_limit = ?, phonetic_used = 0,
					    breach_limit = ?, breach_used = 0,
					    billing_cycle_start = ?, billing_cycle_end = ?,
					    stripe_subscription_id = ?,
					    payment_processor = 'stripe'
					WHERE stripe_customer_id = ?
				`).bind(
					tier,
					q.quota, q.quantum, q.phonetic, q.breach,
					now, cycleEnd, sub.id, sub.customer
				).run();
				// Bust the KV cache so the next /api/verify-api-key reads fresh
				// limits + status. We need the api_key to do that.
				const row = await env.DB.prepare(
					`SELECT api_key FROM api_keys WHERE stripe_customer_id = ?`
				).bind(sub.customer).first();
				if (row) await env.API_KEYS.delete(row.api_key);
				await logAudit(env, {
					event: 'stripe_subscription_active',
					subscription_id: sub.id,
					tier: tier,
				});
			}
		}

		// Subscription cancelled at period end (or immediately).
		if (event.type === 'customer.subscription.deleted') {
			const sub = event.data.object;
			await env.DB.prepare(
				`UPDATE api_keys SET status = 'canceled' WHERE stripe_subscription_id = ?`
			).bind(sub.id).run();
			const row = await env.DB.prepare(
				`SELECT api_key FROM api_keys WHERE stripe_subscription_id = ?`
			).bind(sub.id).first();
			if (row) await env.API_KEYS.delete(row.api_key);
			await logAudit(env, {
				event: 'stripe_subscription_canceled',
				subscription_id: sub.id,
			});
		}

		// Recurring charge failed — suspend until the customer fixes the
		// payment method (Stripe will retry automatically).
		if (event.type === 'invoice.payment_failed') {
			const invoice = event.data.object;
			if (invoice.subscription) {
				await env.DB.prepare(
					`UPDATE api_keys SET status = 'suspended', suspended_reason = ? WHERE stripe_subscription_id = ?`
				).bind('Payment failed — update card in Stripe portal', invoice.subscription).run();
				const row = await env.DB.prepare(
					`SELECT api_key FROM api_keys WHERE stripe_subscription_id = ?`
				).bind(invoice.subscription).first();
				if (row) await env.API_KEYS.delete(row.api_key);
				await logAudit(env, {
					event: 'stripe_subscription_suspended',
					subscription_id: invoice.subscription,
				});
			}
		}

		return jsonResponse({ received: true }, 200, corsHeaders);

	} catch (error) {
		console.error('Stripe webhook error:', error);
		return jsonResponse({
			error: 'Webhook processing failed',
			message: error.message
		}, 500, corsHeaders);
	}
}

// ═══════════════════════════════════════════════════════════════
// P3 — Subscription tier catalog (matches public/js/pricing.js).
// One place; webhooks + checkout handlers read from here.
// ═══════════════════════════════════════════════════════════════

function tierQuotas(tier) {
	switch (Number(tier)) {
		case 1: return { quota: 12000,     quantum: 100,     phonetic: 100,     breach: 0      };
		case 2: return { quota: 50000,     quantum: 1000,    phonetic: 1000,    breach: 0      };
		case 3: return { quota: 300000,    quantum: 10000,   phonetic: 10000,   breach: 2000   };
		case 4: return { quota: 800000,    quantum: 50000,   phonetic: 50000,   breach: 10000  };
		case 5: return { quota: 2000000,   quantum: 200000,  phonetic: 200000,  breach: 40000  };
		case 6: return { quota: 10000000,  quantum: 1000000, phonetic: 1000000, breach: 400000 };
		default: return { quota: 50, quantum: 0, phonetic: 0, breach: 0 };
	}
}

function stripeTierToPriceId(env, tier) {
	const key = 'STRIPE_PRICE_TIER_' + String(tier);
	return env[key] || null;
}

function paypalTierToPlanId(env, tier) {
	const key = 'PAYPAL_PLAN_TIER_' + String(tier);
	return env[key] || null;
}

// ═══════════════════════════════════════════════════════════════
// P3a — Stripe Checkout subscription creation
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/create-checkout-session
 * Body: { api_key, tier }
 * Returns: { url }
 *
 * Creates a Stripe Checkout Session in subscription mode for the
 * requested tier. The Price ID per tier is configured as a wrangler
 * var (STRIPE_PRICE_TIER_<n>) so the worker never embeds price IDs.
 */
async function handleCreateCheckoutSession(request, env, corsHeaders) {
	try {
		const body = await request.json();
		const apiKey = body.api_key || body.apiKey;
		const tier = Number(body.tier);

		if (!apiKey) {
			return jsonResponse({ error: 'Missing api_key' }, 400, corsHeaders);
		}
		if (![3, 4, 5, 6].includes(tier)) {
			return jsonResponse({
				error: 'Stripe handles only $10+ tiers (Standard Quantum and up). For Standard $2.50 or Basic Quantum $5 use /api/paypal/create-subscription.'
			}, 400, corsHeaders);
		}
		const priceId = stripeTierToPriceId(env, tier);
		if (!priceId) {
			return jsonResponse({
				error: 'No Stripe Price configured for this tier',
				details: 'Set STRIPE_PRICE_TIER_' + tier + ' in wrangler.toml after creating the Price.'
			}, 500, corsHeaders);
		}

		const keyRow = await env.DB.prepare(
			`SELECT user_email, stripe_customer_id FROM api_keys WHERE api_key = ? AND status = 'active'`
		).bind(apiKey).first();
		if (!keyRow) {
			return jsonResponse({ error: 'API key not found or inactive' }, 401, corsHeaders);
		}

		const params = new URLSearchParams();
		params.set('mode', 'subscription');
		params.set('line_items[0][price]', priceId);
		params.set('line_items[0][quantity]', '1');
		params.set('client_reference_id', apiKey);
		params.set('success_url', 'https://mypasswordchecker.com/dashboard.html?upgrade=success');
		params.set('cancel_url', 'https://mypasswordchecker.com/dashboard.html?upgrade=cancel');
		if (keyRow.stripe_customer_id) {
			params.set('customer', keyRow.stripe_customer_id);
		} else if (keyRow.user_email) {
			params.set('customer_email', keyRow.user_email);
		}
		params.set('allow_promotion_codes', 'true');

		const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: params,
		});
		const data = await stripeRes.json();
		if (!stripeRes.ok || !data.url) {
			console.error('Stripe checkout session failed:', data);
			return jsonResponse({
				error: 'Failed to create checkout session',
				details: data.error || data
			}, 502, corsHeaders);
		}

		await logAudit(env, {
			event: 'stripe_checkout_session_created',
			api_key: apiKey,
			tier: tier,
			session_id: data.id,
		});

		return jsonResponse({ url: data.url, session_id: data.id }, 200, corsHeaders);
	} catch (error) {
		console.error('Checkout session error:', error);
		return jsonResponse({ error: 'Failed to create checkout session', message: error.message }, 500, corsHeaders);
	}
}

// ═══════════════════════════════════════════════════════════════
// P3a — Stripe Customer Portal (hosted "Manage subscription")
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/create-portal-session
 * Body: { api_key }
 * Returns: { url }
 */
async function handleCreatePortalSession(request, env, corsHeaders) {
	try {
		const body = await request.json();
		const apiKey = body.api_key || body.apiKey;
		if (!apiKey) {
			return jsonResponse({ error: 'Missing api_key' }, 400, corsHeaders);
		}
		const row = await env.DB.prepare(
			`SELECT stripe_customer_id FROM api_keys WHERE api_key = ? AND status IN ('active', 'suspended')`
		).bind(apiKey).first();
		if (!row || !row.stripe_customer_id) {
			return jsonResponse({ error: 'No Stripe customer attached to this key' }, 404, corsHeaders);
		}
		const params = new URLSearchParams();
		params.set('customer', row.stripe_customer_id);
		params.set('return_url', 'https://mypasswordchecker.com/dashboard.html');
		const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: params,
		});
		const data = await res.json();
		if (!res.ok || !data.url) {
			console.error('Stripe portal session failed:', data);
			return jsonResponse({ error: 'Failed to create portal session', details: data.error || data }, 502, corsHeaders);
		}
		return jsonResponse({ url: data.url }, 200, corsHeaders);
	} catch (error) {
		console.error('Portal session error:', error);
		return jsonResponse({ error: 'Failed to create portal session', message: error.message }, 500, corsHeaders);
	}
}

// ═══════════════════════════════════════════════════════════════
// P3b — PayPal recurring subscriptions (under-$10 tiers)
// ═══════════════════════════════════════════════════════════════

function paypalBase(env) {
	return env.PAYPAL_ENVIRONMENT === 'sandbox'
		? 'https://api-m.sandbox.paypal.com'
		: 'https://api-m.paypal.com';
}

/**
 * POST /api/paypal/create-subscription
 * Body: { api_key, tier }
 * Returns: { approve_url, subscription_id }
 *
 * Creates a PayPal Subscription against the Billing Plan configured
 * for the tier (PAYPAL_PLAN_TIER_<n>). Frontend redirects the user
 * to approve_url; PayPal calls BILLING.SUBSCRIPTION.ACTIVATED on the
 * webhook once approved.
 */
async function handlePayPalCreateSubscription(request, env, corsHeaders) {
	try {
		const body = await request.json();
		const apiKey = body.api_key || body.apiKey;
		const tier = Number(body.tier);

		if (!apiKey) {
			return jsonResponse({ error: 'Missing api_key' }, 400, corsHeaders);
		}
		if (![1, 2].includes(tier)) {
			return jsonResponse({
				error: 'PayPal handles only Standard ($2.50) and Basic Quantum ($5). $10+ tiers use /api/create-checkout-session.'
			}, 400, corsHeaders);
		}
		const planId = paypalTierToPlanId(env, tier);
		if (!planId) {
			return jsonResponse({
				error: 'No PayPal Plan configured for this tier',
				details: 'Set PAYPAL_PLAN_TIER_' + tier + ' in wrangler.toml after creating the Plan.'
			}, 500, corsHeaders);
		}

		const keyRow = await env.DB.prepare(
			`SELECT user_email FROM api_keys WHERE api_key = ? AND status = 'active'`
		).bind(apiKey).first();
		if (!keyRow) {
			return jsonResponse({ error: 'API key not found or inactive' }, 401, corsHeaders);
		}

		const accessToken = await getPayPalAccessToken(env);
		const ppRes = await fetch(paypalBase(env) + '/v1/billing/subscriptions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
				'PayPal-Request-Id': generateRandomId(32),
			},
			body: JSON.stringify({
				plan_id: planId,
				custom_id: apiKey,
				subscriber: keyRow.user_email ? { email_address: keyRow.user_email } : undefined,
				application_context: {
					brand_name: 'MyPasswordChecker',
					user_action: 'SUBSCRIBE_NOW',
					return_url: 'https://mypasswordchecker.com/dashboard.html?upgrade=success',
					cancel_url: 'https://mypasswordchecker.com/dashboard.html?upgrade=cancel',
				}
			})
		});
		const data = await ppRes.json();
		if (!ppRes.ok || !data.id) {
			console.error('PayPal subscription create failed:', data);
			return jsonResponse({ error: 'Failed to create subscription', details: data }, 502, corsHeaders);
		}
		const approve = (data.links || []).find(l => l.rel === 'approve');
		if (!approve) {
			return jsonResponse({ error: 'PayPal did not return an approve link', details: data }, 502, corsHeaders);
		}

		await logAudit(env, {
			event: 'paypal_subscription_created',
			api_key: apiKey,
			tier: tier,
			subscription_id: data.id,
		});

		return jsonResponse({ approve_url: approve.href, subscription_id: data.id }, 200, corsHeaders);
	} catch (error) {
		console.error('PayPal subscription error:', error);
		return jsonResponse({ error: 'Failed to create subscription', message: error.message }, 500, corsHeaders);
	}
}

/**
 * POST /api/paypal/webhook
 * Verifies via PayPal's /v1/notifications/verify-webhook-signature.
 * Handles subscription lifecycle events.
 */
async function handlePayPalWebhook(request, env, corsHeaders) {
	try {
		const rawBody = await request.text();
		const headers = {
			auth_algo: request.headers.get('paypal-auth-algo'),
			cert_url: request.headers.get('paypal-cert-url'),
			transmission_id: request.headers.get('paypal-transmission-id'),
			transmission_sig: request.headers.get('paypal-transmission-sig'),
			transmission_time: request.headers.get('paypal-transmission-time'),
		};
		if (!headers.transmission_id || !env.PAYPAL_WEBHOOK_ID) {
			return jsonResponse({ error: 'Missing PayPal signature headers or webhook id' }, 400, corsHeaders);
		}

		const accessToken = await getPayPalAccessToken(env);
		const verifyRes = await fetch(paypalBase(env) + '/v1/notifications/verify-webhook-signature', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				auth_algo: headers.auth_algo,
				cert_url: headers.cert_url,
				transmission_id: headers.transmission_id,
				transmission_sig: headers.transmission_sig,
				transmission_time: headers.transmission_time,
				webhook_id: env.PAYPAL_WEBHOOK_ID,
				webhook_event: JSON.parse(rawBody),
			})
		});
		const verifyData = await verifyRes.json();
		if (verifyData.verification_status !== 'SUCCESS') {
			console.error('PayPal webhook signature invalid:', verifyData);
			return jsonResponse({ error: 'Invalid signature' }, 401, corsHeaders);
		}

		const event = JSON.parse(rawBody);
		const resource = event.resource || {};
		const apiKey = resource.custom_id;
		const subscriptionId = resource.id;

		console.log('PayPal webhook:', event.event_type);

		if (event.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED' && apiKey) {
			// PayPal doesn't put the plan/tier on the webhook payload — we
			// fetch it from the subscription resource to be safe. (Plans
			// are recorded in env.PAYPAL_PLAN_TIER_<n>; we reverse-lookup.)
			let tier = 0;
			const planId = resource.plan_id;
			[1, 2].forEach(t => {
				if (paypalTierToPlanId(env, t) === planId) tier = t;
			});
			if (tier > 0) {
				const q = tierQuotas(tier);
				const now = Date.now();
				const cycleEnd = now + 30 * 24 * 60 * 60 * 1000;
				await env.DB.prepare(`
					UPDATE api_keys
					SET tier = ?, status = 'active',
					    quota_limit = ?, quota_used = 0,
					    quantum_limit = ?, quantum_used = 0,
					    phonetic_limit = ?, phonetic_used = 0,
					    breach_limit = ?, breach_used = 0,
					    billing_cycle_start = ?, billing_cycle_end = ?,
					    stripe_subscription_id = ?,
					    payment_processor = 'paypal'
					WHERE api_key = ?
				`).bind(
					tier, q.quota, q.quantum, q.phonetic, q.breach,
					now, cycleEnd, subscriptionId, apiKey
				).run();
				await env.API_KEYS.delete(apiKey);
				await logAudit(env, {
					event: 'paypal_subscription_active',
					api_key: apiKey,
					tier: tier,
					subscription_id: subscriptionId,
				});
			}
		}

		if (event.event_type === 'BILLING.SUBSCRIPTION.CANCELLED' || event.event_type === 'BILLING.SUBSCRIPTION.EXPIRED') {
			await env.DB.prepare(
				`UPDATE api_keys SET status = 'canceled' WHERE stripe_subscription_id = ?`
			).bind(subscriptionId).run();
			const row = await env.DB.prepare(
				`SELECT api_key FROM api_keys WHERE stripe_subscription_id = ?`
			).bind(subscriptionId).first();
			if (row) await env.API_KEYS.delete(row.api_key);
			await logAudit(env, {
				event: 'paypal_subscription_canceled',
				subscription_id: subscriptionId,
			});
		}

		if (event.event_type === 'BILLING.SUBSCRIPTION.SUSPENDED' || event.event_type === 'PAYMENT.SALE.DENIED') {
			const subId = event.event_type === 'PAYMENT.SALE.DENIED'
				? resource.billing_agreement_id || subscriptionId
				: subscriptionId;
			await env.DB.prepare(
				`UPDATE api_keys SET status = 'suspended', suspended_reason = ? WHERE stripe_subscription_id = ?`
			).bind('PayPal payment failed', subId).run();
			const row = await env.DB.prepare(
				`SELECT api_key FROM api_keys WHERE stripe_subscription_id = ?`
			).bind(subId).first();
			if (row) await env.API_KEYS.delete(row.api_key);
			await logAudit(env, {
				event: 'paypal_subscription_suspended',
				subscription_id: subId,
			});
		}

		return jsonResponse({ received: true }, 200, corsHeaders);
	} catch (error) {
		console.error('PayPal webhook error:', error);
		return jsonResponse({ error: 'Webhook processing failed', message: error.message }, 500, corsHeaders);
	}
}

/**
 * POST /api/paypal/cancel-subscription
 * Body: { api_key, reason? }
 * Cancels the user's PayPal subscription (BILLING.SUBSCRIPTION.CANCELLED
 * webhook fires on success to do the D1 update).
 */
async function handlePayPalCancelSubscription(request, env, corsHeaders) {
	try {
		const body = await request.json();
		const apiKey = body.api_key || body.apiKey;
		const reason = String(body.reason || 'User cancelled from dashboard').slice(0, 128);
		if (!apiKey) {
			return jsonResponse({ error: 'Missing api_key' }, 400, corsHeaders);
		}
		const row = await env.DB.prepare(
			`SELECT stripe_subscription_id, payment_processor FROM api_keys WHERE api_key = ?`
		).bind(apiKey).first();
		if (!row || !row.stripe_subscription_id || row.payment_processor !== 'paypal') {
			return jsonResponse({ error: 'No PayPal subscription attached to this key' }, 404, corsHeaders);
		}
		const accessToken = await getPayPalAccessToken(env);
		const ppRes = await fetch(
			paypalBase(env) + '/v1/billing/subscriptions/' + encodeURIComponent(row.stripe_subscription_id) + '/cancel',
			{
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ reason })
			}
		);
		if (!ppRes.ok && ppRes.status !== 204) {
			let detail = null;
			try { detail = await ppRes.json(); } catch (e) {}
			console.error('PayPal cancel failed:', detail);
			return jsonResponse({ error: 'Failed to cancel subscription', details: detail }, 502, corsHeaders);
		}
		await logAudit(env, {
			event: 'paypal_subscription_cancel_requested',
			api_key: apiKey,
			subscription_id: row.stripe_subscription_id,
		});
		return jsonResponse({ success: true, message: 'Cancellation requested — the BILLING.SUBSCRIPTION.CANCELLED webhook will finalize the state.' }, 200, corsHeaders);
	} catch (error) {
		console.error('PayPal cancel error:', error);
		return jsonResponse({ error: 'Failed to cancel subscription', message: error.message }, 500, corsHeaders);
	}
}

/**
 * Verify Stripe webhook signature using HMAC SHA-256
 */
async function verifyStripeSignature(payload, signature, secret) {
	try {
		const parts = signature.split(',');
		const timestamp = parts.find(p => p.startsWith('t='))?.substring(2);
		const sig = parts.find(p => p.startsWith('v1='))?.substring(3);

		if (!timestamp || !sig) {
			return false;
		}

		const signedPayload = `${timestamp}.${payload}`;
		const encoder = new TextEncoder();

		const key = await crypto.subtle.importKey(
			'raw',
			encoder.encode(secret),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign']
		);

		const signature_bytes = await crypto.subtle.sign(
			'HMAC',
			key,
			encoder.encode(signedPayload)
		);

		const expectedSig = Array.from(new Uint8Array(signature_bytes))
			.map(b => b.toString(16).padStart(2, '0'))
			.join('');

		return expectedSig === sig;

	} catch (error) {
		console.error('Signature verification error:', error);
		return false;
	}
}

// ═══════════════════════════════════════════════════════════════
// SESSION & API KEY VERIFICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Verify premium session validity
 *
 * GET /api/verify-session?session_id=sess_xxx
 */
async function handleVerifySession(request, env, corsHeaders) {
	try {
		const url = new URL(request.url);
		const session_id = url.searchParams.get('session_id');

		if (!session_id) {
			return jsonResponse({
				error: 'Missing session_id parameter'
			}, 400, corsHeaders);
		}

		// Check KV cache first (fast path)
		const cached = await env.SESSION_CACHE.get(session_id);
		if (cached) {
			const data = JSON.parse(cached);
			if (data.expires_at > Date.now()) {
				return jsonResponse({
					valid: true,
					features: data.features,
					expires_at: data.expires_at,
					processor: data.processor,
					source: 'cache',
				}, 200, corsHeaders);
			}
		}

		// Check D1 database
		const result = await env.DB.prepare(`
			SELECT * FROM sessions
			WHERE session_id = ? AND status = 'active'
		`).bind(session_id).first();

		if (!result) {
			return jsonResponse({
				valid: false,
				error: 'Session not found'
			}, 404, corsHeaders);
		}

		// Check expiration
		if (result.expires_at < Date.now()) {
			// Mark as expired
			await env.DB.prepare(`
				UPDATE sessions SET status = 'expired' WHERE session_id = ?
			`).bind(session_id).run();

			return jsonResponse({
				valid: false,
				error: 'Session expired'
			}, 401, corsHeaders);
		}

		// Cache for next time
		const ttl = Math.floor((result.expires_at - Date.now()) / 1000);
		if (ttl > 0) {
			await env.SESSION_CACHE.put(session_id, JSON.stringify({
				expires_at: result.expires_at,
				features: JSON.parse(result.features),
				processor: result.payment_processor,
			}), { expirationTtl: ttl });
		}

		return jsonResponse({
			valid: true,
			features: JSON.parse(result.features),
			expires_at: result.expires_at,
			processor: result.payment_processor,
			source: 'database',
		}, 200, corsHeaders);

	} catch (error) {
		console.error('Session verification error:', error);
		return jsonResponse({
			error: 'Failed to verify session',
			message: error.message
		}, 500, corsHeaders);
	}
}

/**
 * Verify API key and check quota
 *
 * GET /api/verify-api-key?api_key=sk_live_xxx
 */
// P2 — true when the request comes from an allowed IP, or when no
// allowlist is configured (an empty / null allowed_ips means "any IP").
function _enforceAllowedIps(allowedIpsJson, sourceIp) {
	if (!allowedIpsJson) return { ok: true };
	let list;
	try { list = JSON.parse(allowedIpsJson); } catch (e) { return { ok: true }; }
	if (!Array.isArray(list) || list.length === 0) return { ok: true };
	if (sourceIp && list.indexOf(sourceIp) !== -1) return { ok: true };
	return { ok: false, allowed: list, source: sourceIp || null };
}

async function handleVerifyAPIKey(request, env, corsHeaders) {
	try {
		const url = new URL(request.url);
		const api_key = url.searchParams.get('api_key');
		const sourceIp = request.headers.get('CF-Connecting-IP') || '';

		if (!api_key) {
			return jsonResponse({
				error: 'Missing api_key parameter'
			}, 400, corsHeaders);
		}

		// Check KV cache
		const cached = await env.API_KEYS.get(api_key);
		if (cached) {
			const data = JSON.parse(cached);

			// P2 — IP allowlist enforcement (cached path).
			const ipCheck = _enforceAllowedIps(data.allowed_ips, sourceIp);
			if (!ipCheck.ok) {
				return jsonResponse({
					valid: false,
					error: 'Request IP not in allowlist',
					source_ip: sourceIp,
				}, 403, corsHeaders);
			}

			// Check quota
			if (data.used >= data.quota) {
				return jsonResponse({
					valid: false,
					error: 'Quota exceeded',
					quota_limit: data.quota,
					quota_used: data.used,
				}, 429, corsHeaders);
			}

			return jsonResponse({
				valid: true,
				tier: data.tier,
				quota_limit: data.quota,
				quota_used: data.used,
				quota_remaining: data.quota - data.used,
				source: 'cache',
			}, 200, corsHeaders);
		}

		// Check D1 database
		const result = await env.DB.prepare(`
			SELECT * FROM api_keys
			WHERE api_key = ? AND status = 'active'
		`).bind(api_key).first();

		if (!result) {
			return jsonResponse({
				valid: false,
				error: 'API key not found or inactive'
			}, 404, corsHeaders);
		}

		// P2 — IP allowlist enforcement (database path).
		const ipCheck = _enforceAllowedIps(result.allowed_ips, sourceIp);
		if (!ipCheck.ok) {
			return jsonResponse({
				valid: false,
				error: 'Request IP not in allowlist',
				source_ip: sourceIp,
			}, 403, corsHeaders);
		}

		// Check quota
		if (result.quota_used >= result.quota_limit) {
			return jsonResponse({
				valid: false,
				error: 'Quota exceeded',
				quota_limit: result.quota_limit,
				quota_used: result.quota_used,
			}, 429, corsHeaders);
		}

		// Cache for next time — include allowed_ips so the cached path can
		// enforce it without an extra D1 read.
		await env.API_KEYS.put(api_key, JSON.stringify({
			email: result.user_email,
			tier: result.tier,
			quota: result.quota_limit,
			used: result.quota_used,
			billing_cycle_end: result.billing_cycle_end,
			allowed_ips: result.allowed_ips,
		}), { expirationTtl: 86400 });  // 24 hours

		return jsonResponse({
			valid: true,
			tier: result.tier,
			quota_limit: result.quota_limit,
			quota_used: result.quota_used,
			quota_remaining: result.quota_limit - result.quota_used,
			source: 'database',
		}, 200, corsHeaders);

	} catch (error) {
		console.error('API key verification error:', error);
		return jsonResponse({
			error: 'Failed to verify API key',
			message: error.message
		}, 500, corsHeaders);
	}
}

// ═══════════════════════════════════════════════════════════════
// USAGE TRACKING
// ═══════════════════════════════════════════════════════════════

/**
 * Track feature usage for analytics
 *
 * POST /api/track-usage
 * Body: {
 *   session_id?: "sess_xxx",
 *   api_key?: "sk_live_xxx",
 *   feature: "phonetic" | "quantum" | "breach" | "api_call",
 *   endpoint?: "/api/some-endpoint"
 * }
 */
async function handleTrackUsage(request, env, corsHeaders) {
	try {
		const body = await request.json();
		const { session_id, api_key, feature, endpoint } = body;

		if (!feature) {
			return jsonResponse({
				error: 'Missing feature parameter'
			}, 400, corsHeaders);
		}

		const now = Date.now();
		const userIp = request.headers.get('CF-Connecting-IP');
		const userAgent = request.headers.get('User-Agent');

		// Insert into D1
		await env.DB.prepare(`
			INSERT INTO usage_tracking (
				timestamp, session_id, api_key, feature, endpoint,
				user_ip, user_agent, success
			) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
		`).bind(
			now,
			session_id || null,
			api_key || null,
			feature,
			endpoint || null,
			userIp,
			userAgent
		).run();

		// If using API key, increment quota usage
		if (api_key) {
			await env.DB.prepare(`
				UPDATE api_keys
				SET quota_used = quota_used + 1, last_used_at = ?
				WHERE api_key = ?
			`).bind(now, api_key).run();

			// Invalidate KV cache
			await env.API_KEYS.delete(api_key);
		}

		return jsonResponse({
			success: true,
			tracked: true
		}, 200, corsHeaders);

	} catch (error) {
		console.error('Track usage error:', error);
		return jsonResponse({
			error: 'Failed to track usage',
			message: error.message
		}, 500, corsHeaders);
	}
}

// ═══════════════════════════════════════════════════════════════
// AD CLICK TRACKING + /numbers ANALYTICS
// ═══════════════════════════════════════════════════════════════

// Operators allowed into the hidden /numbers analytics page.
const NUMBERS_ALLOWED_EMAILS = ['jack@flowguideai.com', 'jack@forgemcp.ai'];
const AD_BANNER_IDS = ['flowguideai', 'forgemcp'];

/**
 * Record an ad banner click. Privacy-respecting — no IP, no identifiers.
 */
async function handleTrackClick(request, env, corsHeaders) {
	try {
		const data = await request.json();
		if (!data || !AD_BANNER_IDS.includes(data.banner_id) || !data.placement) {
			return jsonResponse({ error: 'Invalid click data' }, 400, corsHeaders);
		}
		const timeOnSite = Number.isFinite(data.time_on_site) ? Math.trunc(data.time_on_site) : null;
		await env.DB.prepare(`
			INSERT INTO ad_clicks (banner_id, placement, timestamp, user_agent_type, traffic_source, time_on_site)
			VALUES (?, ?, ?, ?, ?, ?)
		`).bind(
			data.banner_id,
			String(data.placement).slice(0, 64),
			data.timestamp || new Date().toISOString(),
			String(data.user_agent_type || 'unknown').slice(0, 32),
			String(data.traffic_source || 'unknown').slice(0, 96),
			timeOnSite
		).run();
		return jsonResponse({ ok: true }, 200, corsHeaders);
	} catch (error) {
		console.error('Track click error:', error);
		return jsonResponse({ error: 'Failed to track click' }, 500, corsHeaders);
	}
}

/**
 * True only if apiKey is an active key owned by a /numbers operator.
 * Gates the hidden /numbers analytics page.
 */
async function isNumbersKey(env, apiKey) {
	if (!apiKey || typeof apiKey !== 'string') return false;
	try {
		const row = await env.DB.prepare(
			`SELECT status, user_email FROM api_keys WHERE api_key = ?`
		).bind(apiKey).first();
		return !!row && row.status === 'active'
			&& NUMBERS_ALLOWED_EMAILS.includes(String(row.user_email || '').trim().toLowerCase());
	} catch (e) {
		return false;
	}
}

/**
 * /numbers — verify the operator's API key, then return aggregated
 * ad-click analytics (no PII).
 */
async function handleAdAnalytics(request, env, corsHeaders) {
	try {
		const body = await request.json();
		const apiKey = body.apiKey || body.api_key;
		if (!(await isNumbersKey(env, apiKey))) {
			return jsonResponse({ error: 'Not authorized' }, 403, corsHeaders);
		}

		const totalsRows = await env.DB.prepare(
			`SELECT banner_id, COUNT(*) AS clicks FROM ad_clicks GROUP BY banner_id`
		).all();
		const totals = { flowguideai: 0, forgemcp: 0 };
		(totalsRows.results || []).forEach(r => { totals[r.banner_id] = r.clicks; });

		const placementRows = await env.DB.prepare(
			`SELECT placement, banner_id, COUNT(*) AS clicks FROM ad_clicks GROUP BY placement, banner_id`
		).all();
		const byPlacement = {};
		(placementRows.results || []).forEach(r => {
			byPlacement[r.placement] = byPlacement[r.placement] || {};
			byPlacement[r.placement][r.banner_id] = r.clicks;
		});

		const sourceRows = await env.DB.prepare(
			`SELECT banner_id, traffic_source, COUNT(*) AS clicks FROM ad_clicks GROUP BY banner_id, traffic_source`
		).all();
		const bySource = {
			flowguideai: { total: 0, sources: {} },
			forgemcp: { total: 0, sources: {} },
		};
		(sourceRows.results || []).forEach(r => {
			const b = bySource[r.banner_id];
			if (!b) return;
			b.sources[r.traffic_source || 'unknown'] = r.clicks;
			b.total += r.clicks;
		});

		const recentRows = await env.DB.prepare(
			`SELECT banner_id, placement, timestamp, user_agent_type, traffic_source, time_on_site
			 FROM ad_clicks ORDER BY id DESC LIMIT 50`
		).all();

		return jsonResponse({
			totals,
			byPlacement,
			bySource,
			recentClicks: recentRows.results || [],
			generatedAt: new Date().toISOString(),
		}, 200, corsHeaders);
	} catch (error) {
		console.error('Ad analytics error:', error);
		return jsonResponse({ error: 'Failed to load analytics' }, 500, corsHeaders);
	}
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create JSON response with CORS headers
 */
function jsonResponse(data, status, headers) {
	return new Response(JSON.stringify(data, null, 2), {
		status: status,
		headers: {
			...headers,
			'Content-Type': 'application/json',
		},
	});
}

/**
 * Generate cryptographically secure random ID
 */
function generateRandomId(length) {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	const randomValues = new Uint8Array(length);
	crypto.getRandomValues(randomValues);

	for (let i = 0; i < length; i++) {
		result += chars[randomValues[i] % chars.length];
	}

	return result;
}

/**
 * Log event to R2 audit trail
 */
async function logAudit(env, data) {
	try {
		const timestamp = Date.now();
		const date = new Date(timestamp);
		const dateStr = date.toISOString().split('T')[0];
		const filename = `${dateStr}/audit-${timestamp}-${generateRandomId(8)}.json`;

		await env.AUDIT_LOGS.put(filename, JSON.stringify({
			...data,
			timestamp: timestamp,
			timestamp_iso: date.toISOString(),
		}, null, 2));

	} catch (error) {
		console.error('Audit logging failed:', error);
		// Don't throw - audit failure shouldn't break API
	}
}

/**
 * Record payment transaction
 */
async function recordTransaction(env, transaction) {
	try {
		await env.DB.prepare(`
			INSERT INTO payment_transactions (
				transaction_id, created_at, payer_email, amount, currency,
				fee, net, payment_processor, processor_transaction_id,
				transaction_type, session_id, status
			) VALUES (?, ?, ?, ?, 'USD', ?, ?, ?, ?, ?, ?, ?)
		`).bind(
			transaction.transaction_id,
			Date.now(),
			transaction.payer_email || null,
			transaction.amount,
			transaction.fee,
			transaction.amount - transaction.fee,
			transaction.payment_processor,
			transaction.processor_transaction_id,
			transaction.transaction_type,
			transaction.session_id || null,
			transaction.status
		).run();

	} catch (error) {
		console.error('Transaction recording failed:', error);
		// Don't throw - this is for record-keeping only
	}
}

// ═══════════════════════════════════════════════════════════════
// DEVELOPER DASHBOARD HANDLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get usage statistics for developer's API key
 *
 * GET /api/dashboard/usage?api_key=sk_live_xxxxx
 *
 * Response:
 * {
 *   api_key: "sk_live_xxxxx",
 *   tier: 2,
 *   quota_used: 5420,
 *   quota_limit: 100000,
 *   quota_percentage: 5.42,
 *   billing_cycle_start: 1703980800000,
 *   billing_cycle_end: 1706659200000,
 *   days_remaining: 15,
 *   total_requests: 15420,
 *   abuse_score: 0,
 *   status: "active",
 *   recent_requests: [...],
 *   top_endpoints: [...],
 *   error_rate: 0.05
 * }
 */
async function handleDashboardUsage(request, env, corsHeaders) {
	try {
		const url = new URL(request.url);
		const apiKey = url.searchParams.get('api_key');

		if (!apiKey) {
			return jsonResponse({
				error: 'Missing api_key parameter'
			}, 400, corsHeaders);
		}

		// Get API key data
		const apiKeyData = await env.DB.prepare(`
			SELECT * FROM api_keys WHERE api_key = ?
		`).bind(apiKey).first();

		if (!apiKeyData) {
			return jsonResponse({
				error: 'Invalid API key'
			}, 401, corsHeaders);
		}

		// Calculate billing cycle remaining days
		const now = Date.now();
		const cycleEnd = apiKeyData.billing_cycle_end || (apiKeyData.billing_cycle_start + (30 * 24 * 60 * 60 * 1000));
		const daysRemaining = Math.ceil((cycleEnd - now) / (24 * 60 * 60 * 1000));

		// Get recent requests (last 100)
		const recentRequests = await env.DB.prepare(`
			SELECT
				timestamp,
				endpoint,
				http_status,
				response_time_ms,
				ip_address
			FROM api_request_logs
			WHERE api_key = ?
			ORDER BY timestamp DESC
			LIMIT 100
		`).bind(apiKey).all();

		// Get top endpoints
		const topEndpoints = await env.DB.prepare(`
			SELECT
				endpoint,
				COUNT(*) as count,
				AVG(response_time_ms) as avg_response_time
			FROM api_request_logs
			WHERE api_key = ?
			  AND timestamp > ?
			GROUP BY endpoint
			ORDER BY count DESC
			LIMIT 10
		`).bind(apiKey, now - (7 * 24 * 60 * 60 * 1000)).all();

		// Calculate error rate
		const errorCount = await env.DB.prepare(`
			SELECT COUNT(*) as count
			FROM api_request_logs
			WHERE api_key = ?
			  AND http_status >= 400
			  AND timestamp > ?
		`).bind(apiKey, now - (7 * 24 * 60 * 60 * 1000)).first();

		const totalCount = await env.DB.prepare(`
			SELECT COUNT(*) as count
			FROM api_request_logs
			WHERE api_key = ?
			  AND timestamp > ?
		`).bind(apiKey, now - (7 * 24 * 60 * 60 * 1000)).first();

		const errorRate = totalCount.count > 0 ? (errorCount.count / totalCount.count) : 0;

		// Get verified domains
		const domains = await env.DB.prepare(`
			SELECT domain, status, verified_at
			FROM domain_verifications
			WHERE api_key = ?
			ORDER BY verified_at DESC
		`).bind(apiKey).all();

		return jsonResponse({
			api_key: apiKey.substring(0, 20) + '...',
			tier: apiKeyData.tier,
			email: apiKeyData.user_email,
			email_verified: apiKeyData.email_verified === 1,
			quota_used: apiKeyData.quota_used,
			quota_limit: apiKeyData.quota_limit,
			quota_percentage: ((apiKeyData.quota_used / apiKeyData.quota_limit) * 100).toFixed(2),
			billing_cycle_start: apiKeyData.billing_cycle_start,
			billing_cycle_end: cycleEnd,
			days_remaining: daysRemaining,
			total_requests: apiKeyData.total_requests,
			abuse_score: apiKeyData.abuse_score,
			status: apiKeyData.status,
			verified_domains: domains.results || [],
			recent_requests: recentRequests.results || [],
			top_endpoints: topEndpoints.results || [],
			error_rate: (errorRate * 100).toFixed(2) + '%',
			rate_limit: apiKeyData.rate_limit_per_minute || (apiKeyData.tier === 1 ? 10 : apiKeyData.tier === 2 ? 100 : 1000)
		}, 200, corsHeaders);

	} catch (error) {
		console.error('Dashboard usage error:', error);
		return jsonResponse({
			error: 'Failed to fetch usage data',
			message: error.message
		}, 500, corsHeaders);
	}
}

/**
 * Add domain for verification
 *
 * POST /api/dashboard/add-domain
 * Body: { api_key: "sk_live_xxxxx", domain: "example.com", method: "dns" | "file" | "meta" }
 *
 * Response:
 * {
 *   success: true,
 *   domain: "example.com",
 *   verification_method: "dns",
 *   verification_token: "mypwdckr_abc123def456...",
 *   instructions: "Add the following TXT record to your DNS..."
 * }
 */
async function handleAddDomain(request, env, corsHeaders) {
	try {
		const body = await request.json();
		const { api_key, domain, method } = body;

		if (!api_key || !domain || !method) {
			return jsonResponse({
				error: 'Missing required fields: api_key, domain, method'
			}, 400, corsHeaders);
		}

		// Validate method
		if (!['dns', 'file', 'meta'].includes(method)) {
			return jsonResponse({
				error: 'Invalid method. Must be: dns, file, or meta'
			}, 400, corsHeaders);
		}

		// Validate domain format
		const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
		if (!domainRegex.test(domain)) {
			return jsonResponse({
				error: 'Invalid domain format'
			}, 400, corsHeaders);
		}

		// Verify API key exists
		const apiKeyData = await env.DB.prepare(`
			SELECT * FROM api_keys WHERE api_key = ?
		`).bind(api_key).first();

		if (!apiKeyData) {
			return jsonResponse({
				error: 'Invalid API key'
			}, 401, corsHeaders);
		}

		// Generate verification token
		const verificationToken = `mypwdckr_${generateRandomId(32)}`;

		// Check if domain already exists
		const existing = await env.DB.prepare(`
			SELECT * FROM domain_verifications
			WHERE api_key = ? AND domain = ?
		`).bind(api_key, domain).first();

		if (existing) {
			// Update existing
			await env.DB.prepare(`
				UPDATE domain_verifications
				SET verification_method = ?,
				    verification_token = ?,
				    status = 'pending',
				    created_at = ?
				WHERE api_key = ? AND domain = ?
			`).bind(method, verificationToken, Date.now(), api_key, domain).run();
		} else {
			// Insert new
			await env.DB.prepare(`
				INSERT INTO domain_verifications (
					api_key, domain, verification_method,
					verification_token, created_at, status
				) VALUES (?, ?, ?, ?, ?, 'pending')
			`).bind(api_key, domain, method, verificationToken, Date.now()).run();
		}

		// Generate instructions based on method
		let instructions = '';

		if (method === 'dns') {
			instructions = `Add the following TXT record to your DNS configuration for ${domain}:\n\n` +
				`Name: _mypasswordchecker\n` +
				`Type: TXT\n` +
				`Value: ${verificationToken}\n\n` +
				`After adding the record, wait a few minutes for DNS propagation, then click "Verify Domain" in your dashboard.`;
		} else if (method === 'file') {
			instructions = `Create a file at the following URL:\n\n` +
				`https://${domain}/.well-known/mypasswordchecker-verification.txt\n\n` +
				`File contents (plain text):\n${verificationToken}\n\n` +
				`After uploading the file, click "Verify Domain" in your dashboard.`;
		} else if (method === 'meta') {
			instructions = `Add the following meta tag to the <head> section of your homepage (https://${domain}/):\n\n` +
				`<meta name="mypasswordchecker-verification" content="${verificationToken}">\n\n` +
				`After adding the meta tag, click "Verify Domain" in your dashboard.`;
		}

		return jsonResponse({
			success: true,
			domain: domain,
			verification_method: method,
			verification_token: verificationToken,
			instructions: instructions
		}, 200, corsHeaders);

	} catch (error) {
		console.error('Add domain error:', error);
		return jsonResponse({
			error: 'Failed to add domain',
			message: error.message
		}, 500, corsHeaders);
	}
}

/**
 * Verify domain ownership
 *
 * POST /api/dashboard/verify-domain
 * Body: { api_key: "sk_live_xxxxx", domain: "example.com" }
 *
 * Checks for verification token based on method:
 * - DNS: Check TXT record at _mypasswordchecker.example.com
 * - File: Check https://example.com/.well-known/mypasswordchecker-verification.txt
 * - Meta: Check meta tag on homepage
 */
async function handleVerifyDomain(request, env, corsHeaders) {
	try {
		const body = await request.json();
		const { api_key, domain } = body;

		if (!api_key || !domain) {
			return jsonResponse({
				error: 'Missing required fields: api_key, domain'
			}, 400, corsHeaders);
		}

		// Get domain verification record
		const record = await env.DB.prepare(`
			SELECT * FROM domain_verifications
			WHERE api_key = ? AND domain = ?
		`).bind(api_key, domain).first();

		if (!record) {
			return jsonResponse({
				error: 'Domain not found. Add domain first.'
			}, 404, corsHeaders);
		}

		let verified = false;
		let failureReason = '';

		try {
			if (record.verification_method === 'dns') {
				// Check DNS TXT record
				const dnsResponse = await fetch(`https://cloudflare-dns.com/dns-query?name=_mypasswordchecker.${domain}&type=TXT`, {
					headers: { 'Accept': 'application/dns-json' }
				});

				const dnsData = await dnsResponse.json();

				if (dnsData.Answer) {
					verified = dnsData.Answer.some(answer =>
						answer.data && answer.data.includes(record.verification_token)
					);
				}

				if (!verified) {
					failureReason = 'TXT record not found or does not match token';
				}

			} else if (record.verification_method === 'file') {
				// Check file at /.well-known/
				const fileResponse = await fetch(`https://${domain}/.well-known/mypasswordchecker-verification.txt`);

				if (fileResponse.ok) {
					const fileContent = await fileResponse.text();
					verified = fileContent.trim() === record.verification_token;

					if (!verified) {
						failureReason = 'File found but token does not match';
					}
				} else {
					failureReason = `File not found (HTTP ${fileResponse.status})`;
				}

			} else if (record.verification_method === 'meta') {
				// Check meta tag on homepage
				const pageResponse = await fetch(`https://${domain}/`);

				if (pageResponse.ok) {
					const html = await pageResponse.text();
					const metaRegex = /<meta\s+name=["']mypasswordchecker-verification["']\s+content=["']([^"']+)["']/i;
					const match = html.match(metaRegex);

					if (match && match[1] === record.verification_token) {
						verified = true;
					} else {
						failureReason = 'Meta tag not found or does not match token';
					}
				} else {
					failureReason = `Homepage not accessible (HTTP ${pageResponse.status})`;
				}
			}

		} catch (error) {
			failureReason = `Verification check failed: ${error.message}`;
		}

		const now = Date.now();

		if (verified) {
			// Update domain as verified
			await env.DB.prepare(`
				UPDATE domain_verifications
				SET status = 'verified',
				    verified_at = ?,
				    last_check_at = ?
				WHERE api_key = ? AND domain = ?
			`).bind(now, now, api_key, domain).run();

			// Add domain to API key's allowed_domains
			const apiKeyData = await env.DB.prepare(`
				SELECT allowed_domains FROM api_keys WHERE api_key = ?
			`).bind(api_key).first();

			let allowedDomains = [];
			if (apiKeyData.allowed_domains) {
				allowedDomains = JSON.parse(apiKeyData.allowed_domains);
			}

			if (!allowedDomains.includes(domain)) {
				allowedDomains.push(domain);

				await env.DB.prepare(`
					UPDATE api_keys
					SET allowed_domains = ?
					WHERE api_key = ?
				`).bind(JSON.stringify(allowedDomains), api_key).run();

				// Invalidate cache
				await env.API_KEYS.delete(api_key);
			}

			return jsonResponse({
				success: true,
				verified: true,
				domain: domain,
				verified_at: now,
				message: `Domain ${domain} has been verified and added to your allowed domains.`
			}, 200, corsHeaders);

		} else {
			// Update as failed
			await env.DB.prepare(`
				UPDATE domain_verifications
				SET status = 'failed',
				    failure_reason = ?,
				    last_check_at = ?
				WHERE api_key = ? AND domain = ?
			`).bind(failureReason, now, api_key, domain).run();

			return jsonResponse({
				success: false,
				verified: false,
				domain: domain,
				reason: failureReason,
				message: 'Domain verification failed. Please check your setup and try again.'
			}, 200, corsHeaders);
		}

	} catch (error) {
		console.error('Verify domain error:', error);
		return jsonResponse({
			error: 'Failed to verify domain',
			message: error.message
		}, 500, corsHeaders);
	}
}

/**
 * Get all domains for an API key
 *
 * GET /api/dashboard/get-domains?api_key=sk_live_xxxxx
 */
async function handleGetDomains(request, env, corsHeaders) {
	try {
		const url = new URL(request.url);
		const apiKey = url.searchParams.get('api_key');

		if (!apiKey) {
			return jsonResponse({
				error: 'Missing api_key parameter'
			}, 400, corsHeaders);
		}

		const domains = await env.DB.prepare(`
			SELECT
				domain,
				verification_method,
				verification_token,
				status,
				created_at,
				verified_at,
				last_check_at,
				failure_reason
			FROM domain_verifications
			WHERE api_key = ?
			ORDER BY verified_at DESC, created_at DESC
		`).bind(apiKey).all();

		return jsonResponse({
			domains: domains.results || []
		}, 200, corsHeaders);

	} catch (error) {
		console.error('Get domains error:', error);
		return jsonResponse({
			error: 'Failed to fetch domains',
			message: error.message
		}, 500, corsHeaders);
	}
}

// ═══════════════════════════════════════════════════════════════
// P2 — IP allowlist verification
// Mirrors the domain pattern: add (issue token) → verify (the
// request HAS to come from the claimed IP) → list. Stored in
// ip_verifications and, on verify, appended to api_keys.allowed_ips
// (JSON). Enforced on /api/verify-api-key when allowed_ips is set.
// ═══════════════════════════════════════════════════════════════

const _IPV4_RE = /^(25[0-5]|2[0-4]\d|[01]?\d?\d)(\.(25[0-5]|2[0-4]\d|[01]?\d?\d)){3}$/;
const _IPV6_RE = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|::([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})$/;

function isValidIp(ip) {
	if (typeof ip !== 'string') return false;
	const v = ip.trim();
	return _IPV4_RE.test(v) || _IPV6_RE.test(v);
}

/**
 * Resolve the api_key for the current request (header OR query OR body).
 */
function resolveApiKey(request, url, bodyApiKey) {
	return request.headers.get('X-API-Key')
		|| (url && url.searchParams.get('api_key'))
		|| bodyApiKey
		|| null;
}

/**
 * POST /api/dashboard/add-ip
 * Body: { api_key, ip }
 * Returns: { ip, verification_token, instructions, verify_url }
 *
 * Issues a one-shot token for the claimed IP. Token is bound to that
 * specific (api_key, ip) — proof of ownership is delivered later by
 * `verify-ip` from the IP being claimed (we check CF-Connecting-IP).
 */
async function handleAddIp(request, env, corsHeaders) {
	try {
		const body = await request.json();
		const url = new URL(request.url);
		const apiKey = resolveApiKey(request, url, body.api_key);
		const ip = String(body.ip || '').trim();

		if (!apiKey) {
			return jsonResponse({ error: 'Missing api_key' }, 400, corsHeaders);
		}
		if (!isValidIp(ip)) {
			return jsonResponse({ error: 'Invalid IP address (IPv4 or IPv6 only)' }, 400, corsHeaders);
		}

		const keyRow = await env.DB.prepare(
			`SELECT api_key FROM api_keys WHERE api_key = ? AND status = 'active'`
		).bind(apiKey).first();
		if (!keyRow) {
			return jsonResponse({ error: 'API key not found or inactive' }, 401, corsHeaders);
		}

		const existing = await env.DB.prepare(
			`SELECT status FROM ip_verifications WHERE api_key = ? AND ip = ?`
		).bind(apiKey, ip).first();
		if (existing && existing.status === 'verified') {
			return jsonResponse({
				error: 'IP already verified',
				ip: ip
			}, 409, corsHeaders);
		}

		const token = `mypwdckr_${generateRandomId(32)}`;
		const now = Date.now();

		// If there's a stale pending row for this (key, ip), replace its token.
		if (existing) {
			await env.DB.prepare(
				`UPDATE ip_verifications SET verification_token = ?, created_at = ? WHERE api_key = ? AND ip = ?`
			).bind(token, now, apiKey, ip).run();
		} else {
			await env.DB.prepare(
				`INSERT INTO ip_verifications (api_key, ip, verification_token, status, created_at)
				 VALUES (?, ?, ?, 'pending', ?)`
			).bind(apiKey, ip, token, now).run();
		}

		await logAudit(env, {
			event: 'ip_verification_requested',
			api_key: apiKey,
			ip: ip,
		});

		return jsonResponse({
			success: true,
			ip: ip,
			verification_token: token,
			instructions:
				'From the server at ' + ip + ', issue this request. ' +
				'It must originate from the claimed IP — that is how we verify ownership.',
			curl_example:
				"curl -X POST https://mypasswordchecker.com/api/dashboard/verify-ip " +
				"-H 'Content-Type: application/json' " +
				"-d '" + JSON.stringify({ ip: ip, token: token }) + "'",
			verify_url: '/api/dashboard/verify-ip'
		}, 200, corsHeaders);
	} catch (error) {
		console.error('Add IP error:', error);
		return jsonResponse({
			error: 'Failed to add IP',
			message: error.message
		}, 500, corsHeaders);
	}
}

/**
 * POST /api/dashboard/verify-ip
 * Body: { ip, token }
 * Header: CF-Connecting-IP (set by Cloudflare for every request)
 *
 * The only sound proof of IP ownership is the request originating from
 * that IP. We compare CF-Connecting-IP to the claimed ip + verify the
 * token, then mark verified and append to api_keys.allowed_ips.
 */
async function handleVerifyIp(request, env, corsHeaders) {
	try {
		const body = await request.json();
		const claimedIp = String(body.ip || '').trim();
		const token = String(body.token || '').trim();
		const sourceIp = request.headers.get('CF-Connecting-IP') || '';

		if (!claimedIp || !token) {
			return jsonResponse({ error: 'Missing ip or token' }, 400, corsHeaders);
		}
		if (sourceIp !== claimedIp) {
			return jsonResponse({
				error: 'IP ownership not proven',
				message: 'This request must originate from ' + claimedIp + '. Detected source: ' + sourceIp + '.'
			}, 403, corsHeaders);
		}

		const row = await env.DB.prepare(
			`SELECT id, api_key FROM ip_verifications
			 WHERE ip = ? AND verification_token = ? AND status = 'pending'`
		).bind(claimedIp, token).first();
		if (!row) {
			return jsonResponse({
				error: 'Invalid or expired token'
			}, 403, corsHeaders);
		}

		const now = Date.now();
		await env.DB.prepare(
			`UPDATE ip_verifications SET status = 'verified', verified_at = ? WHERE id = ?`
		).bind(now, row.id).run();

		// Append to api_keys.allowed_ips (JSON array, dedup-on-add).
		const keyRow = await env.DB.prepare(
			`SELECT allowed_ips FROM api_keys WHERE api_key = ?`
		).bind(row.api_key).first();
		const list = keyRow && keyRow.allowed_ips ? JSON.parse(keyRow.allowed_ips) : [];
		if (list.indexOf(claimedIp) === -1) list.push(claimedIp);
		await env.DB.prepare(
			`UPDATE api_keys SET allowed_ips = ? WHERE api_key = ?`
		).bind(JSON.stringify(list), row.api_key).run();

		// Drop the cache so the next verify-api-key picks the new allowlist.
		await env.API_KEYS.delete(row.api_key);

		await logAudit(env, {
			event: 'ip_verified',
			api_key: row.api_key,
			ip: claimedIp,
		});

		return jsonResponse({
			success: true,
			verified: true,
			ip: claimedIp
		}, 200, corsHeaders);
	} catch (error) {
		console.error('Verify IP error:', error);
		return jsonResponse({
			error: 'Failed to verify IP',
			message: error.message
		}, 500, corsHeaders);
	}
}

/**
 * GET /api/dashboard/get-ips?api_key=…
 * Returns: { ips: [{ ip, status, verified_at }] }
 */
async function handleGetIps(request, env, corsHeaders) {
	try {
		const url = new URL(request.url);
		const apiKey = resolveApiKey(request, url, null);
		if (!apiKey) {
			return jsonResponse({ error: 'Missing api_key' }, 400, corsHeaders);
		}
		const keyRow = await env.DB.prepare(
			`SELECT api_key FROM api_keys WHERE api_key = ? AND status = 'active'`
		).bind(apiKey).first();
		if (!keyRow) {
			return jsonResponse({ error: 'API key not found or inactive' }, 401, corsHeaders);
		}
		const rows = await env.DB.prepare(
			`SELECT ip, status, verified_at, created_at
			 FROM ip_verifications WHERE api_key = ? ORDER BY created_at DESC`
		).bind(apiKey).all();
		return jsonResponse({
			ips: rows.results || []
		}, 200, corsHeaders);
	} catch (error) {
		console.error('Get IPs error:', error);
		return jsonResponse({
			error: 'Failed to fetch IPs',
			message: error.message
		}, 500, corsHeaders);
	}
}

/**
 * Rotate API key (generate new key, invalidate old)
 *
 * POST /api/dashboard/rotate-key
 * Body: { api_key: "sk_live_xxxxx" }
 *
 * Response:
 * {
 *   success: true,
 *   old_key: "sk_live_old...",
 *   new_key: "sk_live_new...",
 *   rotated_at: 1703980800000
 * }
 */
async function handleRotateKey(request, env, corsHeaders) {
	try {
		const body = await request.json();
		const { api_key } = body;

		if (!api_key) {
			return jsonResponse({
				error: 'Missing api_key field'
			}, 400, corsHeaders);
		}

		// Get existing API key data
		const oldKeyData = await env.DB.prepare(`
			SELECT * FROM api_keys WHERE api_key = ?
		`).bind(api_key).first();

		if (!oldKeyData) {
			return jsonResponse({
				error: 'Invalid API key'
			}, 401, corsHeaders);
		}

		// Generate new API key
		const newApiKey = `sk_live_${generateRandomId(32)}`;
		const newApiSecret = generateRandomId(32);
		const now = Date.now();

		// Create new key with same settings
		await env.DB.prepare(`
			INSERT INTO api_keys (
				api_key, user_email, user_name, tier, created_at,
				quota_limit, quota_used, billing_cycle_start, billing_cycle_end,
				payment_processor, stripe_subscription_id, stripe_payment_intent_id, stripe_customer_id,
				email_verified, allowed_domains, allowed_ips, require_signature, api_secret,
				total_requests, abuse_score, rate_limit_per_minute,
				status, metadata
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).bind(
			newApiKey,
			oldKeyData.user_email,
			oldKeyData.user_name,
			oldKeyData.tier,
			now,
			oldKeyData.quota_limit,
			oldKeyData.quota_used,
			oldKeyData.billing_cycle_start,
			oldKeyData.billing_cycle_end,
			oldKeyData.payment_processor,
			oldKeyData.stripe_subscription_id,
			oldKeyData.stripe_payment_intent_id,
			oldKeyData.stripe_customer_id,
			oldKeyData.email_verified,
			oldKeyData.allowed_domains,
			oldKeyData.allowed_ips,
			oldKeyData.require_signature,
			newApiSecret,
			0, // Reset total requests
			0, // Reset abuse score
			oldKeyData.rate_limit_per_minute,
			'active',
			JSON.stringify({ rotated_from: api_key, rotated_at: now })
		).run();

		// Mark old key as canceled
		await env.DB.prepare(`
			UPDATE api_keys
			SET status = 'canceled',
			    canceled_at = ?
			WHERE api_key = ?
		`).bind(now, api_key).run();

		// Invalidate old key from cache
		await env.API_KEYS.delete(api_key);

		// Copy domain verifications to new key
		await env.DB.prepare(`
			UPDATE domain_verifications
			SET api_key = ?
			WHERE api_key = ?
		`).bind(newApiKey, api_key).run();

		// Log audit event
		await logAudit(env, {
			event: 'api_key_rotated',
			old_key: api_key.substring(0, 20) + '...',
			new_key: newApiKey.substring(0, 20) + '...',
			user_email: oldKeyData.user_email
		});

		return jsonResponse({
			success: true,
			old_key: api_key.substring(0, 20) + '...',
			new_key: newApiKey,
			new_secret: newApiSecret,
			rotated_at: now,
			message: 'API key rotated successfully. Update your applications with the new key within 24 hours. The old key will stop working after that.'
		}, 200, corsHeaders);

	} catch (error) {
		console.error('Rotate key error:', error);
		return jsonResponse({
			error: 'Failed to rotate API key',
			message: error.message
		}, 500, corsHeaders);
	}
}

/**
 * Send email verification code
 *
 * POST /api/dashboard/send-verification
 * Body: { api_key: "sk_live_xxxxx" }
 */
async function handleSendVerification(request, env, corsHeaders) {
	try {
		const body = await request.json();
		const { api_key } = body;

		if (!api_key) {
			return jsonResponse({
				error: 'Missing api_key field'
			}, 400, corsHeaders);
		}

		// Get API key data
		const apiKeyData = await env.DB.prepare(`
			SELECT * FROM api_keys WHERE api_key = ?
		`).bind(api_key).first();

		if (!apiKeyData) {
			return jsonResponse({
				error: 'Invalid API key'
			}, 401, corsHeaders);
		}

		if (apiKeyData.email_verified === 1) {
			return jsonResponse({
				success: false,
				message: 'Email already verified'
			}, 200, corsHeaders);
		}

		// Generate 6-digit verification code
		const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
		const verificationId = `verify_${generateRandomId(16)}`;
		const now = Date.now();
		const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours

		// Store verification
		await env.DB.prepare(`
			INSERT INTO email_verifications (
				verification_id, api_key, user_email,
				verification_code, created_at, expires_at,
				ip_address, status
			) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
		`).bind(
			verificationId,
			api_key,
			apiKeyData.user_email,
			verificationCode,
			now,
			expiresAt,
			request.headers.get('CF-Connecting-IP')
		).run();

		// TODO: Send email via email service (SendGrid, Mailgun, etc.)
		// For now, return code in response (development only)
		console.log(`Verification code for ${apiKeyData.user_email}: ${verificationCode}`);

		return jsonResponse({
			success: true,
			message: `Verification code sent to ${apiKeyData.user_email}`,
			// REMOVE IN PRODUCTION:
			verification_code: verificationCode,
			expires_at: expiresAt
		}, 200, corsHeaders);

	} catch (error) {
		console.error('Send verification error:', error);
		return jsonResponse({
			error: 'Failed to send verification',
			message: error.message
		}, 500, corsHeaders);
	}
}

/**
 * Verify email with code
 *
 * POST /api/dashboard/verify-email
 * Body: { api_key: "sk_live_xxxxx", code: "123456" }
 */
async function handleVerifyEmail(request, env, corsHeaders) {
	try {
		const body = await request.json();
		const { api_key, code } = body;

		if (!api_key || !code) {
			return jsonResponse({
				error: 'Missing required fields: api_key, code'
			}, 400, corsHeaders);
		}

		// Get most recent pending verification
		const verification = await env.DB.prepare(`
			SELECT * FROM email_verifications
			WHERE api_key = ?
			  AND status = 'pending'
			  AND expires_at > ?
			ORDER BY created_at DESC
			LIMIT 1
		`).bind(api_key, Date.now()).first();

		if (!verification) {
			return jsonResponse({
				error: 'No pending verification found or code expired'
			}, 404, corsHeaders);
		}

		// Check attempts
		if (verification.attempts >= 5) {
			await env.DB.prepare(`
				UPDATE email_verifications
				SET status = 'failed'
				WHERE verification_id = ?
			`).bind(verification.verification_id).run();

			return jsonResponse({
				error: 'Too many failed attempts. Request a new code.'
			}, 429, corsHeaders);
		}

		// Verify code
		if (verification.verification_code !== code) {
			// Increment attempts
			await env.DB.prepare(`
				UPDATE email_verifications
				SET attempts = attempts + 1
				WHERE verification_id = ?
			`).bind(verification.verification_id).run();

			return jsonResponse({
				error: 'Invalid verification code',
				attempts_remaining: 5 - (verification.attempts + 1)
			}, 400, corsHeaders);
		}

		// Code matches - verify email
		const now = Date.now();

		await env.DB.prepare(`
			UPDATE email_verifications
			SET status = 'verified', verified_at = ?
			WHERE verification_id = ?
		`).bind(now, verification.verification_id).run();

		await env.DB.prepare(`
			UPDATE api_keys
			SET email_verified = 1, status = 'active'
			WHERE api_key = ?
		`).bind(api_key).run();

		// Invalidate cache
		await env.API_KEYS.delete(api_key);

		return jsonResponse({
			success: true,
			verified: true,
			message: 'Email verified successfully. Your API key is now active.'
		}, 200, corsHeaders);

	} catch (error) {
		console.error('Verify email error:', error);
		return jsonResponse({
			error: 'Failed to verify email',
			message: error.message
		}, 500, corsHeaders);
	}
}

/**
 * Verify email via link click (GET request - returns HTML)
 *
 * GET /api/verify-email?code=xxxxx
 */
async function handleEmailVerificationLink(request, env) {
	const url = new URL(request.url);
	const code = url.searchParams.get('code');

	if (!code) {
		return new Response(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>Verification Error</title>
				<style>
					body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
					.error { background: #ffebee; border-left: 4px solid #c62828; padding: 20px; }
				</style>
			</head>
			<body>
				<div class="error">
					<h2>❌ Verification Error</h2>
					<p>Invalid verification link. Please check your email and try again.</p>
				</div>
			</body>
			</html>
		`, {
			status: 400,
			headers: { 'Content-Type': 'text/html' },
		});
	}

	// Look up verification code
	const verification = await env.DB.prepare(`
		SELECT * FROM email_verifications WHERE verification_code = ?
	`).bind(code).first();

	if (!verification) {
		return new Response(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>Verification Error</title>
				<style>
					body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
					.error { background: #ffebee; border-left: 4px solid #c62828; padding: 20px; }
				</style>
			</head>
			<body>
				<div class="error">
					<h2>❌ Invalid Verification Code</h2>
					<p>This verification link is invalid or has expired.</p>
				</div>
			</body>
			</html>
		`, {
			status: 404,
			headers: { 'Content-Type': 'text/html' },
		});
	}

	// Check if expired
	if (verification.expires_at < Date.now()) {
		return new Response(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>Verification Expired</title>
				<style>
					body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
					.error { background: #fff3cd; border-left: 4px solid #ffcc00; padding: 20px; }
				</style>
			</head>
			<body>
				<div class="error">
					<h2>⏰ Verification Link Expired</h2>
					<p>This verification link has expired. Please contact support to request a new one.</p>
				</div>
			</body>
			</html>
		`, {
			status: 410,
			headers: { 'Content-Type': 'text/html' },
		});
	}

	// Mark as verified
	await env.DB.prepare(`
		UPDATE email_verifications SET verified_at = ? WHERE verification_code = ?
	`).bind(Date.now(), code).run();

	await env.DB.prepare(`
		UPDATE api_keys SET email_verified = 1, status = 'active' WHERE api_key = ?
	`).bind(verification.api_key).run();

	// Clear cache to force refresh
	await env.API_KEYS.delete(verification.api_key);

	await logAudit(env, {
		event: 'email_verified',
		email: verification.user_email,
		api_key: verification.api_key,
	});

	return new Response(`
		<!DOCTYPE html>
		<html>
		<head>
			<title>Email Verified!</title>
			<style>
				body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
				.success { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 30px; border-radius: 5px; }
				.code { background: #f5f5f5; padding: 15px; font-family: monospace; margin: 20px 0; border-radius: 5px; word-break: break-all; }
				a { color: #0066cc; text-decoration: none; }
			</style>
		</head>
		<body>
			<div class="success">
				<h1>✅ Email Verified Successfully!</h1>
				<p>Your API key is now active and ready to use.</p>

				<div class="code">${verification.api_key}</div>

				<p><strong>Next Steps:</strong></p>
				<ul style="text-align: left;">
					<li>Add your domain in the <a href="https://mypasswordchecker.com/dashboard">Developer Dashboard</a></li>
					<li>Verify domain ownership (DNS/File/Meta)</li>
					<li>Start making API requests</li>
				</ul>

				<p><a href="https://mypasswordchecker.com/dashboard?api_key=${verification.api_key}">Go to Dashboard →</a></p>
			</div>
		</body>
		</html>
	`, {
		status: 200,
		headers: { 'Content-Type': 'text/html' },
	});
}

/**
 * CREATE FREE API KEY
 * POST /api/create-free-api-key
 *
 * Body: {
 *   email: "user@example.com",
 *   domain: "example.com"
 * }
 *
 * Restrictions:
 * - Domain verification required
 * - One free API key per domain (prevents abuse)
 * - 50 requests per month
 * - No quantum/phonetic/breach features
 */
async function handleCreateFreeAPIKey(request, env, corsHeaders) {
	const body = await request.json();
	const { email, domain } = body;

	if (!email || !domain) {
		return jsonResponse({
			error: 'Missing required fields: email, domain'
		}, 400, corsHeaders);
	}

	// Validate email format
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return jsonResponse({
			error: 'Invalid email address'
		}, 400, corsHeaders);
	}

	// Validate domain format
	const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
	if (!domainRegex.test(domain)) {
		return jsonResponse({
			error: 'Invalid domain format'
		}, 400, corsHeaders);
	}

	// Check if domain already has a free API key
	const existingKey = await env.DB.prepare(`
		SELECT api_key FROM api_keys
		WHERE tier = 0
		AND allowed_domains LIKE ?
	`).bind(`%${domain}%`).first();

	if (existingKey) {
		return jsonResponse({
			error: 'This domain already has a free API key',
			message: 'Each domain can only have one free API key. Upgrade to a paid tier for additional keys.',
			upgrade_url: 'https://mypasswordchecker.com/pricing',
			existing_key: existingKey.api_key.substring(0, 20) + '...'
		}, 409, corsHeaders);
	}

	// Check if email already has a free API key
	const existingEmailKey = await env.DB.prepare(`
		SELECT api_key, allowed_domains FROM api_keys
		WHERE tier = 0
		AND user_email = ?
	`).bind(email).first();

	if (existingEmailKey) {
		const existingDomains = existingEmailKey.allowed_domains
			? JSON.parse(existingEmailKey.allowed_domains)
			: [];

		return jsonResponse({
			error: 'Email already has a free API key',
			message: 'You already have a free API key for domain(s): ' + existingDomains.join(', '),
			upgrade_url: 'https://mypasswordchecker.com/pricing',
			existing_key: existingEmailKey.api_key.substring(0, 20) + '...'
		}, 409, corsHeaders);
	}

	// Generate free API key
	const apiKey = `sk_free_${generateRandomId(32)}`;
	const verificationCode = generateRandomId(6);
	const now = Date.now();

	// Insert into database (tier 0 = free)
	await env.DB.prepare(`
		INSERT INTO api_keys (
			api_key, user_email, tier, created_at,
			quota_limit, quota_used,
			quantum_limit, quantum_used,
			phonetic_limit, phonetic_used,
			breach_limit, breach_used,
			billing_cycle_start,
			payment_processor, status,
			allowed_domains
		) VALUES (?, ?, 0, ?, ?, 0, 0, 0, 0, 0, 0, 0, ?, 'free', 'pending', ?)
	`).bind(
		apiKey,
		email,
		now,
		50,  // 50 requests per month
		now,
		JSON.stringify([domain])
	).run();

	// Create email verification record
	await env.DB.prepare(`
		INSERT INTO email_verifications (
			verification_code, user_email, api_key, created_at, expires_at
		) VALUES (?, ?, ?, ?, ?)
	`).bind(
		verificationCode,
		email,
		apiKey,
		now,
		now + (24 * 60 * 60 * 1000) // 24 hours
	).run();

	// Create domain verification record
	const domainToken = generateRandomId(32);
	await env.DB.prepare(`
		INSERT INTO domain_verifications (
			api_key, domain, verification_token, created_at, method
		) VALUES (?, ?, ?, ?, 'dns')
	`).bind(apiKey, domain, domainToken, now).run();

	// Send verification email
	await sendVerificationEmail(env, email, apiKey, verificationCode);

	// Log to audit
	await logAudit(env, {
		event: 'free_api_key_created',
		api_key: apiKey,
		email: email,
		domain: domain,
	});

	return jsonResponse({
		success: true,
		api_key: apiKey,
		tier: 'free',
		quota: {
			limit: 50,
			period: 'month'
		},
		domain: domain,
		next_steps: [
			'Check your email for verification link',
			'Verify your domain ownership',
			'API key will activate after both verifications'
		],
		domain_verification: {
			domain: domain,
			token: domainToken,
			methods: {
				dns: `Add TXT record: mypasswordchecker-verify=${domainToken}`,
				file: `Upload file to: https://${domain}/.well-known/mypasswordchecker-verify.txt`,
				meta: `Add meta tag: <meta name="mypasswordchecker-verify" content="${domainToken}">`
			},
			verify_url: `/api/dashboard/verify-domain?api_key=${apiKey}&domain=${domain}`
		},
		upgrade_url: 'https://mypasswordchecker.com/pricing'
	}, 200, corsHeaders);
}

// ═══════════════════════════════════════════════════════════════
// P1: /api/auth/register — thin frontend wrapper for free signup.
// Same internal create-a-free-key flow as /api/create-free-api-key, but
// accepts {email, name} (no domain) so the dashboard's register form
// doesn't have to collect a domain up front. The user adds + verifies a
// domain afterwards via /api/dashboard/{add,verify}-domain.
// Returns: { success, api_key, tier:0, status:'pending', next_steps }
// ═══════════════════════════════════════════════════════════════
async function handleAuthRegister(request, env, corsHeaders) {
	try {
		const body = await request.json();
		const email = String(body.email || '').trim().toLowerCase();
		const name = body.name ? String(body.name).trim() : null;

		if (!email) {
			return jsonResponse({ error: 'Missing required field: email' }, 400, corsHeaders);
		}
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return jsonResponse({ error: 'Invalid email address' }, 400, corsHeaders);
		}

		// One free key per email.
		const existing = await env.DB.prepare(
			`SELECT api_key FROM api_keys WHERE tier = 0 AND user_email = ?`
		).bind(email).first();
		if (existing) {
			return jsonResponse({
				error: 'Email already has a free API key',
				message: 'Sign in with the existing key, or upgrade to a paid tier.',
				upgrade_url: 'https://mypasswordchecker.com/pricing'
			}, 409, corsHeaders);
		}

		const apiKey = `sk_free_${generateRandomId(32)}`;
		const verificationCode = generateRandomId(6);
		const now = Date.now();

		await env.DB.prepare(`
			INSERT INTO api_keys (
				api_key, user_email, user_name, tier, created_at,
				quota_limit, quota_used,
				quantum_limit, quantum_used,
				phonetic_limit, phonetic_used,
				breach_limit, breach_used,
				billing_cycle_start,
				payment_processor, status
			) VALUES (?, ?, ?, 0, ?, 50, 0, 0, 0, 0, 0, 0, 0, ?, 'free', 'active')
		`).bind(apiKey, email, name, now, now).run();
		// Free tier is active immediately so the dashboard can sign in right
		// after register; P6 re-introduces an email_verified gate once the
		// EMAIL binding is configured. email_verified stays 0 in the meantime.

		await env.DB.prepare(`
			INSERT INTO email_verifications (
				verification_code, user_email, api_key, created_at, expires_at
			) VALUES (?, ?, ?, ?, ?)
		`).bind(
			verificationCode, email, apiKey, now,
			now + (24 * 60 * 60 * 1000)
		).run();

		// Sends the verification email. With the EMAIL binding absent today
		// this silently no-ops (same as /api/create-free-api-key); P6 wires it.
		await sendVerificationEmail(env, email, apiKey, verificationCode);

		await logAudit(env, {
			event: 'free_api_key_created_via_auth_register',
			api_key: apiKey,
			email: email,
		});

		return jsonResponse({
			success: true,
			api_key: apiKey,
			tier: 0,
			status: 'active',
			next_steps: [
				'Save your API key — you will only see it this once.',
				'Verify your email by clicking the link we sent you (when email is enabled).',
				'Add and verify a domain in the dashboard before paid features activate.'
			]
		}, 201, corsHeaders);
	} catch (error) {
		console.error('Auth register error:', error);
		return jsonResponse({
			error: 'Registration failed',
			message: error.message
		}, 500, corsHeaders);
	}
}

// ═══════════════════════════════════════════════════════════════
// ADMIN DASHBOARD HANDLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Helper: Verify admin token
 */
function verifyAdminToken(request, env) {
	const authHeader = request.headers.get('Authorization');

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return {
			valid: false,
			error: 'Missing Authorization header. Use: Authorization: Bearer <ADMIN_TOKEN>'
		};
	}

	const token = authHeader.substring(7); // Remove 'Bearer '

	if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
		return {
			valid: false,
			error: 'Invalid admin token'
		};
	}

	return { valid: true };
}

// ═══════════════════════════════════════════════════════════════
// P4 — GitHub OAuth
// State CSRF token in SESSION_CACHE (10 min TTL). On callback we
// exchange the code, find the user's PRIMARY VERIFIED email, then
// look up or create a free-tier api_keys row keyed on that email
// (GitHub email is the account identity). Final redirect is
// /dashboard.html#token=<api_key>; the dashboard reads the hash,
// stores in localStorage, strips it.
// ═══════════════════════════════════════════════════════════════

async function handleGitHubAuthStart(request, env, corsHeaders) {
	try {
		if (!env.GITHUB_CLIENT_ID) {
			return jsonResponse({ error: 'GitHub OAuth not configured. Set GITHUB_CLIENT_ID in wrangler.toml.' }, 500, corsHeaders);
		}
		const state = generateRandomId(32);
		await env.SESSION_CACHE.put('github_state:' + state, '1', { expirationTtl: 600 });
		const params = new URLSearchParams({
			client_id: env.GITHUB_CLIENT_ID,
			redirect_uri: 'https://mypasswordchecker.com/api/auth/github/callback',
			scope: 'user:email',
			state: state,
			allow_signup: 'true',
		});
		return Response.redirect('https://github.com/login/oauth/authorize?' + params.toString(), 302);
	} catch (error) {
		console.error('GitHub OAuth start error:', error);
		return Response.redirect('https://mypasswordchecker.com/dashboard.html?error=oauth_failed', 302);
	}
}

async function handleGitHubAuthCallback(request, env, corsHeaders) {
	try {
		const url = new URL(request.url);
		const code = url.searchParams.get('code');
		const state = url.searchParams.get('state');
		if (!code || !state) {
			return Response.redirect('https://mypasswordchecker.com/dashboard.html?error=oauth_failed', 302);
		}
		const known = await env.SESSION_CACHE.get('github_state:' + state);
		if (!known) {
			return Response.redirect('https://mypasswordchecker.com/dashboard.html?error=invalid_state', 302);
		}
		await env.SESSION_CACHE.delete('github_state:' + state);

		// Exchange code for an access token.
		const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
			body: JSON.stringify({
				client_id: env.GITHUB_CLIENT_ID,
				client_secret: env.GITHUB_CLIENT_SECRET,
				code: code,
				redirect_uri: 'https://mypasswordchecker.com/api/auth/github/callback',
			})
		});
		const tokenData = await tokenRes.json();
		const accessToken = tokenData.access_token;
		if (!accessToken) {
			console.error('GitHub token exchange failed:', tokenData);
			return Response.redirect('https://mypasswordchecker.com/dashboard.html?error=oauth_failed', 302);
		}

		// Find the primary verified email.
		const emailRes = await fetch('https://api.github.com/user/emails', {
			headers: {
				'Authorization': 'Bearer ' + accessToken,
				'User-Agent': 'MyPasswordChecker',
				'Accept': 'application/vnd.github+json',
			}
		});
		const emails = await emailRes.json();
		if (!Array.isArray(emails)) {
			console.error('GitHub /user/emails unexpected:', emails);
			return Response.redirect('https://mypasswordchecker.com/dashboard.html?error=oauth_failed', 302);
		}
		const primary = emails.find(e => e.primary && e.verified);
		if (!primary || !primary.email) {
			return Response.redirect('https://mypasswordchecker.com/dashboard.html?error=no_email', 302);
		}
		const email = String(primary.email).toLowerCase();

		// Pull the display name if it's available — purely cosmetic.
		let userName = null;
		try {
			const userRes = await fetch('https://api.github.com/user', {
				headers: { 'Authorization': 'Bearer ' + accessToken, 'User-Agent': 'MyPasswordChecker' }
			});
			const userData = await userRes.json();
			userName = userData.name || userData.login || null;
		} catch (e) {}

		// Existing account → reuse; new → create a free-tier row.
		const row = await env.DB.prepare(
			`SELECT api_key FROM api_keys WHERE user_email = ? ORDER BY tier DESC LIMIT 1`
		).bind(email).first();

		let apiKey;
		if (row) {
			apiKey = row.api_key;
		} else {
			apiKey = `sk_free_${generateRandomId(32)}`;
			const now = Date.now();
			await env.DB.prepare(`
				INSERT INTO api_keys (
					api_key, user_email, user_name, tier, created_at,
					quota_limit, quota_used,
					quantum_limit, quantum_used,
					phonetic_limit, phonetic_used,
					breach_limit, breach_used,
					billing_cycle_start,
					payment_processor, status, email_verified
				) VALUES (?, ?, ?, 0, ?, 50, 0, 0, 0, 0, 0, 0, 0, ?, 'free', 'active', 1)
			`).bind(apiKey, email, userName, now, now).run();
			await logAudit(env, {
				event: 'github_signin_new_key',
				api_key: apiKey,
				email: email,
			});
		}

		return Response.redirect(
			'https://mypasswordchecker.com/dashboard.html#token=' + encodeURIComponent(apiKey),
			302
		);
	} catch (error) {
		console.error('GitHub OAuth callback error:', error);
		return Response.redirect('https://mypasswordchecker.com/dashboard.html?error=oauth_failed', 302);
	}
}

/**
 * Get all API keys (admin only)
 *
 * GET /api/admin/all-keys
 * Headers: Authorization: Bearer <ADMIN_TOKEN>
 *
 * Response:
 * {
 *   total_keys: 42,
 *   active: 35,
 *   pending: 3,
 *   suspended: 2,
 *   canceled: 2,
 *   keys: [...]
 * }
 */
async function handleAdminAllKeys(request, env, corsHeaders) {
	try {
		// Verify admin token
		const authResult = verifyAdminToken(request, env);
		if (!authResult.valid) {
			return jsonResponse({
				error: authResult.error
			}, 401, corsHeaders);
		}

		const url = new URL(request.url);
		const status = url.searchParams.get('status'); // Filter by status
		const limit = parseInt(url.searchParams.get('limit')) || 100;
		const offset = parseInt(url.searchParams.get('offset')) || 0;

		// Build query
		let query = 'SELECT * FROM api_keys';
		let bindings = [];

		if (status) {
			query += ' WHERE status = ?';
			bindings.push(status);
		}

		query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
		bindings.push(limit, offset);

		const keys = await env.DB.prepare(query).bind(...bindings).all();

		// Get status counts
		const statusCounts = await env.DB.prepare(`
			SELECT
				status,
				COUNT(*) as count
			FROM api_keys
			GROUP BY status
		`).all();

		const counts = {};
		let total = 0;
		for (const row of statusCounts.results || []) {
			counts[row.status] = row.count;
			total += row.count;
		}

		return jsonResponse({
			total_keys: total,
			active: counts.active || 0,
			pending: counts.pending || 0,
			suspended: counts.suspended || 0,
			canceled: counts.canceled || 0,
			expired: counts.expired || 0,
			limit: limit,
			offset: offset,
			keys: keys.results || []
		}, 200, corsHeaders);

	} catch (error) {
		console.error('Admin all keys error:', error);
		return jsonResponse({
			error: 'Failed to fetch API keys',
			message: error.message
		}, 500, corsHeaders);
	}
}

/**
 * Get platform-wide usage statistics (admin only)
 *
 * GET /api/admin/usage-stats
 * Headers: Authorization: Bearer <ADMIN_TOKEN>
 *
 * Response:
 * {
 *   total_requests_today: 5420,
 *   total_requests_week: 38500,
 *   total_requests_month: 142300,
 *   active_api_keys: 35,
 *   total_revenue: 450.00,
 *   top_users: [...],
 *   requests_by_tier: { 1: 1000, 2: 5000, 3: 30000 },
 *   error_rate: "2.3%"
 * }
 */
async function handleAdminUsageStats(request, env, corsHeaders) {
	try {
		// Verify admin token
		const authResult = verifyAdminToken(request, env);
		if (!authResult.valid) {
			return jsonResponse({
				error: authResult.error
			}, 401, corsHeaders);
		}

		const now = Date.now();
		const oneDayAgo = now - (24 * 60 * 60 * 1000);
		const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
		const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);

		// Requests by time period
		const requestsToday = await env.DB.prepare(`
			SELECT COUNT(*) as count
			FROM api_request_logs
			WHERE timestamp > ?
		`).bind(oneDayAgo).first();

		const requestsWeek = await env.DB.prepare(`
			SELECT COUNT(*) as count
			FROM api_request_logs
			WHERE timestamp > ?
		`).bind(oneWeekAgo).first();

		const requestsMonth = await env.DB.prepare(`
			SELECT COUNT(*) as count
			FROM api_request_logs
			WHERE timestamp > ?
		`).bind(oneMonthAgo).first();

		// Active API keys
		const activeKeys = await env.DB.prepare(`
			SELECT COUNT(*) as count
			FROM api_keys
			WHERE status = 'active'
		`).first();

		// Top users by requests (last 7 days)
		const topUsers = await env.DB.prepare(`
			SELECT
				ak.user_email,
				ak.tier,
				COUNT(arl.id) as request_count,
				ak.quota_used,
				ak.quota_limit
			FROM api_keys ak
			LEFT JOIN api_request_logs arl ON ak.api_key = arl.api_key
			WHERE arl.timestamp > ?
			GROUP BY ak.api_key
			ORDER BY request_count DESC
			LIMIT 10
		`).bind(oneWeekAgo).all();

		// Requests by tier
		const requestsByTier = await env.DB.prepare(`
			SELECT
				ak.tier,
				COUNT(arl.id) as count
			FROM api_request_logs arl
			JOIN api_keys ak ON arl.api_key = ak.api_key
			WHERE arl.timestamp > ?
			GROUP BY ak.tier
		`).bind(oneWeekAgo).all();

		const tierCounts = {};
		for (const row of requestsByTier.results || []) {
			tierCounts[row.tier] = row.count;
		}

		// Error rate (last 7 days)
		const totalRequests = await env.DB.prepare(`
			SELECT COUNT(*) as count
			FROM api_request_logs
			WHERE timestamp > ?
		`).bind(oneWeekAgo).first();

		const errorRequests = await env.DB.prepare(`
			SELECT COUNT(*) as count
			FROM api_request_logs
			WHERE timestamp > ? AND http_status >= 400
		`).bind(oneWeekAgo).first();

		const errorRate = totalRequests.count > 0
			? ((errorRequests.count / totalRequests.count) * 100).toFixed(2)
			: '0.00';

		// Calculate revenue (approximate from payment transactions)
		const revenue = await env.DB.prepare(`
			SELECT
				SUM(amount) as total,
				COUNT(*) as count
			FROM payment_transactions
			WHERE status = 'completed'
			  AND created_at > ?
		`).bind(oneMonthAgo).first();

		// Premium sessions count
		const premiumSessions = await env.DB.prepare(`
			SELECT COUNT(*) as count
			FROM sessions
			WHERE status = 'active' AND expires_at > ?
		`).bind(now).first();

		// Abuse events count
		const unresolvedAbuse = await env.DB.prepare(`
			SELECT COUNT(*) as count
			FROM abuse_events
			WHERE resolved = 0
		`).first();

		return jsonResponse({
			total_requests_today: requestsToday.count,
			total_requests_week: requestsWeek.count,
			total_requests_month: requestsMonth.count,
			active_api_keys: activeKeys.count,
			active_premium_sessions: premiumSessions.count,
			total_revenue_month: revenue.total || 0,
			total_transactions_month: revenue.count || 0,
			top_users: topUsers.results || [],
			requests_by_tier: tierCounts,
			error_rate: errorRate + '%',
			unresolved_abuse_events: unresolvedAbuse.count
		}, 200, corsHeaders);

	} catch (error) {
		console.error('Admin usage stats error:', error);
		return jsonResponse({
			error: 'Failed to fetch usage statistics',
			message: error.message
		}, 500, corsHeaders);
	}
}

/**
 * Get unresolved abuse alerts (admin only)
 *
 * GET /api/admin/abuse-alerts
 * Headers: Authorization: Bearer <ADMIN_TOKEN>
 *
 * Response:
 * {
 *   total_unresolved: 5,
 *   critical: 1,
 *   high: 2,
 *   medium: 1,
 *   low: 1,
 *   alerts: [...]
 * }
 */
async function handleAdminAbuseAlerts(request, env, corsHeaders) {
	try {
		// Verify admin token
		const authResult = verifyAdminToken(request, env);
		if (!authResult.valid) {
			return jsonResponse({
				error: authResult.error
			}, 401, corsHeaders);
		}

		const url = new URL(request.url);
		const severity = url.searchParams.get('severity');
		const limit = parseInt(url.searchParams.get('limit')) || 50;

		// Build query
		let query = `
			SELECT
				ae.*,
				ak.user_email,
				ak.status as key_status,
				ak.abuse_score
			FROM abuse_events ae
			JOIN api_keys ak ON ae.api_key = ak.api_key
			WHERE ae.resolved = 0
		`;
		let bindings = [];

		if (severity) {
			query += ' AND ae.severity = ?';
			bindings.push(severity);
		}

		query += ' ORDER BY ae.severity DESC, ae.created_at DESC LIMIT ?';
		bindings.push(limit);

		const alerts = await env.DB.prepare(query).bind(...bindings).all();

		// Get severity counts
		const severityCounts = await env.DB.prepare(`
			SELECT
				severity,
				COUNT(*) as count
			FROM abuse_events
			WHERE resolved = 0
			GROUP BY severity
		`).all();

		const counts = {};
		let total = 0;
		for (const row of severityCounts.results || []) {
			counts[row.severity] = row.count;
			total += row.count;
		}

		return jsonResponse({
			total_unresolved: total,
			critical: counts.critical || 0,
			high: counts.high || 0,
			medium: counts.medium || 0,
			low: counts.low || 0,
			alerts: alerts.results || []
		}, 200, corsHeaders);

	} catch (error) {
		console.error('Admin abuse alerts error:', error);
		return jsonResponse({
			error: 'Failed to fetch abuse alerts',
			message: error.message
		}, 500, corsHeaders);
	}
}

/**
 * Suspend or unsuspend API key (admin only)
 *
 * POST /api/admin/suspend-key
 * Headers: Authorization: Bearer <ADMIN_TOKEN>
 * Body: {
 *   api_key: "sk_live_xxxxx",
 *   action: "suspend" | "unsuspend",
 *   reason?: "Manual admin suspension"
 * }
 */
async function handleAdminSuspendKey(request, env, corsHeaders) {
	try {
		// Verify admin token
		const authResult = verifyAdminToken(request, env);
		if (!authResult.valid) {
			return jsonResponse({
				error: authResult.error
			}, 401, corsHeaders);
		}

		const body = await request.json();
		const { api_key, action, reason } = body;

		if (!api_key || !action) {
			return jsonResponse({
				error: 'Missing required fields: api_key, action'
			}, 400, corsHeaders);
		}

		if (!['suspend', 'unsuspend'].includes(action)) {
			return jsonResponse({
				error: 'Invalid action. Must be: suspend or unsuspend'
			}, 400, corsHeaders);
		}

		// Get API key data
		const apiKeyData = await env.DB.prepare(`
			SELECT * FROM api_keys WHERE api_key = ?
		`).bind(api_key).first();

		if (!apiKeyData) {
			return jsonResponse({
				error: 'API key not found'
			}, 404, corsHeaders);
		}

		const now = Date.now();

		if (action === 'suspend') {
			// Suspend key
			await env.DB.prepare(`
				UPDATE api_keys
				SET status = 'suspended',
				    suspended_reason = ?,
				    canceled_at = ?
				WHERE api_key = ?
			`).bind(
				reason || 'Manual admin suspension',
				now,
				api_key
			).run();

			// Create abuse event
			await createAbuseEvent(env, {
				api_key: api_key,
				user_email: apiKeyData.user_email,
				event_type: 'admin_suspended',
				severity: 'high',
				description: reason || 'Manual admin suspension',
				action_taken: 'suspended'
			});

			// Log audit
			await logAudit(env, {
				event: 'admin_suspend_key',
				api_key: api_key.substring(0, 20) + '...',
				user_email: apiKeyData.user_email,
				reason: reason || 'Manual admin suspension'
			});

		} else {
			// Unsuspend key
			await env.DB.prepare(`
				UPDATE api_keys
				SET status = 'active',
				    suspended_reason = NULL
				WHERE api_key = ?
			`).bind(api_key).run();

			// Resolve related abuse events
			await env.DB.prepare(`
				UPDATE abuse_events
				SET resolved = 1,
				    resolved_at = ?,
				    resolved_by = 'admin',
				    resolution_notes = ?
				WHERE api_key = ? AND resolved = 0
			`).bind(now, 'Admin unsuspended key', api_key).run();

			// Log audit
			await logAudit(env, {
				event: 'admin_unsuspend_key',
				api_key: api_key.substring(0, 20) + '...',
				user_email: apiKeyData.user_email
			});
		}

		// Invalidate cache
		await env.API_KEYS.delete(api_key);

		return jsonResponse({
			success: true,
			action: action,
			api_key: api_key.substring(0, 20) + '...',
			user_email: apiKeyData.user_email,
			message: `API key ${action === 'suspend' ? 'suspended' : 'unsuspended'} successfully`
		}, 200, corsHeaders);

	} catch (error) {
		console.error('Admin suspend key error:', error);
		return jsonResponse({
			error: 'Failed to suspend/unsuspend API key',
			message: error.message
		}, 500, corsHeaders);
	}
}

// ═══════════════════════════════════════════════════════════════
// SECURITY & VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Comprehensive API request validation with 7 security checks
 *
 * Checks performed:
 * 1. API key exists and is active
 * 2. Email verification (if required)
 * 3. Domain verification (if configured)
 * 4. IP whitelisting (if configured)
 * 5. Rate limiting based on tier
 * 6. Quota enforcement
 * 7. Request signature verification (if enabled)
 * 8. Abuse score monitoring (auto-suspend at >70)
 *
 * @param {string} apiKey - API key from request
 * @param {Request} request - Full request object
 * @param {Object} env - Worker environment bindings
 * @returns {Object} { valid: boolean, apiKeyData?: Object, error?: string, errorCode?: string }
 */

/**
 * ADMIN: Free Tier Statistics & Abuse Detection
 * GET /api/admin/free-tier-stats?admin_token=xxx
 *
 * Shows:
 * - Total free tier keys
 * - Domain reuse attempts (blocked)
 * - Email reuse attempts (blocked)
 * - Most active free tier users
 * - Upgrade conversion rate
 */
async function handleAdminFreeTierStats(request, env, corsHeaders) {
	try {
		const url = new URL(request.url);
		const adminToken = url.searchParams.get('admin_token');

		// Verify admin token
		if (!env.ADMIN_TOKEN || adminToken !== env.ADMIN_TOKEN) {
			return jsonResponse({ error: 'Unauthorized' }, 403, corsHeaders);
		}

		// Get free tier key counts
		const stats = await env.DB.prepare(`
			SELECT
				COUNT(*) as total_free_keys,
				COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
				COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
				SUM(quota_used) as total_requests,
				AVG(quota_used) as avg_requests_per_key
			FROM api_keys
			WHERE tier = 0
		`).first();

		// Get domains with multiple free key attempts (abuse detection)
		const domainAbuse = await env.DB.prepare(`
			SELECT
				allowed_domains,
				COUNT(*) as attempt_count
			FROM api_keys
			WHERE tier = 0 AND allowed_domains IS NOT NULL
			GROUP BY allowed_domains
			HAVING COUNT(*) > 1
		`).all();

		// Get most active free tier users (upgrade candidates)
		const topFreeUsers = await env.DB.prepare(`
			SELECT
				user_email,
				quota_used,
				quota_limit,
				total_requests,
				allowed_domains,
				created_at
			FROM api_keys
			WHERE tier = 0 AND status = 'active'
			ORDER BY quota_used DESC
			LIMIT 20
		`).all();

		return jsonResponse({
			overview: {
				total_free_keys: stats.total_free_keys,
				active: stats.active,
				pending_verification: stats.pending,
				total_requests_served: stats.total_requests,
				avg_requests_per_key: Math.round(stats.avg_requests_per_key || 0),
			},

			abuse_detection: {
				domains_with_multiple_attempts: domainAbuse.results.length,
				details: domainAbuse.results.map(d => ({
					domain: d.allowed_domains,
					attempts: d.attempt_count,
					note: 'System blocks duplicate domain attempts'
				}))
			},

			upgrade_candidates: topFreeUsers.results
				.filter(u => u.quota_used >= 45) // Close to limit
				.map(u => ({
					email: u.user_email,
					usage: `${u.quota_used}/50`,
					percentage: ((u.quota_used / 50) * 100).toFixed(0) + '%',
					domain: JSON.parse(u.allowed_domains || '[]')[0],
					days_active: Math.floor((Date.now() - u.created_at) / (24 * 60 * 60 * 1000)),
					recommendation: u.quota_used >= 50 ? 'Send upgrade email (hit limit)' : 'Monitor'
				})),

			most_active: topFreeUsers.results.slice(0, 10).map(u => ({
				email: u.user_email,
				requests_used: u.quota_used,
				total_requests: u.total_requests,
				domain: JSON.parse(u.allowed_domains || '[]')[0],
			})),

		}, 200, corsHeaders);

	} catch (error) {
		console.error('Admin free tier stats error:', error);
		return jsonResponse({
			error: 'Failed to fetch free tier stats',
			message: error.message
		}, 500, corsHeaders);
	}
}
async function validateAPIRequest(apiKey, request, env) {
	const startTime = Date.now();
	const url = new URL(request.url);
	const clientIP = request.headers.get('CF-Connecting-IP');
	const referer = request.headers.get('Referer') || request.headers.get('Origin');

	try {
		// ────────────────────────────────────────────────────────
		// CHECK 1: API Key Exists & Active
		// ────────────────────────────────────────────────────────

		// Try KV cache first
		let apiKeyData = await env.API_KEYS.get(apiKey, { type: 'json' });

		// Fall back to D1 if not in cache
		if (!apiKeyData) {
			const result = await env.DB.prepare(`
				SELECT * FROM api_keys WHERE api_key = ?
			`).bind(apiKey).first();

			if (!result) {
				await logAPIRequest(env, {
					api_key: apiKey,
					endpoint: url.pathname,
					ip_address: clientIP,
					http_status: 401,
					error_message: 'Invalid API key',
					suspicious_pattern: 1,
					abuse_type: 'invalid_key'
				});

				return {
					valid: false,
					error: 'Invalid API key',
					errorCode: 'INVALID_KEY'
				};
			}

			apiKeyData = result;

			// Cache for 5 minutes
			await env.API_KEYS.put(apiKey, JSON.stringify(apiKeyData), {
				expirationTtl: 300
			});
		}

		// Check if key is active
		if (apiKeyData.status !== 'active') {
			await logAPIRequest(env, {
				api_key: apiKey,
				endpoint: url.pathname,
				ip_address: clientIP,
				http_status: 403,
				error_message: `API key status: ${apiKeyData.status}`,
				suspended_reason: apiKeyData.suspended_reason
			});

			return {
				valid: false,
				error: `API key is ${apiKeyData.status}${apiKeyData.suspended_reason ? ': ' + apiKeyData.suspended_reason : ''}`,
				errorCode: 'KEY_INACTIVE'
			};
		}

		// ────────────────────────────────────────────────────────
		// CHECK 2: Email Verification
		// ────────────────────────────────────────────────────────

		if (apiKeyData.email_verified === 0) {
			await logAPIRequest(env, {
				api_key: apiKey,
				endpoint: url.pathname,
				ip_address: clientIP,
				http_status: 403,
				error_message: 'Email not verified'
			});

			return {
				valid: false,
				error: 'Email verification required. Check your inbox for verification code.',
				errorCode: 'EMAIL_NOT_VERIFIED'
			};
		}

		// ────────────────────────────────────────────────────────
		// CHECK 3: Domain Verification (if configured)
		// ────────────────────────────────────────────────────────

		if (apiKeyData.allowed_domains) {
			const allowedDomains = JSON.parse(apiKeyData.allowed_domains);

			if (allowedDomains.length > 0) {
				const refererDomain = extractDomain(referer);
				const isDomainWhitelisted = allowedDomains.some(domain =>
					refererDomain === domain || refererDomain.endsWith(`.${domain}`)
				);

				if (!isDomainWhitelisted) {
					await logAPIRequest(env, {
						api_key: apiKey,
						endpoint: url.pathname,
						ip_address: clientIP,
						referer: referer,
						http_status: 403,
						error_message: `Domain not whitelisted: ${refererDomain}`,
						domain_whitelisted: 0,
						suspicious_pattern: 1,
						abuse_type: 'unauthorized_domain'
					});

					return {
						valid: false,
						error: `Domain not whitelisted: ${refererDomain}. Add domain via dashboard.`,
						errorCode: 'DOMAIN_NOT_WHITELISTED'
					};
				}
			}
		}

		// ────────────────────────────────────────────────────────
		// CHECK 4: IP Whitelisting (if configured)
		// ────────────────────────────────────────────────────────

		if (apiKeyData.allowed_ips) {
			const allowedIPs = JSON.parse(apiKeyData.allowed_ips);

			if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
				await logAPIRequest(env, {
					api_key: apiKey,
					endpoint: url.pathname,
					ip_address: clientIP,
					http_status: 403,
					error_message: `IP not whitelisted: ${clientIP}`,
					ip_whitelisted: 0,
					suspicious_pattern: 1,
					abuse_type: 'unauthorized_ip'
				});

				return {
					valid: false,
					error: `IP address not whitelisted: ${clientIP}`,
					errorCode: 'IP_NOT_WHITELISTED'
				};
			}
		}

		// ────────────────────────────────────────────────────────
		// CHECK 5: Rate Limiting
		// ────────────────────────────────────────────────────────

		const rateLimitResult = await checkRateLimit(apiKey, apiKeyData, env);
		if (!rateLimitResult.allowed) {
			await logAPIRequest(env, {
				api_key: apiKey,
				endpoint: url.pathname,
				ip_address: clientIP,
				http_status: 429,
				error_message: 'Rate limit exceeded',
				suspicious_pattern: 1,
				abuse_type: 'rate_limit'
			});

			// Create abuse event
			await createAbuseEvent(env, {
				api_key: apiKey,
				user_email: apiKeyData.user_email,
				event_type: 'rate_limit_exceeded',
				severity: 'medium',
				description: `Exceeded ${rateLimitResult.limit} requests per minute`,
				ip_address: clientIP,
				endpoint: url.pathname,
				action_taken: 'blocked'
			});

			return {
				valid: false,
				error: `Rate limit exceeded. Limit: ${rateLimitResult.limit} requests/minute. Try again in ${rateLimitResult.retryAfter} seconds.`,
				errorCode: 'RATE_LIMIT_EXCEEDED',
				retryAfter: rateLimitResult.retryAfter
			};
		}

		// ────────────────────────────────────────────────────────
		// CHECK 6: Quota Enforcement
		// ────────────────────────────────────────────────────────

		if (apiKeyData.quota_used >= apiKeyData.quota_limit) {
			await logAPIRequest(env, {
				api_key: apiKey,
				endpoint: url.pathname,
				ip_address: clientIP,
				http_status: 429,
				error_message: 'Quota exceeded'
			});

			// Create abuse event
			await createAbuseEvent(env, {
				api_key: apiKey,
				user_email: apiKeyData.user_email,
				event_type: 'quota_exceeded',
				severity: 'low',
				description: `Used ${apiKeyData.quota_used}/${apiKeyData.quota_limit} requests`,
				action_taken: 'blocked'
			});

			return {
				valid: false,
				error: `Quota exceeded. Used ${apiKeyData.quota_used}/${apiKeyData.quota_limit} requests this billing cycle.`,
				errorCode: 'QUOTA_EXCEEDED'
			};
		}

		// ────────────────────────────────────────────────────────
		// DOMAIN VERIFICATION (ALL TIERS)
		// ────────────────────────────────────────────────────────

		if (!apiKeyData.allowed_domains || JSON.parse(apiKeyData.allowed_domains).length === 0) {
			return {
				valid: false,
				error: 'Domain verification required. Please verify your domain in the dashboard at https://mypasswordchecker.com/dashboard',
				status: 403,
			};
		}

		// ────────────────────────────────────────────────────────
		// FREE TIER SPECIFIC CHECKS
		// ────────────────────────────────────────────────────────

		if (apiKeyData.tier === 0) {
			// Free tier CANNOT use premium features
			const endpoint = url.pathname;

			if (endpoint.includes('quantum') ||
					endpoint.includes('phonetic') ||
					endpoint.includes('breach')) {
				return {
					valid: false,
					error: 'This feature requires a paid tier. Upgrade at https://mypasswordchecker.com/pricing',
					status: 403,
					upgrade_required: true,
				};
			}

			// Free tier has NO overage allowance (hard limit)
			if (apiKeyData.quota_used >= apiKeyData.quota_limit) {
				return {
					valid: false,
					error: 'Free tier quota exceeded (50/month). Upgrade for higher limits and overage allowance.',
					upgrade_url: 'https://mypasswordchecker.com/pricing',
					status: 429,
				};
			}
		}

		// ────────────────────────────────────────────────────────
		// CHECK 7: Request Signature Verification (if enabled)
		// ────────────────────────────────────────────────────────

		if (apiKeyData.require_signature === 1) {
			const signatureHeader = request.headers.get('X-Signature');

			if (!signatureHeader) {
				await logAPIRequest(env, {
					api_key: apiKey,
					endpoint: url.pathname,
					ip_address: clientIP,
					http_status: 401,
					error_message: 'Missing signature',
					signature_valid: 0,
					suspicious_pattern: 1,
					abuse_type: 'missing_signature'
				});

				return {
					valid: false,
					error: 'Request signature required but not provided',
					errorCode: 'MISSING_SIGNATURE'
				};
			}

			const isSignatureValid = await verifyRequestSignature(
				request,
				signatureHeader,
				apiKeyData.api_secret
			);

			if (!isSignatureValid) {
				await logAPIRequest(env, {
					api_key: apiKey,
					endpoint: url.pathname,
					ip_address: clientIP,
					http_status: 401,
					error_message: 'Invalid signature',
					signature_valid: 0,
					suspicious_pattern: 1,
					abuse_type: 'invalid_signature'
				});

				// Create abuse event for repeated invalid signatures
				await createAbuseEvent(env, {
					api_key: apiKey,
					user_email: apiKeyData.user_email,
					event_type: 'invalid_signature',
					severity: 'high',
					description: 'Request signature verification failed',
					ip_address: clientIP,
					endpoint: url.pathname,
					action_taken: 'blocked'
				});

				return {
					valid: false,
					error: 'Invalid request signature',
					errorCode: 'INVALID_SIGNATURE'
				};
			}
		}

		// ────────────────────────────────────────────────────────
		// CHECK 8: Abuse Score Monitoring
		// ────────────────────────────────────────────────────────

		if (apiKeyData.abuse_score >= 70) {
			// Auto-suspend
			await env.DB.prepare(`
				UPDATE api_keys
				SET status = 'suspended',
				    suspended_reason = 'Auto-suspended due to high abuse score (${apiKeyData.abuse_score})'
				WHERE api_key = ?
			`).bind(apiKey).run();

			// Invalidate cache
			await env.API_KEYS.delete(apiKey);

			await createAbuseEvent(env, {
				api_key: apiKey,
				user_email: apiKeyData.user_email,
				event_type: 'auto_suspended',
				severity: 'critical',
				description: `Auto-suspended for abuse score: ${apiKeyData.abuse_score}/100`,
				ip_address: clientIP,
				action_taken: 'suspended'
			});

			return {
				valid: false,
				error: 'API key suspended due to suspicious activity. Contact support.',
				errorCode: 'KEY_SUSPENDED'
			};
		}

		// ────────────────────────────────────────────────────────
		// ALL CHECKS PASSED - Log successful request
		// ────────────────────────────────────────────────────────

		const responseTime = Date.now() - startTime;

		await logAPIRequest(env, {
			api_key: apiKey,
			endpoint: url.pathname,
			method: request.method,
			ip_address: clientIP,
			user_agent: request.headers.get('User-Agent'),
			referer: referer,
			signature_valid: apiKeyData.require_signature === 1 ? 1 : null,
			domain_whitelisted: apiKeyData.allowed_domains ? 1 : null,
			ip_whitelisted: apiKeyData.allowed_ips ? 1 : null,
			http_status: 200,
			response_time_ms: responseTime,
			suspicious_pattern: 0
		});

		return {
			valid: true,
			apiKeyData: apiKeyData
		};

	} catch (error) {
		console.error('API validation error:', error);

		await logAPIRequest(env, {
			api_key: apiKey,
			endpoint: url.pathname,
			ip_address: clientIP,
			http_status: 500,
			error_message: error.message,
			suspicious_pattern: 0
		});

		return {
			valid: false,
			error: 'Validation error',
			errorCode: 'VALIDATION_ERROR'
		};
	}
}

/**
 * Check rate limiting for API key
 * Tier-based limits: T1=10/min, T2=100/min, T3=1000/min
 *
 * @param {string} apiKey - API key
 * @param {Object} apiKeyData - API key data from database
 * @param {Object} env - Environment bindings
 * @returns {Object} { allowed: boolean, limit: number, retryAfter?: number }
 */
async function checkRateLimit(apiKey, apiKeyData, env) {
	const now = Date.now();
	const windowMs = 60 * 1000; // 1 minute

	// Get tier-based limit (can be overridden per-key)
	let limit = apiKeyData.rate_limit_per_minute;

	if (!limit) {
		// Default tier limits
		const tierLimits = { 1: 10, 2: 100, 3: 1000 };
		limit = tierLimits[apiKeyData.tier] || 10;
	}

	// Get current count from KV
	const rateLimitKey = `ratelimit:${apiKey}`;
	const currentData = await env.USAGE_TRACKING.get(rateLimitKey, { type: 'json' });

	if (!currentData || (now - currentData.windowStart) >= windowMs) {
		// New window - reset counter
		await env.USAGE_TRACKING.put(rateLimitKey, JSON.stringify({
			count: 1,
			windowStart: now
		}), { expirationTtl: 120 }); // Keep for 2 minutes

		return { allowed: true, limit: limit };
	}

	// Within current window
	if (currentData.count >= limit) {
		const retryAfter = Math.ceil((windowMs - (now - currentData.windowStart)) / 1000);
		return {
			allowed: false,
			limit: limit,
			retryAfter: retryAfter
		};
	}

	// Increment counter
	currentData.count++;
	await env.USAGE_TRACKING.put(rateLimitKey, JSON.stringify(currentData), {
		expirationTtl: 120
	});

	return { allowed: true, limit: limit };
}

/**
 * Calculate abuse score based on request patterns
 * Score 0-100, higher = more suspicious
 * Auto-suspend at score >70
 *
 * Factors:
 * - Failed signature attempts (+15 per occurrence)
 * - Rate limit violations (+10 per occurrence)
 * - Domain violations (+12 per occurrence)
 * - IP violations (+12 per occurrence)
 * - Invalid key attempts (+20 per occurrence)
 * - Time-based decay (-5 per day since last violation)
 *
 * @param {string} apiKey - API key
 * @param {Object} env - Environment bindings
 * @returns {number} Abuse score 0-100
 */
async function calculateAbuseScore(apiKey, env) {
	const now = Date.now();
	const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

	// Get suspicious requests in last 7 days
	const result = await env.DB.prepare(`
		SELECT
			abuse_type,
			COUNT(*) as count
		FROM api_request_logs
		WHERE api_key = ?
		  AND timestamp > ?
		  AND suspicious_pattern = 1
		GROUP BY abuse_type
	`).bind(apiKey, sevenDaysAgo).all();

	let score = 0;
	const weights = {
		'invalid_signature': 15,
		'rate_limit': 10,
		'unauthorized_domain': 12,
		'unauthorized_ip': 12,
		'invalid_key': 20,
		'missing_signature': 8
	};

	for (const row of result.results || []) {
		const weight = weights[row.abuse_type] || 5;
		score += weight * row.count;
	}

	// Cap at 100
	score = Math.min(score, 100);

	// Update abuse score in database
	await env.DB.prepare(`
		UPDATE api_keys
		SET abuse_score = ?, last_abuse_check = ?
		WHERE api_key = ?
	`).bind(score, now, apiKey).run();

	// Invalidate cache
	await env.API_KEYS.delete(apiKey);

	return score;
}

/**
 * Verify HMAC SHA-256 request signature
 *
 * Expected signature format:
 * X-Signature: t=<timestamp>,v1=<hmac_sha256_hex>
 *
 * Signature payload: `${timestamp}.${method}.${path}.${body}`
 *
 * @param {Request} request - HTTP request
 * @param {string} signatureHeader - X-Signature header value
 * @param {string} secret - API secret for HMAC
 * @returns {boolean} True if signature is valid
 */
async function verifyRequestSignature(request, signatureHeader, secret) {
	try {
		// Parse signature header
		const parts = signatureHeader.split(',');
		const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
		const signature = parts.find(p => p.startsWith('v1='))?.split('=')[1];

		if (!timestamp || !signature) {
			return false;
		}

		// Check timestamp freshness (within 5 minutes)
		const now = Math.floor(Date.now() / 1000);
		if (Math.abs(now - parseInt(timestamp)) > 300) {
			console.warn('Signature timestamp too old');
			return false;
		}

		// Build signature payload
		const url = new URL(request.url);
		const body = request.method !== 'GET' ? await request.clone().text() : '';
		const payload = `${timestamp}.${request.method}.${url.pathname}.${body}`;

		// Calculate expected signature
		const encoder = new TextEncoder();
		const keyData = encoder.encode(secret);
		const messageData = encoder.encode(payload);

		const cryptoKey = await crypto.subtle.importKey(
			'raw',
			keyData,
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign']
		);

		const signatureBytes = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
		const expectedSignature = Array.from(new Uint8Array(signatureBytes))
			.map(b => b.toString(16).padStart(2, '0'))
			.join('');

		// Constant-time comparison
		return signature === expectedSignature;

	} catch (error) {
		console.error('Signature verification error:', error);
		return false;
	}
}

/**
 * Log API request to database for audit trail and abuse detection
 */
async function logAPIRequest(env, data) {
	try {
		await env.DB.prepare(`
			INSERT INTO api_request_logs (
				timestamp, api_key, endpoint, method, ip_address, user_agent, referer,
				signature_valid, domain_whitelisted, ip_whitelisted,
				http_status, response_time_ms, error_message,
				suspicious_pattern, abuse_type
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).bind(
			data.timestamp || Date.now(),
			data.api_key || null,
			data.endpoint || null,
			data.method || null,
			data.ip_address || null,
			data.user_agent || null,
			data.referer || null,
			data.signature_valid !== undefined ? data.signature_valid : null,
			data.domain_whitelisted !== undefined ? data.domain_whitelisted : null,
			data.ip_whitelisted !== undefined ? data.ip_whitelisted : null,
			data.http_status || 200,
			data.response_time_ms || null,
			data.error_message || null,
			data.suspicious_pattern || 0,
			data.abuse_type || null
		).run();

		// Periodically calculate abuse score (every 100 requests or suspicious pattern)
		if (data.suspicious_pattern === 1 || Math.random() < 0.01) {
			await calculateAbuseScore(data.api_key, env);
		}

	} catch (error) {
		console.error('Failed to log API request:', error);
		// Don't throw - logging failure shouldn't break API
	}
}

/**
 * Create abuse event for admin monitoring
 */
async function createAbuseEvent(env, event) {
	try {
		await env.DB.prepare(`
			INSERT INTO abuse_events (
				created_at, api_key, user_email, event_type, severity,
				description, ip_address, endpoint, request_count,
				time_window_minutes, action_taken, resolved
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
		`).bind(
			Date.now(),
			event.api_key,
			event.user_email || null,
			event.event_type,
			event.severity,
			event.description,
			event.ip_address || null,
			event.endpoint || null,
			event.request_count || null,
			event.time_window_minutes || null,
			event.action_taken || 'flagged'
		).run();

	} catch (error) {
		console.error('Failed to create abuse event:', error);
	}
}

/**
 * Extract domain from URL or referer
 */
function extractDomain(url) {
	if (!url) return '';

	try {
		const parsedUrl = new URL(url);
		return parsedUrl.hostname;
	} catch {
		return '';
	}
}

// ═══════════════════════════════════════════════════════════════
// EMAIL SENDING FUNCTIONS (Cloudflare Email Routing)
// ═══════════════════════════════════════════════════════════════

/**
 * Send email via Cloudflare Email Workers
 * No external service needed!
 */
async function sendEmail(env, to, subject, htmlBody, textBody) {
	try {
		const message = new EmailMessage(
			env.EMAIL_FROM || "noreply@mypasswordchecker.com",
			to,
			subject
		);

		message.setHeader("Reply-To", env.EMAIL_REPLY_TO || "support@mypasswordchecker.com");

		// Set both HTML and plain text versions
		if (htmlBody) {
			message.setHeader("Content-Type", "text/html; charset=utf-8");
			await message.setBody(htmlBody);
		} else {
			message.setHeader("Content-Type", "text/plain; charset=utf-8");
			await message.setBody(textBody);
		}

		// Send via Cloudflare's email binding
		await env.EMAIL.send(message);

		console.log(`Email sent to ${to}: ${subject}`);
		return true;

	} catch (error) {
		console.error('Email send failed:', error);

		// Log to audit trail
		await logAudit(env, {
			event: 'email_send_failed',
			to: to,
			subject: subject,
			error: error.message,
		});

		return false;
	}
}

/**
 * Send verification email to new API subscribers
 */
async function sendVerificationEmail(env, email, apiKey, verificationCode) {
	const verificationUrl = `https://mypasswordchecker.com/api/verify-email?code=${verificationCode}`;

	const htmlBody = `
		<!DOCTYPE html>
		<html>
		<head>
			<style>
				body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
				.container { max-width: 600px; margin: 0 auto; padding: 20px; }
				.header { background: #0066cc; color: white; padding: 20px; text-align: center; }
				.content { padding: 30px; background: #f9f9f9; }
				.button {
					display: inline-block;
					padding: 12px 30px;
					background: #0066cc;
					color: white;
					text-decoration: none;
					border-radius: 5px;
					margin: 20px 0;
				}
				.footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
				.code {
					background: #fff;
					border: 2px dashed #0066cc;
					padding: 15px;
					font-family: monospace;
					font-size: 14px;
					text-align: center;
					margin: 20px 0;
					word-break: break-all;
				}
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<h1>🔐 MyPasswordChecker API</h1>
					<p>Verify Your Email Address</p>
				</div>

				<div class="content">
					<h2>Welcome to MyPasswordChecker API!</h2>

					<p>Thank you for subscribing to our developer API. To activate your API key, please verify your email address.</p>

					<p><strong>Your API Key:</strong></p>
					<div class="code">${apiKey}</div>

					<p>Click the button below to verify your email:</p>

					<p style="text-align: center;">
						<a href="${verificationUrl}" class="button">Verify Email Address</a>
					</p>

					<p>Or copy and paste this link into your browser:</p>
					<p style="word-break: break-all; font-size: 12px;">${verificationUrl}</p>

					<p><strong>Important:</strong> Your API key will not work until you verify your email address.</p>

					<p>After verification, you can:</p>
					<ul>
						<li>Add verified domains in your dashboard</li>
						<li>Monitor your API usage and quota</li>
						<li>Access premium password checking features</li>
					</ul>

					<p>Need help? Reply to this email or visit our documentation.</p>
				</div>

				<div class="footer">
					<p>This email was sent to ${email} because you subscribed to MyPasswordChecker API.</p>
					<p>MyPasswordChecker.com | Secure Password Analysis API</p>
				</div>
			</div>
		</body>
		</html>
	`;

	const textBody = `
MyPasswordChecker API - Verify Your Email

Thank you for subscribing! To activate your API key, please verify your email address.

Your API Key: ${apiKey}

Verification Link: ${verificationUrl}

Your API key will not work until you verify your email address.

After verification, you can add verified domains and monitor your usage in the dashboard.

Need help? Reply to this email or visit mypasswordchecker.com/docs

---
This email was sent to ${email} because you subscribed to MyPasswordChecker API.
	`;

	return await sendEmail(
		env,
		email,
		env.VERIFICATION_EMAIL_SUBJECT || "Verify Your Email - MyPasswordChecker API",
		htmlBody,
		textBody
	);
}

/**
 * Send admin alert email
 */
async function sendAdminAlert(env, subject, message, apiKey, details) {
	const htmlBody = `
		<!DOCTYPE html>
		<html>
		<head>
			<style>
				body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
				.container { max-width: 600px; margin: 0 auto; padding: 20px; }
				.header { background: #cc0000; color: white; padding: 20px; text-align: center; }
				.content { padding: 30px; background: #fff3cd; border: 2px solid #ffcc00; }
				.details { background: #f9f9f9; padding: 15px; margin: 20px 0; border-left: 4px solid #cc0000; }
				.code { font-family: monospace; background: #f4f4f4; padding: 2px 5px; }
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<h1>🚨 Admin Alert</h1>
					<p>${subject}</p>
				</div>

				<div class="content">
					<h2>Action Required</h2>
					<p>${message}</p>

					<div class="details">
						<p><strong>API Key:</strong> <span class="code">${apiKey || 'N/A'}</span></p>
						<p><strong>Time:</strong> ${new Date().toISOString()}</p>
						${details ? `<p><strong>Details:</strong></p><pre>${JSON.stringify(details, null, 2)}</pre>` : ''}
					</div>

					<p><a href="https://mypasswordchecker.com/admin">View Admin Dashboard →</a></p>
				</div>
			</div>
		</body>
		</html>
	`;

	const textBody = `
ADMIN ALERT: ${subject}

${message}

API Key: ${apiKey || 'N/A'}
Time: ${new Date().toISOString()}

${details ? `Details:\n${JSON.stringify(details, null, 2)}` : ''}

View admin dashboard: https://mypasswordchecker.com/admin
	`;

	return await sendEmail(
		env,
		env.ADMIN_EMAIL || "jack@mypasswordchecker.com",
		`[MyPasswordChecker] ${subject}`,
		htmlBody,
		textBody
	);
}

/**
 * Send suspension notification to developer
 */
async function sendSuspensionEmail(env, email, apiKey, reason, abuseScore) {
	const htmlBody = `
		<!DOCTYPE html>
		<html>
		<head>
			<style>
				body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
				.container { max-width: 600px; margin: 0 auto; padding: 20px; }
				.header { background: #cc0000; color: white; padding: 20px; text-align: center; }
				.content { padding: 30px; background: #fff3cd; }
				.warning { background: #ffebee; border-left: 4px solid #c62828; padding: 15px; margin: 20px 0; }
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<h1>⚠️ API Key Suspended</h1>
				</div>

				<div class="content">
					<h2>Your API Key Has Been Suspended</h2>

					<p>We detected suspicious activity associated with your API key and have temporarily suspended it to protect our service.</p>

					<div class="warning">
						<p><strong>Reason:</strong> ${reason}</p>
						<p><strong>Abuse Score:</strong> ${abuseScore}/100</p>
						<p><strong>API Key:</strong> ${apiKey.substring(0, 20)}...</p>
					</div>

					<p><strong>What This Means:</strong></p>
					<ul>
						<li>Your API key is currently inactive</li>
						<li>API requests will return an error</li>
						<li>This may be a false positive if you experienced legitimate high traffic</li>
					</ul>

					<p><strong>How to Resolve:</strong></p>
					<ol>
						<li>Review your recent API usage in the dashboard</li>
						<li>Ensure your domain verification is complete</li>
						<li>Check for any unauthorized use of your API key</li>
						<li>Contact support at ${env.EMAIL_REPLY_TO} with details about your use case</li>
					</ol>

					<p>If this was triggered by legitimate high traffic (e.g., you launched a popular feature), please reply to this email with details and we'll reactivate your key.</p>

					<p><strong>Common Triggers:</strong></p>
					<ul>
						<li>Sudden 5x increase in traffic</li>
						<li>Requests from non-whitelisted domains</li>
						<li>High error rates (>50%)</li>
						<li>Rate limit violations</li>
					</ul>

					<p>We're here to help legitimate developers. Reply to this email if you need assistance.</p>
				</div>
			</div>
		</body>
		</html>
	`;

	const textBody = `
API KEY SUSPENDED

Your API key has been temporarily suspended due to suspicious activity.

Reason: ${reason}
Abuse Score: ${abuseScore}/100
API Key: ${apiKey.substring(0, 20)}...

What This Means:
- Your API key is currently inactive
- API requests will return an error
- This may be a false positive if you experienced legitimate high traffic

How to Resolve:
1. Review your recent API usage
2. Ensure domain verification is complete
3. Check for unauthorized use of your key
4. Contact support at ${env.EMAIL_REPLY_TO}

If this was triggered by legitimate high traffic, reply with details and we'll reactivate your key.

Common Triggers:
- Sudden 5x traffic increase
- Requests from non-whitelisted domains
- High error rates
- Rate limit violations
	`;

	return await sendEmail(
		env,
		email,
		"⚠️ Your MyPasswordChecker API Key Has Been Suspended",
		htmlBody,
		textBody
	);
}

/**
 * Send reactivation confirmation to developer
 */
async function sendReactivationEmail(env, email, apiKey, reason) {
	const htmlBody = `
		<!DOCTYPE html>
		<html>
		<head>
			<style>
				body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
				.container { max-width: 600px; margin: 0 auto; padding: 20px; }
				.header { background: #4caf50; color: white; padding: 20px; text-align: center; }
				.content { padding: 30px; background: #e8f5e9; }
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<h1>✅ API Key Reactivated</h1>
				</div>

				<div class="content">
					<h2>Good News!</h2>
					<p>Your API key has been reactivated by our team.</p>
					<p><strong>Reason:</strong> ${reason || 'Manual admin review'}</p>
					<p>Your API key is now fully functional. Thank you for your patience!</p>
					<p>If you have any questions, reply to this email.</p>
				</div>
			</div>
		</body>
		</html>
	`;

	const textBody = `Good News! Your API key has been reactivated.

Reason: ${reason || 'Manual admin review'}

Your API key is now fully functional. Thank you for your patience!`;

	return await sendEmail(
		env,
		email,
		"✅ Your API Key Has Been Reactivated",
		htmlBody,
		textBody
	);
}

// ═══════════════════════════════════════════════════════════════
// END OF API WORKER
// ═══════════════════════════════════════════════════════════════
