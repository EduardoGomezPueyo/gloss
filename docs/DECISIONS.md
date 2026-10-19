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
- **Light theme adjustments:** text in the accent color uses a dark yellow (`--accent-text`) to keep contrast, and the PC platform color is darkened because the original light blue is not visible on white.

### D6. User menu on the avatar (2026-10-18) — *proposal, no design*
- **Decision:** the avatar at the bottom left opens a menu with **Theme** (System / Light / Dark) and **Language** (English / Español). In phase 1 the simulated current-user selector is added to it.
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

## Pending

Decisions that are still open, with the phase they block:

| Topic | Blocks | Status |
|---|---|---|
| Repository license | Open-source release | Undecided (none declared in `package.json`) |
| `docs/design/` screenshots (FFVII art) | Public repo | Excluded from git (D16); replace with original material if they should be versioned |
| Light theme review (D5) | — | Proposal, pending the author's review |
| User menu on the avatar (D6) | — | Proposal, pending confirmation |
| Pages without a design (SPEC open 6) | — | Proposal D11: disabled |
| Incomplete "Add content to section" modal (SPEC open 3) | Phase 4 | To be proposed before the phase |
| Review transitions (SPEC open 1) | Phase 5 | To be proposed before the phase |
| Editor glossary panel (SPEC open 7) | Phase 5 | To be proposed before the phase |
| Glossary A-Z list view (D9) | Phase 6 | Designed with the author during the phase |
| Glossary internal link syntax (proposal `[[Title]]`) | Phase 6 | To be confirmed |
| Members legend without sub-teams (D10) | Phase 7 | Text to be confirmed |
| Export to code JSON schema and CSV location (SPEC open 5) | Phase 8 | To be proposed before the phase |
| Demo content (SPEC open 9) | Phase 9 (demo) | Neutral placeholder content in the seed for now (decided 2026-10-19); the real world is chosen later and swapped in |
