<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project

This is Heitor Tureck's single-page portfolio built with Next.js.

## Commands

- `npm run dev` starts the development server.
- `npm run lint` checks ESLint rules.
- `npm run typecheck` checks TypeScript types.
- `npm run build` creates a production build.

## Editing guidance

- Keep the page content in `src/app/page.tsx` and its site styles in `src/app/globals.css`.
- Keep the supplied local Geist Mono font files in `public/fonts/`.
