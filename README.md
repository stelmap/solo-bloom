# One Bizz — SaaS for Solo Professionals

A business management application for solo professionals (therapists, coaches, tutors, etc.) to manage clients, appointments, finances, and business analytics.

## Features

- 📅 **Appointment Management** — Calendar view, scheduling, recurring sessions
- 👥 **Client Management** — Client profiles, notes, file attachments
- 💰 **Financial Tracking** — Income, expenses, expected payments, taxes
- 📊 **Dashboard & Analytics** — Business metrics, break-even analysis
- 🔐 **Authentication** — Email/password, Google OAuth, password recovery
- 🌐 **Multi-language** — English and Ukrainian
- 📧 **Branded Emails** — Custom auth emails via `notify.one-bizz.com`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite 5 |
| UI | Tailwind CSS, shadcn/ui, Framer Motion |
| Data | TanStack React Query, Supabase JS SDK |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| Testing | Vitest (unit), Playwright (e2e) |

## Getting Started

### Prerequisites
- Node.js 18+
- npm or bun

### Setup
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Fill in your Supabase credentials in .env

# Start development server
npm run dev
```

The app runs at `http://localhost:8080`.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm test` | Run unit tests |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── components/       # Reusable UI components
│   └── ui/           # shadcn/ui primitives
├── contexts/         # React contexts (AuthContext)
├── hooks/            # Data hooks (useData.ts)
├── i18n/             # Translations (EN/UK)
├── integrations/     # Supabase client & types (auto-generated)
├── lib/              # Utilities
└── pages/            # Route pages

supabase/
├── functions/        # Edge Functions
├── migrations/       # Database migrations
└── config.toml       # Project config

docs/                 # Documentation
```

## Documentation

- [Architecture Overview](docs/architecture-overview.md)
- [Backend Services](docs/backend-services.md)
- [API Overview](docs/api-overview.md)
- [Billing Flow](docs/billing-flow.md) (planned)
- [Deployment Guide](docs/deployment-guide.md)
- [Environment Variables](docs/environment-variables.md)
- [Launch Checklist](docs/launch-checklist.md)
- [Known Risks](docs/known-risks.md)

## License

Private — All rights reserved.
