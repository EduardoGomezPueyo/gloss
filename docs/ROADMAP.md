# Roadmap (v1)

Approved plan for building v1. Decisions and their reasons are in [`DECISIONS.md`](DECISIONS.md); behavior and the data model are in [`SPEC.md`](SPEC.md).

## Architecture

```
src/
  domain/        pure types and logic: progress, sorting, filters, status transitions,
                 glossary diff/versioning, moving items (tests next to each module)
  data/
    repositories/   interfaces (contracts)
    local/          IndexedDB implementation (Dexie) + schema and migrations
  services/
    ocr/            OcrProvider + TesseractOcrProvider
    export/         TranslationExporter + json/ + csv/ + registry
  ui/            reusable components (StatusIcon, PriorityIcon, PlatformChip,
                 AvatarStack, ProgressBar, Badge, Card, Popover, FilterMenu…)
  features/      projects/, project-detail/, section/, editor/, glossary/, settings/
  app/           router, providers, layouts, simulated current-user selector
  i18n/          interface translations (en, es)
```

- `features/` and `ui/` never import storage implementations (enforced by ESLint). Data access goes through a `RepositoryProvider` (context) that injects the implementations, with TanStack Query on top.
- `VITE_DATA_SOURCE=local|remote` selects the implementation. `local` (IndexedDB) is the default and is what the public demo uses; Supabase is the planned v2 reference backend.
- OCR: an `OcrProvider` interface returning `{ text, blocks: [{ text, bbox, confidence }] }`; v1 uses Tesseract.js in a Web Worker. Box positions are stored even though v1 does not use them.
- Markdown: CodeMirror 6 to edit (syntax stays visible, as in the design), `react-markdown` + remark to render, `diff` (jsdiff) for version comparison.
- Export: a `TranslationExporter` interface with `JsonExporter` and `CsvExporter` adapters, registered in a format registry.

## Phases

Vertical phases; the app stays runnable after each one.

- [x] **0. Foundation:** scaffold, Figma tokens, shell (sidebar with disabled entries, Settings layout), avatar menu with theme and language, i18n (en/es), lint/test, `DECISIONS.md`, `CLAUDE.md` stack and commands.
- [x] **1. Data model and data access:** domain types, repository interfaces, Dexie implementation, coherent fictional seed, simulated current-user selector. Tests for progress, statuses and sorting.
- [x] **2. Project list and create project:** table, search, filters (menu, submenus, removable chips, Clear all), sorting, per-language progress popover, modal with managers and languages. Tests for filters and sorting.
- [x] **3. Project and section detail:** overview, collapsible sections, Languages Progress, Add section and Add language; content items with search, filter, multi-select and Move to section. Tests for moving items.
- [x] **4. Images and OCR:** "Add content to section" modal (3 states, dnd-kit) and OCR. *Before starting: propose what the design is missing (SPEC open decision 3).*
- [x] **5. Translation editor:** three columns, autosave, editable source text with "edited", language cards, comparison, threaded comments and Submit for review. *Before starting: status transitions (open 1) and the glossary panel (open 7).*
- [x] **6. Glossary:** overview, category filter, list view (designed together), detail, editing with CodeMirror, history and the Compare versions page. Tests for versions and diff.
- [x] **7. Settings > Members** (local, no sub-teams): search, filter by category, change category, Remove and Invite (*Invited* status).
- [x] **8. Export to code:** JSON and CSV. *Before starting: propose the JSON schema and where the CSV goes (open 5).* Tests for the exporters.
- [x] **9. Polish and demo** (order agreed 2026-10-23):
  - [x] A. Demo outside the repository, app starts empty (D34).
  - [x] B. License AGPL-3.0 (D35).
  - [x] C. Code-splitting: every page is lazy; React, data, UI and CodeMirror in separate chunks (first load ~236 kB gzip, was 277 kB in one file).
  - [x] E. Vercel deployment at https://gloss-app.vercel.app (formerly translator-tool-six.vercel.app, kept as an alias) (redeploys on every push to `main`; `VITE_DEMO_URL` set in the project settings).
  - [x] D. Screen-by-screen fidelity review against Figma, with the author (2026-10-24): project list, project and section detail, Add content, glossary (5 frames) and Settings > Members. Also added on request: editing project details from the Overview (D38) and a two-column "Add new project" modal (D39). **Exception:** the Translator view was redesigned by the author instead and rebuilt from their mockup on 2026-10-25 (D40).
- [x] **10. Pages without a design** (D37), each designed in code from a short spec the author approves, and added to the demo data:
  - [x] Comments (D43, with the shared inbox layout), 2026-10-25
  - [x] Assigned to me (D44, with assignments per item and language and the managers' To review tab), 2026-10-25
  - [x] Notifications (D45, an activity log with a read state per person and an unread count in the navigation), 2026-10-25
  - [x] Settings > General (with the project visibility setting, D41) and Settings > Workspace projects (D42), 2026-10-25
  - [x] Final demo pass and redeploy (2026-10-25): the demo repository adds comment threads with replies and @mentions, assignments per item and language, and notifications derived with the app's rules; images no longer carry a context note

## Beyond v1: open for contributors

v1 is complete and the author has no plans to build these. They are left as notes for anyone who wants to take them on; the code is laid out so each one plugs in without rewriting the UI.

- **A real backend.** Implement the repository interfaces in `src/data/repositories/types.ts` and select them with `VITE_DATA_SOURCE=remote` (`src/app/dataSource.ts` throws a "not implemented" error until then). Supabase was the planned reference (D2): Postgres, auth, file storage and realtime, open source and self-hostable.
- **Teams for real** (needs the backend): sign-in, email invitations, permissions enforced on the server instead of the simulated current-user selector, notifications and live sync between people (SPEC, v2).
- **More file formats.** PO and XLIFF export as new `TranslationExporter` adapters in `src/export/registry.ts` (D33), and importing those formats (SPEC, v2).
- **Other OCR engines.** A new `OcrProvider` (`src/ocr`); the position of each text box is already stored, though v1 does not use it.
- **Further out** (SPEC, Future): Kanban and Timeline views in project management, and media other than video games.

AI translation and showing the translated text over the image were discarded, not postponed.

## Verification

- Per phase: `npm run dev` and walk through the phase's flow against the Figma frame. `npm test`, `npm run lint` and `npm run build` pass.
- Persistence: reloading the browser keeps changes; if IndexedDB is cleared, the app starts again with an empty workspace (the demo is loaded on demand, D34).
- OCR (phase 4): upload an original test image with text and check that the text, boxes and editing with "edited" work.
- Export (phase 8): the downloaded file validates against the agreed schema.
