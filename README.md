# 🐄 Moo-tual Fund

A dead-simple Next.js app for splitting a whole steer among Aussie households. Track the cow's journey, claim your slots, pick your cuts, and pay up — no drama.

## Getting Started

### 1. Set up Supabase

Create a [Supabase](https://supabase.com) project, then run `supabase/schema.sql` in the SQL editor to create all tables and seed data.

Create an admin user in Supabase Auth (Authentication → Users → Add user) with email and password.

### 2. Configure Environment

Copy `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SESSION_SECRET=any-random-string
```

### 3. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Deploy

Push to GitHub and connect to [Vercel](https://vercel.com). Add env vars in project settings.

## How It Works

- **Admin** logs in via Supabase Auth (email/password) at `/login → Admin login`
- **Households** get a 6-digit PIN from the admin, enter it at `/login`
- Admin creates households, manages cuts, tracks expenses/payments at `/admin`
- Households claim slots, view their cuts, pick mince prep options at `/my-order`
- Everyone sees the full cost breakdown at `/costs`

## Tech Stack

- Next.js 15 (App Router)
- Supabase (Postgres + Auth)
- Tailwind CSS v4 + shadcn/ui
- TypeScript
