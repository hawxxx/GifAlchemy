# Repository Guidelines

## Project Structure & Module Organization
Core app routes live in `app/` (editor entry at `app/(editor)/editor/page.tsx`). Reusable UI is in `components/ui/`, editor-specific features are in `components/editor/`, and shared logic is in `hooks/` and `providers/`. Domain/application/infrastructure layers are under `core/`. Static assets and the GIF worker are in `public/` (`public/gif.worker.js`).

## Build, Test, and Development Commands
- `npm install` - install dependencies.
- `npm run dev` - start local dev server with Turbopack at `http://localhost:3000`.
- `npm run lint` - run ESLint (`next/core-web-vitals` + TypeScript rules).
- `npm run build` - production build.
- `npm start` - run the production build.

## Coding Style & Naming Conventions
Use TypeScript with strict checks (`tsconfig.json`). Prefer functional React components and hooks. Use 2-space indentation and keep files in kebab-case (example: `text-tool-panel.tsx`). Export component names in PascalCase and hook names with `use*` (example: `use-overlays.ts`). Use path alias imports via `@/*` when practical.

## Testing Guidelines
There is currently no dedicated automated test framework configured. Before opening a PR, run `npm run lint` and manually verify key flows in `/editor` (upload, timeline scrub, text overlay edits, and export). If adding non-trivial logic, include a brief manual test checklist in the PR.

## Commit & Pull Request Guidelines
Use Conventional Commits for all messages:

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

- `feat:` for new features (SemVer MINOR).
- `fix:` for bug fixes (SemVer PATCH).
- `BREAKING CHANGE:` footer, or `!` after type/scope (for example `feat(api)!:`), for breaking changes (SemVer MAJOR).
- Other allowed types include `build:`, `chore:`, `ci:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`.
- Optional scope must be a noun in parentheses, for example `fix(editor):`.
- Description must follow `type/scope: ` on the first line.
- Body is optional and starts after one blank line.
- Footers are optional and start after one blank line; use trailer style like `Refs: #123` or `Reviewed-by: Name`.
- Footer token `BREAKING CHANGE` must be uppercase; `BREAKING-CHANGE` is also accepted.

Keep commits focused and descriptive. When requested, split separate implementations/features into separate commits (one feature/implementation per commit). PRs should include:
- concise summary of behavior changes,
- linked issue/task (if available),
- screenshots or GIFs for UI changes,
- validation notes (lint + manual checks performed).

## Security & Configuration Tips
Do not commit secrets; keep environment values in `.env`/`.env*.local` only. Avoid editing generated/bundled worker code unless intentionally updating the GIF pipeline.
