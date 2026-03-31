@AGENTS.md

# Moo-tual Fund

## Commands
- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

## Structure
```
src/
  app/          # Next.js App Router pages
  components/   # React components
  lib/          # Utilities, Supabase client, helpers
  middleware.ts # Auth/routing middleware
supabase/       # Supabase config and migrations
```

## Project Stack
- Next.js 16 (App Router) + React 19
- Supabase (auth via @supabase/ssr)
- Tailwind CSS v4 + shadcn/ui + class-variance-authority
- Lucide icons, sonner for toasts, next-themes for dark mode

## Conventions
- Use shadcn/ui components and design tokens for all UI
- Use `clsx` + `tailwind-merge` via the project's `cn()` utility for class merging
- Verify build passes after significant changes: `npm run build`
