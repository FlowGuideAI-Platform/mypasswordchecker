# GitHub OAuth setup — one-time configuration for P4

The dashboard's "Sign in with GitHub" button lands here. Build prompt
§Phase 4 wires it end-to-end; this is the one-time GitHub App + secret
setup you need to do before it works in production.

## 1. Register a GitHub OAuth App

In github.com → **Settings** (personal) → **Developer settings** →
**OAuth Apps** → **New OAuth App**:

| Field | Value |
|---|---|
| Application name | MyPasswordChecker |
| Homepage URL | `https://mypasswordchecker.com` |
| Authorization callback URL | `https://mypasswordchecker.com/api/auth/github/callback` |

After creating, GitHub gives you:
- **Client ID** — public, fine in `wrangler.toml [vars]`
- **Client secret** — secret, store via `wrangler secret put`

## 2. Configure the worker

```bash
# Add to wrangler.toml [vars]:
#   GITHUB_CLIENT_ID = "Ov23li..."
# (the OAuth App's Client ID)

npx wrangler secret put GITHUB_CLIENT_SECRET --config wrangler.toml
```

## 3. Verify

Click "Sign in with GitHub" on https://mypasswordchecker.com/dashboard:
1. You're sent to `github.com/login/oauth/authorize`.
2. After consent, GitHub redirects to
   `/api/auth/github/callback?code=…&state=…`.
3. The worker validates `state` against `SESSION_CACHE`, exchanges
   `code` for a token, calls `https://api.github.com/user/emails` to
   find your **primary verified** email, looks up or creates a
   free-tier API key keyed on that email, and redirects to
   `/dashboard.html#token=<api_key>`.
4. The dashboard's load handler reads the hash, stores the key in
   localStorage, strips the hash, and loads usage data.

If state doesn't match → 401. If no verified primary email →
redirected to `/dashboard.html?error=no_email`.
