# Email setup — Resend (P6)

The `sendEmail()` helper used to target Cloudflare Email Workers
(`env.EMAIL.send()`), but the `[[send_email]]` binding was never set up,
so every email-bearing endpoint (`/api/dashboard/send-verification`,
`/api/verify-email`, the admin "resend verification") was silently
no-op'ing. P6 swaps the implementation to a Resend HTTP call.

Resend pricing (build prompt §6):
- Free: 3,000 emails/mo, 100/day.
- Paid: $20/mo for 50k. No per-email cost below that.

## 1. Sign up + verify your sending domain

1. Sign up at resend.com.
2. Add `mypasswordchecker.com` as a sending domain.
3. Resend gives you 3 DNS records (SPF, DKIM, return-path). Add them
   on the `mypasswordchecker.com` zone in Cloudflare.
4. Wait for Resend to report "verified" — usually a few minutes.

## 2. Issue an API key

Resend dashboard → API Keys → Create. Scope it to **Send only**
(narrower blast radius if it leaks). Copy the `re_…` key.

## 3. Configure the worker

```bash
npx wrangler secret put RESEND_API_KEY --config wrangler.toml
# Optional — defaults below if not set:
#   EMAIL_FROM     = "noreply@mypasswordchecker.com"
#   EMAIL_REPLY_TO = "support@mypasswordchecker.com"
```

`EMAIL_FROM` and `EMAIL_REPLY_TO` are already read by `sendEmail` —
keep them as `[vars]` in `wrangler.toml` (they're not secrets).

## 4. Test

Easiest path: register a brand-new account via the dashboard's email
form. The worker emails a 6-digit verification code; check the inbox
of the email you registered.

You can also re-trigger one from the admin panel:
**Admin → Unverified users → Resend** posts to
`/api/admin/resend-verification`.

If sending fails, the worker logs the Resend response body via
`logAudit({event: 'email_send_failed', ...})` — check audit logs.
