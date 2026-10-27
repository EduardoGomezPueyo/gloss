# Gloss (translator software)

A video game translation tool that brings together the visual side (game scenes), world knowledge (a per-project glossary) and teamwork with peer review. The source text of each scene comes in through OCR on the images.

It is a portfolio project that will become **open source**. v1 is a local, single-user showcase, faithful to the Figma design. It does not have to be perfect, but it must be clean and well organized.

## Sources of truth

- **Figma** (via MCP): the **visual** truth and the most recent one. Screen structure, components, colors, typography, spacing and interface texts. The current frames are in the organized section of the file ("Final Screens").
- **`docs/SPEC.md`**: the truth for **behavior** and the data model (what each action does, statuses, rules, decisions). Read it before starting any task.
- **`docs/DECISIONS.md`**: decisions taken during construction and their reasons, plus the table of pending decisions. **`docs/ROADMAP.md`**: architecture and phases.
- **`docs/design/`**: design screenshots (local only, not in git). They are a backup and quick reference; **they may be earlier versions than Figma**. The mapping table is at the end of `SPEC.md`.
- **Design versions:** before building each screen, check the frame in Figma and **ask the user which version is current** if there are several versions (for example, the project detail, the filter menu or the glossary version comparison) or if a screenshot and Figma disagree. Do not assume a screenshot is the latest.
- If Figma and the spec contradict each other, or something is ambiguous, **ask and record the decision** in `docs/DECISIONS.md`; do not assume silently.
- Some screenshots show the **old navigation** (Projects, Glossary). The current one is in section 4 of `SPEC.md`.

## Current scope

- Work only on what is marked **v1** in `SPEC.md`.
- Users, roles and permissions are simulated with a current-user selector. Do not implement authentication, a backend, real invitation emails or notifications. Settings > Members is built locally only.
- Text detected by OCR is **edited by clicking on it** and shows an "edited" label if it changes. Do not build an image-by-image review step.
- Do **not** implement AI translation or the preview of the translated text over the image (it is discarded, not "for later").
- The pages without a design (Notifications, Assigned to me, Comments, General settings, Workspace projects) are built in phase 10, each from a short spec the author approves first (D37). Do **not** build sub-teams (D10).
- Do not build screens or features that are not in the design or the spec. Some flows are undesigned (the "Add content to section" modal has no confirm or item name, the action to edit the source text, the OCR status): propose a solution and wait for confirmation.

## Canonical vocabulary

- Hierarchy: Workspace > Project > Section (an act) > Content item > Image. One image = one text block; translation is done per image and language.
- Statuses: `Not started`, `In progress`, `Under Review`, `Completed`. If a screenshot says "Started", treat it as `In progress`.
- Priorities: `Urgent`, `High`, `Medium`, `Low`, `None`.
- A project has **one or more managers**, a **source language** (it does not count as a target language) and target languages.
- **Submit for review** acts on the section, even though the button is in a content item's editor.
- The glossary is **per project**, with **simplified Markdown entries** only (no per-language translation or "Approved" status), and it is not an item in the general navigation.
- Use the design's interface texts verbatim (in English) and always add their Spanish translation: the interface is available in English and Spanish.

## Architecture

- Data access **always** goes through an interface (repository/service). The UI never touches storage directly. Goal: swap local persistence for a backend in v2 without rewriting the UI.
- **Export to code** downloads a **JSON** file with the translations; CSV is also planned. Formats are implemented as separate adapters so others can add more (PO, XLIFF in v2). The JSON schema is undefined: propose it and wait for confirmation.
- OCR must sit behind its own interface (swappable provider) and its result must be correctable by hand. Store the position of each text box if the provider offers it, even though v1 does not use it.
- Think of the app as a web app, even if it is later packaged as a desktop app.

## Stack

Decided (see `docs/DECISIONS.md`): a **local-first** SPA deployed on Vercel, ready for a backend.
- Strict TypeScript + React 19 + Vite + React Router. Alias `@/` → `src/`.
- Styling: Tailwind CSS v4. The semantic tokens in `src/styles/tokens.css` (dark theme from Figma, proposed light theme) are exposed as utilities (`bg-surface`, `text-text-secondary`…). **Never** put raw colors in components.
- Accessible primitives: Radix UI (`radix-ui`). Figma icons live in `src/assets/icons` as SVG components (`?react`) using `currentColor`.
- i18n: i18next. **Interface in English and Spanish**: every text goes through a key in `src/i18n/locales/{en,es}.json` (a test checks both have the same keys). Project content is not translated.
- Light and dark themes (`data-theme` on `<html>`), with a light/dark switch next to the avatar (D26).
- Data (from phase 1): repository interfaces + Dexie (IndexedDB) + TanStack Query. `VITE_DATA_SOURCE=local|remote`. The UI (`src/features`, `src/ui`) cannot import storage implementations (ESLint rule).
- Tests: Vitest + Testing Library. Lint: ESLint + Prettier (Prettier does not touch `.md` files or `docs/`).

## Conventions

- Code, variable names, commits and comments in English. Documentation in English too.
- Small, reusable components. Use the design's color and typography variables instead of loose values (for example, in the glossary version comparison: added `#353967`, removed struck through on `#272729`).
- Write tests for domain logic (progress, sorting, filters, statuses, moving items, glossary versions, export).
- Demo data: original, free or public-domain content. **Never** text, screenshots or art from commercial games in the repo or the demo (the design screenshots use Final Fantasy VII material: do not copy it into the sample data). Real game titles may appear only as demo project names (labels, nothing inside them). The demo lives in a separate repository and is loaded with *Load demo* (D34); this repo only holds neutral test fixtures. Keep the data **consistent across screens**: the percentages and statuses in the design are filler, not requirements.
- Keep `docs/DECISIONS.md` up to date with important technical decisions and their reasons.

## Workflow

1. Read `docs/SPEC.md` and check the relevant Figma frames (by link to the frame, screen by screen). Ask which version is current if in doubt.
2. In plan mode, return an architecture and a list of phases. Wait for my confirmation.
3. Build in complete vertical phases, in the order of `docs/ROADMAP.md`: data model and data access, project list and create project, project and section detail, image flow with OCR, translation editor, glossary, member settings, export.
4. After each phase, leave the app runnable, tick the phase in `docs/ROADMAP.md`, and update this file if the commands change.
5. If something in the spec is ambiguous (see "Open decisions" in `SPEC.md` and "Pending" in `DECISIONS.md`), ask instead of assuming.

## Commands

- Install: `npm install`
- Development: `npm run dev` (http://localhost:5173). `dev` and `build` first run `scripts/setup-ocr.mjs`, which prepares `public/ocr` (git-ignored; `npm run ocr:setup` by hand).
- Tests: `npm test` (or `npm run test:watch`)
- Lint: `npm run lint` · Format: `npm run format` · Types: `npm run typecheck`
- Build: `npm run build` (output in `dist/`) · Preview: `npm run preview`
