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
    seed/           coherent fictional demo project
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
- [ ] **8. Export to code:** JSON and CSV. *Before starting: propose the JSON schema and where the CSV goes (open 5).* Tests for the exporters.
- [ ] **9. Polish and demo:** screen-by-screen fidelity review against Figma and Vercel deployment.

## Verification

- Per phase: `npm run dev` and walk through the phase's flow against the Figma frame. `npm test`, `npm run lint` and `npm run build` pass.
- Persistence: reloading the browser keeps changes; if IndexedDB is cleared, the seed is regenerated.
- OCR (phase 4): upload an original test image with text and check that the text, boxes and editing with "edited" work.
- Export (phase 8): the downloaded file validates against the agreed schema.
