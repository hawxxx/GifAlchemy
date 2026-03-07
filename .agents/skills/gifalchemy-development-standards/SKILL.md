---
name: gifalchemy-development-standards
description: Technical standards for GifAlchemy, covering Next.js 15, TypeScript, Shadcn UI, and modular architecture.
category: development
tags: [nextjs, typescript, shadcn, tailwind]
---

# GifAlchemy Development Standards

## Code Style and Structure
- **TypeScript**: Write concise, technical code with accurate examples.
- **Patterns**: Use functional and declarative patterns; avoid classes.
- **Modularization**: Favor iteration and small modules (max 150 lines) over duplication.
- **Naming**: Descriptive variable names with auxiliary verbs (`isLoading`, `hasError`). Lowercase with dashes for directories (`components/auth-wizard`).
- **Function Parameters**: Adopt RORO (Receive an Object, Return an Object) for parameters/returns.

## Tech Stack & Framework
- **Next.js 15+**: Leverage App Router, React Server Components (RSC), and SSR.
- **Minimal Client-Side**: Minimize `'use client'`, `useEffect`, and `setState`.
- **UI**: Tailwind CSS, Shadcn UI, Radix UI. Mobile-first approach.
- **State Management**: Zustand for global state, TanStack React Query for data fetching.
- **Validation**: Zod for schema validation.
- **PWA**: Maintain Progressive Web App structure and offline capabilities.

## Architecture Guidelines
- Keep overlay/keyframe/effect logic in `core/application/commands` and `core/infrastructure/processors`.
- Avoid putting frame-index or export logic in components.
- Favor named exports for components.

## Premium UI Design Standards
- **Aesthetic**: Aim for "Ultra-Premium SaaS" (Figma, Spline, Linear).
- **Core Palette**: Deep dark backgrounds (`#0a0a0a`), subtle borders (`white/5` or `white/10`), and high-contrast accents (Primary orange/coral).
- **Glassmorphism**: Use `backdrop-blur-xl` combined with semi-transparent backgrounds (`bg-black/40` or `bg-white/[0.02]`) for panels and modals.
- **Micro-Interactions**: Every interactive element must have states:
  - `transition-all duration-200`
  - `hover:bg-white/10` or `hover:border-white/20`
  - `active:scale-[0.98]` or `active:scale-95`
- **Typography**: 
  - Use `Label` with `text-[10px] uppercase tracking-widest font-bold text-white/40` for section headers.
  - Use `text-xs font-medium text-white/90` for main content and inputs.
- **Sectioning**: Use thin top borders with inset shadows for dividers: `shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border-t border-white/5 pt-1`.
- **Zero-State Polish**: Empty states should be consistently styled with dashed borders: `rounded border border-dashed border-white/10 bg-black/20 px-3 py-6 text-center text-[11px] font-medium text-white/40`.
- **Custom Scrollbars**: Use `.custom-scrollbar` class for narrow, elegant scrollable areas.

