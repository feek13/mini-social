# Repository Guidelines

## Project Structure & Module Organization
- `app/` hosts Next.js routes; feature folders (for example `app/post`, `app/profile`) bundle their `page.tsx`, `loading.tsx`, and client components.
- Shared UI stays in `components/`, hooks in `hooks/`, and helpers in `lib/`.
- Add project-wide typings to `types/` and static assets to `public/`.
- Update `supabase-*.sql`, `SUPABASE_SETUP.md`, and `NOTIFICATIONS-SETUP.md` whenever the schema changes.

## Build, Test, and Development Commands
- `npm run dev` starts the dev server with hot reload.
- `npm run build` outputs a production build; `npm run start` serves that build.
- `npm run lint` runs ESLint 9 with the Next.js + Tailwind config—fix issues before pushing.
- Prepare `.env.local` via `SUPABASE_SETUP.md` so Supabase URL/keys resolve for all commands.

## Coding Style & Naming Conventions
- Write TypeScript everywhere; prefer server components and add `"use client"` only when interaction or browser APIs require it.
- Keep two-space indentation, semicolons, and double quotes to match the generated Next.js formatting.
- Use PascalCase for component files (`components/PostComposer.tsx`), camelCase `use`-prefixed hooks, and verb-based names for helpers (`lib/createPost.ts`).
- Co-locate Tailwind utility strings inside JSX, and centralize shared tokens in `app/globals.css`. Mirror environment variables between `.env.local` and the Supabase project.

## Testing Guidelines
- No runner ships with the repo; discuss additions before installing Jest, Vitest, or Playwright.
- Name new tests `*.test.tsx` and store them alongside the code they cover.
- Mock Supabase calls so CI can run without live credentials; seed a local project for manual verification.
- Until automated coverage exists, run `npm run lint` and smoke-test sign-in, posting, and notifications.

## Commit & Pull Request Guidelines
- Follow Conventional Commits as seen in history (`fix: 优化删除确认对话框体验`, `docs: 更新项目 README 文档`).
- Write imperative, concise messages in English or Chinese; squash noisy WIP commits.
- PRs should state the problem, the approach, Supabase migration impacts, and include UI screenshots when visuals change.
- Confirm `npm run lint` passes and update docs (`README.md`, setup guides) whenever behavior or configuration shifts.

## Supabase & Configuration Tips
- Keep credentials in `.env.local` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, optional `SERVICE_ROLE_KEY`) and never commit them.
- Use `SUPABASE_SETUP.md` to provision tables and append new SQL files next to existing migrations.
- Document trigger or function updates in `NOTIFICATIONS-SETUP.md` so teammates can replay them.
- For local debugging, point the app at a staging Supabase instance or run the Supabase CLI with a seeded database.
