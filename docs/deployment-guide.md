# Deployment Guide

## Hosting

This application is hosted on **Lovable** with a Supabase backend (Lovable Cloud).

### Frontend Deployment
- Frontend deploys via the **Publish** button in the Lovable editor
- Published to `*.lovable.app` subdomain
- Custom domains can be added after publishing

### Backend Deployment
- Database migrations deploy **automatically** when created
- Edge functions deploy **automatically** when saved
- No manual backend deployment needed

## Environment Configuration

### Frontend Environment Variables
Managed automatically by Lovable Cloud:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase API URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project reference |

### Backend Secrets (Edge Functions)
Managed via Lovable Cloud secrets:

| Secret | Description | Required |
|--------|-------------|----------|
| `SUPABASE_URL` | Auto-provided | ✅ Auto |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-provided | ✅ Auto |
| `LOVABLE_API_KEY` | Email sending API key | ✅ Auto |
| `STRIPE_SECRET_KEY` | Stripe API key | ❌ Not yet |
| `GOOGLE_CALENDAR_CLIENT_ID` | Google API | ❌ Not yet |

## Self-Hosting

To self-host, see the [Lovable self-hosting guide](https://docs.lovable.dev/tips-tricks/self-hosting).

### Requirements
- Node.js 18+
- Supabase project (or self-hosted Supabase)
- Environment variables configured

### Steps
1. Clone the repository from GitHub
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in values
4. Run development server: `npm run dev`
5. Build for production: `npm run build`
6. Serve the `dist/` folder with any static hosting

### Database Setup
1. Create a Supabase project
2. Run all migrations from `supabase/migrations/` in order
3. Deploy edge functions from `supabase/functions/`
4. Configure auth providers (email, Google OAuth)
5. Create storage bucket `client-attachments` with RLS

## CI/CD Integration

The GitHub-synced repository supports standard CI/CD:

```yaml
# Example GitHub Actions workflow
name: Build & Test
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - run: npm test
```

## Monitoring

- **Email delivery:** Check `email_send_log` table for delivery status
- **Auth events:** Supabase Auth logs (via Lovable Cloud dashboard)
- **Edge function errors:** Lovable Cloud → Edge Function Logs
