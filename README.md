# Translator

A video game translation tool that brings together the **game scene** (images with the original text, read by OCR), **world knowledge** (a per-project Markdown glossary) and **peer review**.

> Status: early development (v1, local-first showcase). See [`docs/SPEC.md`](docs/SPEC.md) for the specification and [`docs/DECISIONS.md`](docs/DECISIONS.md) for technical decisions.

## Getting started

Requires Node.js 20 or later.

```bash
npm install
npm run dev      # http://localhost:5173
```

| Command | Description |
|---|---|
| `npm run dev` | Development server |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm run build` | Production build into `dist/` |

## How data is stored

The app is **local-first**: everything is stored in your browser (IndexedDB). The public demo works the same way, so each visitor gets a private sandbox.

All data access goes through repository interfaces, so you can plug in a backend without rewriting the UI. `VITE_DATA_SOURCE` (see `.env.example`) selects the implementation: `local` (the default) or `remote`. A Supabase reference adapter is planned for v2.

## Interface languages and themes

The interface is available in **English** and **Spanish** (`src/i18n/locales`), with **dark** and **light** themes. Both switches are in the menu that opens from the avatar at the bottom of the sidebar.

## Project structure

```
src/
  app/        router, layouts, providers (theme)
  features/   one folder per screen area (projects, settings, …)
  ui/         small reusable components
  i18n/       interface translations (en, es)
  styles/     design tokens and global styles
  assets/     icons exported from the design
```
