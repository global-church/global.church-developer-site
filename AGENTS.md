# Repository Guidelines

## Project Structure & Module Organization
- `src/app`: Next.js App Router pages (e.g., `church/[id]/page.tsx`).
- `src/components`, `src/hooks`, `src/lib`: UI, hooks, and utilities. Import via `@/*` path alias.
- `public`: static assets (e.g., `gc-logo.png`, `custom.geo.json`).
- `supabase/functions`: Edge functions (Deno) such as `churches-search`.
- `globalchurch-api-gateway`: Zuplo API gateway (own workspace and scripts).
- `reference_docs`: local prompts/docs for development.

## Build, Test, and Development Commands
- Web app (root):
  - `npm run dev`: start Next.js dev server (Turbopack) on 3000.
  - `npm run build`: production build.
  - `npm start`: run built server.
  - `npm run lint`: lint with Next/ESLint config.
- API gateway (`globalchurch-api-gateway`):
  - `npm run dev`: run Zuplo locally.
  - `npm test`: run Zuplo tests.
- Supabase (optional, if CLI installed):
  - `supabase functions serve churches-search` in `supabase/functions/churches-search`.

## Coding Style & Naming Conventions
- TypeScript strict; prefer explicit types at boundaries.
- Indentation: 2 spaces; single quotes; trailing commas where valid.
- React components: PascalCase in `src/components` (e.g., `LeafletMapInner.tsx`).
- Routes: Next.js conventions (e.g., `src/app/church/[id]/page.tsx`).
- Modules/functions/constants: `camelCase` / `SCREAMING_SNAKE_CASE` as appropriate.
- Linting: ESLint extends `next/core-web-vitals` and `next/typescript`.
- Styling: Tailwind CSS v4; keep tokens in CSS variables; prefer utility classes.

## Testing Guidelines
- Web app: no formal test suite yet—ensure `npm run lint` passes and verify key user flows locally.
- API gateway: add/maintain tests under the Zuplo setup; run `npm test` in the gateway folder.

## Commit & Pull Request Guidelines
- Commits: concise, present tense; include scope when helpful (e.g., "explorer: sync filters to URL").
- PRs: clear description, linked issues, screenshots for UI changes, and notes on API/schema impacts. Update docs in `reference_docs` or gateway `docs` when relevant.

## Security & Configuration Tips
- Env vars: use `.env.local` (never commit secrets). Check `next.config.ts` and image allowlist when adding remote assets.
- Data sources: follow Supabase and Zuplo config; avoid hardcoding tokens.
