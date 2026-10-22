# Decisions

Log of technical and design decisions and the reasons behind them. Product decisions live in `SPEC.md` (section 7); this file records how they are applied and what gets decided during construction.

## Stack and deployment

### D1. React + TypeScript + Vite, local-first SPA (2026-10-18)
- **Decision:** SPA with React 19, strict TypeScript, Vite and React Router. Next.js and SvelteKit were ruled out.
- **Reason:** it is the most popular ecosystem for attracting contributions, it publishes as a static site (Vercel) and can be packaged as a desktop app without changes. There are mature libraries for OCR (Tesseract.js), Markdown (CodeMirror 6) and drag & drop (dnd-kit). Next.js would only pay off if the backend lived in the same app already in v1.

### D2. Local-first demo, backend-ready (2026-10-18)
- **Decision:** the public demo stores data in the browser (IndexedDB): each visitor gets their own sandbox, seeded on first load and resettable. There is no shared database.
- **Reason:** a shared database behind a public demo ends up vandalized, and requires auth, rate limits and costs. Backend readiness is guaranteed by:
  - async repositories with UUID IDs and `createdAt`/`updatedAt`/`createdBy`; the UI does not combine stores;
  - a pure domain layer (no browser APIs), reusable on a server;
  - a `VITE_DATA_SOURCE=local|remote` switch (`local` by default);
  - an ESLint rule that prevents `src/features` and `src/ui` from importing storage implementations.
- **v2:** the reference adapter will be **Supabase** (open source and self-hostable: Postgres, auth, storage, realtime). Anyone forking the project can implement the same interfaces against their own API.

### D3. Styling with Tailwind v4 + semantic tokens (2026-10-18)
- **Decision:** Figma's colors and fonts are defined as semantic CSS variables in `src/styles/tokens.css` and exposed to Tailwind with `@theme inline`. Components only use those utilities.
- **Reason:** enables the light theme without touching components and stays faithful to the Figma variables (each token notes its source variable).
- **Fonts:** Inter (body) and Roboto (headings), self-hosted with `@fontsource-variable` so the app works offline and as a desktop app.
- **Icons:** Figma's SVGs are stored as-is in `src/assets/icons`; only the fixed color is replaced with `currentColor` so they follow the theme.

### D4. Interface in English and Spanish (2026-10-18)
- **Decision:** i18next with `en` (default and fallback) and `es`. The browser language is detected and the choice is saved in localStorage. Keys are typed and a test requires both languages to have the same keys.
- **Scope:** interface texts only. Project content (source texts, glossary) is not translated by i18n.

### D5. Light and dark theme (2026-10-18)
- **Decision:** the dark theme comes from Figma. The light one is a **proposal** with no design: the same semantic tokens with their own values (pending the author's review). By default it follows `prefers-color-scheme`; a script in `index.html` applies the theme before first paint.
- **Light theme adjustments:** text in the accent color uses a dark yellow (`--accent-text`) to keep contrast, and the PC platform color is darkened because the original light blue is not visible on white. Hovered list rows use their own `--row-hover` token, because the popup colour is white too and the hover was invisible (reported by the author).

### D6. User menu on the avatar (2026-10-18) — *proposal, no design*
- **Decision:** the avatar at the bottom left opens a menu with **Theme** (System / Light / Dark) and **Language** (English / Español). *Superseded by D26: theme and language moved out of the menu.* In phase 1 the simulated current-user selector is added to it.
- **Reason:** the avatar already exists in the design and has no assigned function, so no new elements are added to the navigation.

## Design (current versions and gaps)

### D7. Glossary version comparison: page A (2026-10-18)
- **Decision:** the "Compare versions" page (frame `370:6934`) is used, not the "Older Version" modal (`370:6687`).
- **Reason:** only the side-by-side view shows what was **added** (`#353967`) and what was **removed** (struck through on `#272729`); deciding on a *Restore* requires seeing both directions. It opens from the *Version history* and *Go back* returns to editing.

### D8. Add new project: managers and languages (2026-10-18)
- **Decision:** Figma is not up to date. **Managers** (multi-select with avatar chips, like *Team members*), **Original language \*** (required dropdown) and **Target languages** (chips like *Platforms*, optional, excluding the original language) are added.

### D9. Glossary overview (2026-10-18)
- **Decision:** the Figma texts are used, "Create new category" and "Add entry". The A-Z list view (the toggle in the design) is designed with the author during the glossary phase.

### D10. No sub-teams (2026-10-18) — resolves open decision 4
- **Decision:** the *Sub-team* column and filter are removed from Settings > Members, and there is no field in the model. The legend texts that mention them will be adjusted with the author.

### D11. Navigation without a design shown disabled (2026-10-18) — *proposal for open decision 6*
- **Decision:** Notifications, Assigned to me, Comments, General settings and Workspace projects are shown **disabled** (with the tooltip "Not available yet") and have no route.

### D12. Project detail (2026-10-18)
- **Decision:** frame `370:10566`, with visible percentages. The missing "%" in "88" and "100" is added.

### D13. Yellow accent only where the design uses it (2026-10-18)
- **Note:** the editor and Settings use yellow primary buttons (`Main/Accent`); the other screens use neutral buttons. This is kept as designed.

## Tooling and repository

### D14. Figma MCP limit (2026-10-18)
- **Note:** Figma's Starter plan limits MCP calls. Downloading assets from their URLs does not use up calls. For each phase, request design context only for the nodes that are needed.

### D15. Prettier does not format documentation (2026-10-18)
- **Decision:** `.prettierignore` excludes `*.md`, `docs/` and `src/assets/`.
- **Reason:** the author's formatting is kept. A first Prettier pass had only added blank lines under the headings of `CLAUDE.md` and `SPEC.md`, without changing the content.

### D16. Design screenshots are not versioned (2026-10-18)
- **Decision:** `docs/design/` is in `.gitignore`. The screenshots stay local as a reference but do not enter the repository.
- **Reason:** they contain art and text from Final Fantasy VII. `CLAUDE.md` forbids commercial game material in the repo, and if they entered a commit they would remain in the history even if deleted later.

### D17. Documentation in English (2026-10-19)
- **Decision:** `CLAUDE.md`, `docs/SPEC.md` and `docs/DECISIONS.md` are translated to English; the roadmap lives in `docs/ROADMAP.md`. Decision numbering is unchanged, and design file names (in Spanish) keep their names.
- **Reason:** English uses fewer tokens in files that are loaded often (CLAUDE.md in every session), and the repo will be open source.

## Data model (phase 1)

### D18. Progress and status are derived, never stored (2026-10-19) — *confirmed by the author*
- **Decision:** progress follows the SPEC 6 proposal (item = completed ÷ (images × target languages); section = average of items; project = average of sections; language = completed in that language ÷ images). Statuses of items, sections, languages and projects are also **derived** from the statuses of their translations (a missing translation counts as *Not started*):
  - nothing started → *Not started*; everything completed → *Completed*;
  - only *Under Review* and *Completed* → *Under Review*; any other mix → *In progress*.
- **Reason:** the design shows a status on projects, sections, items and languages but the spec never says who sets it. Deriving it keeps every screen consistent (CLAUDE.md requires consistent data) and avoids statuses drifting from the real work. Implemented in `src/domain/status.ts` and `src/domain/progress.ts`, with tests.
- Word counts are also derived from the source texts (`countWords`).

### D19. Placeholder demo content (2026-10-19)
- **Decision:** until the demo world is chosen (SPEC open decision 9), the seed uses neutral placeholder content: "Sample Project Alpha…Theta", "Act 1 - Opening", "Scene 1.1", "Placeholder line…", fictional members with `@example.com` emails.
- **How:** `createDemoData()` in `src/data/seed/demoSeed.ts` is pure and deterministic (seeded PRNG), so a backend seeder could reuse it. Each section has a progress profile so the list shows every status. Images have no file yet (`fileId: null`); scene art arrives with phase 4 / the demo world.

### D20. Simulated current user and demo reset in the avatar menu (2026-10-19) — *extends D6*
- **Decision:** the avatar menu adds **Current user** (active members only; invited members cannot be selected) and **Reset demo data** (after a browser confirmation, deletes the sandbox and seeds it again). The default current user is the first manager, so the demo opens with the full view. The selection is stored in localStorage.
- **Spanish labels (confirmed):** *Manager* stays "Manager" in Spanish; *Worker* → "Colaborador".

### D21. Removing a member is a soft delete (2026-10-19) — *confirmed by the author*
- **Decision:** members have `removedAt`; removed members disappear from lists but stay in the store, so their translations remain attributed (SPEC 6: "Removing a member keeps their translations").

### D22. Project list filters and search (2026-10-20) — *phase 2*
- **Decision:** categories combine with AND; several values inside one category combine with OR (the SPEC 5.1 proposal; confirmed by the author). Applied filters show **one chip per category** ("Status is Not started, In progress ×"); × clears that category. The search matches the project name **or code**, ignoring case and accents. *Managers* lists members whose category is manager; *Workers* lists workers (invited ones included) and matches the project's team members.
- **Undesigned states (proposal):** a ticked checkbox is a filled square with a check; the filter button gets a stronger circle and a subtle fill while any filter is active; with no matches, the list shows a message and **Clear all filters**. Menus stay open while ticking so several values can be picked in a row.
- **Implementation:** pure functions in `src/domain/filters.ts`, with tests. Filters, search and sort are page state (not in the URL) for now.

### D23. Add new project: rules not in the design (2026-10-20) — *extends D8*
- **Decision:** required fields are *Project name*, *Original language* and **at least one manager** (SPEC: a project has one or more managers); these rules, the manager preselection and the manager/team member exclusion are confirmed by the author. The current user is preselected as manager when they are one. *Team members* offers workers; a person cannot be both manager and team member of the same project. Target languages exclude the original language and changing it removes it from the targets. Default priority: *None*. Errors are shown after the first submit.
- **Generated fields:** the identifier is generated from the name (up to three word initials, or the first four letters of a single word, plus the year, with `-2`, `-3`… if taken: "The Lantern Keeper" → `TLK-2026`; confirmed by the author). The release date starts empty. The project starts with no sections (progress 0 %, *Not started*).
- **Look:** *Managers* reuses the *Team members* picker, *Original language* is a dropdown styled like the name input and *Target languages* reuses the *Platforms* chips. The modal body scrolls when it does not fit.

### D24. Languages, flags and avatars (2026-10-20)
- **Languages:** a fixed catalog of 16 languages in `src/domain/languages.ts` (BCP 47 codes). Names come from `Intl.DisplayNames` in the interface language, so they need no i18n keys ("Japanese" / "Japonés").
- **Flags:** `country-flag-icons` (MIT) SVG components, because emoji flags do not render on Windows. Only the catalog's flags are imported, so the bundle carries 16 small SVGs.
- **Avatars:** members have no photo in v1, so avatars show initials on a colour picked from a stable hash of the member id (six theme tokens).
- **In progress icon:** the yellow pie fills with the project's progress (clamped to 10–90 % so it never looks empty or complete), as the design shows different fills.

### D25. Project rows link to the detail (2026-10-20)
- **Decision:** the name is a link stretched over the whole row (keyboard and screen-reader friendly); the status icon sits above it so hovering it opens the progress popover instead. `/projects/:projectId` shows a placeholder until phase 3.

### D26. Theme switch and language toggle next to the avatar (2026-10-20) — *replaces part of D6*
- **Decision:** at the author's request, the theme is a **light/dark switch** to the right of the avatar instead of a menu option. The switch shows the theme in use; until it is flipped the app follows the system preference, so the explicit *System* option is gone. The interface language follows the same idea as a compact **EN / ES** toggle beside it (proposal: with more languages it would go back to a menu). The avatar menu keeps the current user and the demo reset.

### D27. Project and section detail: undesigned flows (2026-10-22) — *phase 3, confirmed by the author*
- **Add section:** a dialog with *Section name* (required) and *Description* (optional), styled like Add new project. **Create section** adds it at the end and stays on the project; **Create and add content** creates it and opens the new section (from phase 4 it also opens "Add content to section"; the intent is passed as router state `addContent`).
- **Edit section:** a pencil next to the title on the section card opens the same dialog, filled in, with **Save changes**.
- **Add language:** a popover above the button with one language dropdown (the catalog minus the original language and the languages already added) and **Add**. The new language starts at 0 % / *Not started*. Removing a language is out of scope.
- **Section Progress interaction (proposal):** the triangle expands or collapses a section (the first one starts expanded, several can be open); the section name is a link to its detail.
- **Not built yet, shown disabled with a tooltip:** *Export to code* (phase 8), the Glossary link (phase 6) and **+ Add** content (phase 4). The arrow of each content item opens `/projects/:id/items/:itemId`, a placeholder until the editor (phase 5).
- **Sidebar:** kept on the section detail (the Figma frame omits it). Making it collapsible is noted for a later iteration.

### D28. Section detail numbers (2026-10-22)
- **Languages Progress in the section detail** shows that section's own per-language progress (confirmed by the author), computed with the same rules as the project's (D18).
- **Managers and priority** on the section card are the project's (SPEC 3, inherited); the language counter is the project's target languages.
- **Labels (proposal for SPEC minor open decisions):** the overview says *Manager* with one manager and *Managers* with several; "Not-started" is written *Not started*; an empty release date shows *Not set*. "Updated 2h ago" uses the most recent change to the item, its images or translations, with its author's avatar.
- **Move to section** appends the items after the destination's last item, in their current order; nothing else about them changes, so translations and progress are kept. Selected items that leave the section drop out of the selection.

## Pending

Decisions that are still open, with the phase they block:

| Topic | Blocks | Status |
|---|---|---|
| Repository license | Open-source release | Undecided (none declared in `package.json`) |
| `docs/design/` screenshots (FFVII art) | Public repo | Excluded from git (D16); replace with original material if they should be versioned |
| Light theme review (D5) | — | Proposal, pending the author's review |
| User menu on the avatar (D6, D20) | — | Proposal, pending confirmation |
| EN / ES toggle next to the avatar (D26) | — | Proposal, pending the author's review |
| Collapsible sidebar (D27) | — | Requested by the author for a later iteration |
| Section Progress interaction and detail labels (D27, D28) | — | Proposal, pending the author's review |
| Pages without a design (SPEC open 6) | — | Proposal D11: disabled |
| Undesigned list and modal looks (D22 checkbox, active filter button, empty state; D23 look) | — | Proposal, pending the author's review (filter logic, required fields and project ID confirmed) |
| Incomplete "Add content to section" modal (SPEC open 3) | Phase 4 | To be proposed before the phase |
| Review transitions (SPEC open 1) | Phase 5 | To be proposed before the phase |
| Editor glossary panel (SPEC open 7) | Phase 5 | To be proposed before the phase |
| Glossary A-Z list view (D9) | Phase 6 | Designed with the author during the phase |
| Glossary internal link syntax (proposal `[[Title]]`) | Phase 6 | To be confirmed |
| Members legend without sub-teams (D10) | Phase 7 | Text to be confirmed |
| Export to code JSON schema and CSV location (SPEC open 5) | Phase 8 | To be proposed before the phase |
| Demo content (SPEC open 9) | Phase 9 (demo) | Neutral placeholder content in the seed for now (decided 2026-10-19); the real world is chosen later and swapped in |
