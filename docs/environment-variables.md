# Environment Variables

## Frontend (Vite)

All frontend env vars must be prefixed with `VITE_`.

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key | Yes | `eyJhbGci...` |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ref | Yes | `xxxxx` |

> These are automatically managed by Lovable Cloud. For self-hosting, copy `.env.example` to `.env`.

## Backend (Edge Functions)

These are available as `Deno.env.get("KEY")` in edge functions.

### Auto-Provided by Supabase
| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Internal Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (full access) |
| `SUPABASE_ANON_KEY` | Anon key (RLS-restricted) |

### Custom Secrets
| Variable | Description | Status |
|----------|-------------|--------|
| `LOVABLE_API_KEY` | Lovable email API key | ✅ Configured |
| `STRIPE_SECRET_KEY` | Stripe API key | ❌ Not yet needed |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | ❌ Not yet needed |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | ❌ Not yet needed |

## Environment Separation

| Setting | Local | Staging | Production |
|---------|-------|---------|------------|
| Supabase URL | Local or dev project | Staging project | Production project |
| Email sending | Disabled/sandbox | Test domain | `notify.one-bizz.com` |
| Stripe mode | Test keys | Test keys | Live keys |
| Google OAuth | Test credentials | Test credentials | Production credentials |

## Security Rules

- ❌ Never hardcode secrets in source code
- ❌ Never commit `.env` files
- ✅ Use `.env.example` as a template
- ✅ Use Lovable Cloud secrets for edge function keys
- ✅ Only `VITE_*` publishable keys appear in frontend code
