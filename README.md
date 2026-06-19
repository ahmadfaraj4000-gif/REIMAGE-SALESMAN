# RE IMAGE Salesman Portal

Standalone Vite + React portal for the RE IMAGE sales team.

## Workflow

- Salesman login / signup through Supabase Auth
- Application submission and status tracking
- Admin approval gate
- Guided onboarding with section completion tracking
- Final exam with an 85% passing score
- Dashboard unlock after approval, onboarding, and passing score
- Assigned leads, lead notes, follow-ups, invoice requests, QR requests, commissions, and resource PDFs

## Commands

```bash
npm run dev
npm run build
npm run preview
```

The dev server runs on port `5600`.

## Required Environment

Create `.env.local` with:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Run `supabase/sql/salesman_portal.sql` before using the portal.
