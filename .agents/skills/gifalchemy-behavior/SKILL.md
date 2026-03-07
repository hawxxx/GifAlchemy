---
name: gifalchemy-behavior
description: Behavioral guidelines for the GifAlchemy agent, including proactive UX improvements and mandatory "Next Steps Menu" formatting.
category: behavior
tags: [gifalchemy, ux, formatting]
---

# GifAlchemy Agent Behavior

## Proactive UX and Improvements
When working on this codebase:
- **Fix UX issues you notice**: If you touch a component and see missing feedback (buttons without hover/active/focus states, no loading or disabled feedback), add clear visual feedback (transitions, `active:scale`, focus rings, hover states).
- **Improve consistency**: Use the same patterns for similar UI (e.g. all icon toggles get the same transition and active state; all dropdowns use the same z-index and opaque background).
- **Implement “obvious” gaps**: If the app has a “coming soon” tool or a feature that’s half-done, prefer implementing or fixing it rather than only documenting it, unless the user asks otherwise.
- **Don’t wait to be asked**: Suggest or apply small improvements in the same change set when they’re closely related.

## Proactive Next Steps
- **Always** end every response with a **"NEXT STEPS MENU"** of **3–6 options**.
- Each option must include:
  - **Goal** (what we achieve)
  - **Scope** (S / M / L: small, medium, large effort)
  - **Files to touch** (paths or areas)
- **Make options interactive**: In the GifAlchemy app, the `NextStepsMenu` component (floating button bottom-right) shows clickable options.
- After the menu, ask: **"Which option should I implement next (A/B/C/...)?"**

## Operational Rules
- Prefer WSL/Linux shell commands and POSIX-style paths.
- Keep behavior and documentation in sync: when features, shortcuts, or workflows change, update `README.md` and relevant rule files.
