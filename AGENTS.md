# Repository Guidelines

## Project Structure & Module Organization
Keep page logic inside feature folders under `app/`; each route directory should bundle its `page.tsx`, `loading.tsx`, route handlers, and any client components it owns. Shared UI lives in `components/`, hooks in `hooks/`, reusable helpers in `lib/`, and TypeScript contracts in `types/`. Static assets reside in `public/`, while database migrations stay alongside the existing `supabase-*.sql` files. Update `SUPABASE_SETUP.md` and `NOTIFICATIONS-SETUP.md` whenever schema or trigger behavior changes so agents can bootstrap the project without guesswork.

## Build, Test, and Development Commands
Use `npm run dev` for local development with hot reload, and `npm run build` followed by `npm run start` to verify the production bundle. Run `npm run lint` before opening a pull request; it executes ESLint 9 with the Next.js + Tailwind rules. Provision `.env.local` exactly as documented in `SUPABASE_SETUP.md` so Supabase credentials resolve for every command.

## Coding Style & Naming Conventions
Author all source files in TypeScript. Default to server components; add `"use client"` only when browser APIs or local state are required. Stick to two-space indentation, semicolons, and double quotes. Name React components with PascalCase (`components/PostComposer.tsx`), hooks with `use`-prefixed camelCase (`hooks/useProfile.ts`), and helper utilities as verbs (`lib/createPost.ts`). Keep Tailwind classes colocated with JSX and centralize recurring tokens in `app/globals.css`.

## Testing Guidelines
No automated test runner ships by default, so coordinate before introducing Jest, Vitest, or Playwright. When adding coverage, co-locate files as `*.test.tsx` beside the code they validate. Mock Supabase interactions and seed a local instance for manual QA. Until richer coverage exists, rely on `npm run lint`, then smoke-test authentication, posting, and notifications flows before shipping.

## Commit & Pull Request Guidelines
Follow Conventional Commit syntax seen in history (for example `fix: 优化删除确认对话框体验`). Keep messages imperative and concise in English or Chinese. PR descriptions should outline the problem, summarize the approach, call out Supabase migration impacts, and include UI screenshots whenever visuals change. Confirm `npm run lint` passes and touch onboarding docs (`README.md`, setup guides) if behavior or configuration shifts.

## Supabase & Configuration Tips
Store all credentials in `.env.local` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, optional `SERVICE_ROLE_KEY`) and keep them out of source control. Append new SQL migrations next to the existing `supabase-*.sql` files, and document trigger updates in `NOTIFICATIONS-SETUP.md`. For local debugging, point the app to staging Supabase or run the Supabase CLI with the provided seed data.
