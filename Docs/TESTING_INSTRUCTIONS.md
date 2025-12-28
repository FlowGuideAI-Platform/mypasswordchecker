# 🧪 Testing Instructions - Square Integration Complete

**Status:** ✅ All code deployed and ready to test
**Dashboard URL:** https://mypasswordchecker.com/dashboard
**Latest Deployment:** https://9698bbf8.mypasswordchecker.pages.dev/dashboard

---

## ✅ What Was Implemented

### Backend (API):
1. ✅ Session-based authentication (httpOnly cookies, 24-hour expiration)
2. ✅ Square Payments integration (checkout + webhooks)
3. ✅ Login/Logout endpoints
4. ✅ Updated usage endpoint to support both session and API key auth
5. ✅ D1 database with sessions table

### Frontend (Dashboard):
1. ✅ Secure login form (no more localStorage API keys)
2. ✅ Three upgrade buttons: Standard ($19), Quantum ($150), Single Query ($1)
3. ✅ Session-based authentication check on page load
4. ✅ Payment success handling

### Pricing Confirmed:
- **Standard:** $19/mo for 3,000 password checks
- **Quantum Monthly:** $150/mo for 15,000 password checks + 1,500 quantum queries
- **Single Quantum:** $1 per query (no subscription needed)

---

## 🧪 Test 1: Login to Dashboard

### Steps:
1. Go to https://mypasswordchecker.com/dashboard
2. You should see a login form (not dashboard directly)
3. Click **"Enter it here"** link
4. Enter Jack's API key: `mpc_d79845a579621bb93566a30361cb3001586fb96f6825cfa5`
5. Click **"Load Dashboard"**
6. Page should reload and show dashboard with Jack's data

### Expected Result:
- ✅ Dashboard loads showing "Quantum Monthly" plan
- ✅ Usage shows 15,000 Tier 1 quota, 1,500 Tier 2 quota
- ✅ Three upgrade buttons visible
- ✅ API key hidden as "(hidden for security)"

### If It Fails:
- Check browser console for errors
- Try clearing cookies and trying again
- Verify API deployed correctly

---

## 🧪 Test 2: Square Checkout - Single Quantum Query ($1)

### Steps:
1. While logged in, click **"Try Single Quantum Query ($1)"** button
2. Confirm the prompt
3. Should redirect to Square Sandbox payment page
4. Enter Square test card:
   - **Card Number:** `4111 1111 1111 1111`
   - **Expiration:** Any future date (e.g., `12/25`)
   - **CVV:** `111`
   - **ZIP:** `12345`
5. Click **"Pay $1.00"**
6. Should redirect back to dashboard with `?success=true`
7. Alert should show: "Payment successful! Your plan has been upgraded."

### Expected Result:
- ✅ Square checkout page loads
- ✅ Payment processes successfully
- ✅ Redirects back to dashboard
- ✅ Success message displays

### What Happens Behind the Scenes:
1. Square sends webhook to `POST /api/webhooks/square`
2. Webhook finds user by email (`jack@mypasswordchecker.com`)
3. Since amount is $100 (cents), plan stays same (single purchase, not subscription)
4. Payment logged to D1 audit log

---

## 🧪 Test 3: Square Checkout - Standard Plan ($19)

### Steps:
1. Click **"Upgrade to Standard ($19/mo)"** button
2. Confirm prompt
3. Enter same Square test card details
4. Complete payment
5. Redirect back to dashboard

### Expected Result:
- ✅ Payment processes
- ✅ Webhook updates plan to "standard" in D1
- ✅ Dashboard shows updated plan (may need refresh)

### Verify in Database:
```bash
cd /Users/jack/Projects\ -\ Xcode/MyPasswordChecker.com/mypasswordchecker
wrangler d1 execute mypasswordchecker-db --remote --command="SELECT plan, square_payment_id FROM api_keys WHERE email='jack@mypasswordchecker.com'"
```

Should show:
```
plan: standard
square_payment_id: <payment_id>
```

---

## 🧪 Test 4: Logout

### Steps:
1. Open browser developer tools → Application → Cookies
2. Find cookie named `mpc_session`
3. In dashboard, manually call logout:
   ```javascript
   fetch('/api/auth/logout', {method: 'POST', credentials: 'include'}).then(() => location.reload())
   ```
4. Page should reload and show login form again

### Expected Result:
- ✅ Session cookie deleted
- ✅ Dashboard no longer accessible
- ✅ Login form shows

---

## 🔍 Debugging Tools

### Check Session Cookie:
1. Open DevTools → Application → Cookies
2. Look for `mpc_session` cookie
3. Should be:
   - HttpOnly: ✅ Yes
   - Secure: ✅ Yes
   - SameSite: ✅ Strict
   - Max-Age: 86400 (24 hours)

### Check API Logs:
```bash
wrangler tail --format pretty
```

Then perform actions and watch logs in real-time.

### Check D1 Database:
```bash
# Check sessions
wrangler d1 execute mypasswordchecker-db --remote --command="SELECT * FROM sessions WHERE customer_id='cust_a3786d0e56c49b955f17dd315b897a80'"

# Check audit logs
wrangler d1 execute mypasswordchecker-db --remote --command="SELECT * FROM audit_logs WHERE customer_id='cust_a3786d0e56c49b955f17dd315b897a80' ORDER BY created_at DESC LIMIT 10"

# Check payments
wrangler d1 execute mypasswordchecker-db --remote --command="SELECT * FROM api_keys WHERE email='jack@mypasswordchecker.com'"
```

---

## 🔗 Set Up Square Webhook (Final Step)

To make webhooks work automatically:

1. Go to https://developer.squareup.com/apps
2. Click your app
3. Click **"Webhooks"** in left sidebar
4. Click **"Add Endpoint"**
5. Enter:
   - **Endpoint URL:** `https://mypasswordchecker.com/api/webhooks/square`
   - **Events:** Select `payment.updated`
6. Click **"Save"**
7. Copy the **Signature Key** (starts with `SIG_...`)
8. Add to Workers:
   ```bash
   wrangler secret put SQUARE_WEBHOOK_SIGNATURE_KEY
   # Paste the signature key when prompted
   ```

**Note:** Webhook signature verification is optional for testing. The webhook will work without it, but adding the signature key makes it more secure.

---

## 💰 Profit Analysis (from earlier)

### Single Quantum Query ($1):
- Revenue: $1.00
- Square fee: $0.33 (2.9% + $0.30)
- Cloudflare cost: ~$0.00001 (negligible)
- **Profit: $0.67 (67% margin)** ✅

### Standard Plan ($19/month):
- Revenue: $19.00
- Square fee: $0.85
- Cloudflare cost: $0.03 (3,000 requests × $0.00001)
- **Profit: $18.12 (95.4% margin)** ✅

### Quantum Monthly ($150/month):
- Revenue: $150.00
- Square fee: $4.65
- Cloudflare cost: $0.165 (16,500 requests × $0.00001)
- **Profit: $145.18 (96.8% margin)** ✅

**Cloudflare is essentially free!** Your main cost is Square's payment processing fees.

---

## ⚠️ Known Issues / Notes

### 1. API Key Login Is Not Ideal
Current login requires users to enter their API key. Better options:
- **Email Magic Link** (recommended): User enters email, gets login link
- **Email + Password:** Traditional but works
- **OAuth:** Google/GitHub login

Should we implement magic link login next?

### 2. No Logout Button in UI
Currently no visible logout button. Add one:
```html
<button class="btn btn-secondary" onclick="logout()">Logout</button>

<script>
async function logout() {
    await fetch('/api/auth/logout', {method: 'POST', credentials: 'include'});
    window.location.reload();
}
</script>
```

### 3. Plan Updates May Need Refresh
After Square payment, webhook updates D1 but dashboard may not reflect it immediately. User may need to refresh page to see updated plan.

---

## 🎯 What's Next?

### Option 1: Test Everything Now
Follow the test steps above and verify all works.

### Option 2: Improve Login UX
Implement email magic link instead of API key login.

### Option 3: Add More Features
- Logout button
- Payment history
- Invoice downloads
- Cancel subscription button

### Option 4: Go Live
- Switch Square from sandbox to production
- Update pricing page with live checkout links
- Launch! 🚀

---

## 📊 Testing Checklist

- [ ] Login with API key works
- [ ] Dashboard loads with session
- [ ] Usage data displays correctly
- [ ] Single Quantum checkout works ($1)
- [ ] Standard plan checkout works ($19)
- [ ] Quantum Monthly checkout works ($150)
- [ ] Payment success redirects back
- [ ] Webhook updates plan in D1
- [ ] Logout clears session
- [ ] Can't access dashboard without login

---

## 🆘 If Something Doesn't Work

1. **Check browser console** for JavaScript errors
2. **Check wrangler tail** for API errors
3. **Verify cookies** are being set (DevTools → Application → Cookies)
4. **Test API directly** with curl (see IMPLEMENTATION_COMPLETE.md)
5. **Ask me!** I'm here to help debug

---

**Ready to test?** Start with Test 1 (Login) and work through the list!

**Document Version:** 1.0
**Last Updated:** January 2025
**Status:** Ready for testing
