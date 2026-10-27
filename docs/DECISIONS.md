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
- **Decision:** the dark theme comes from Figma. The light one has no design: the same semantic tokens with their own values (confirmed by the author on 2026-10-26). By default it follows `prefers-color-scheme`; a script in `index.html` applies the theme before first paint.
- **Light theme adjustments:** text in the accent color uses a dark yellow (`--accent-text`) to keep contrast, and the PC platform color is darkened because the original light blue is not visible on white. Hovered list rows use their own `--row-hover` token, because the popup colour is white too and the hover was invisible (reported by the author).

### D6. User menu on the avatar (2026-10-18) — *no design; confirmed by the author on 2026-10-26*
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

### D11. Navigation without a design shown disabled (2026-10-18) — *proposal for open decision 6; superseded by D37 page by page*
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

### D19. Placeholder demo content (2026-10-19) — *superseded by D34: the placeholder seed is now the test fixture*
- **Decision:** until the demo world is chosen (SPEC open decision 9), the seed uses neutral placeholder content: "Sample Project Alpha…Theta", "Act 1 - Opening", "Scene 1.1", "Placeholder line…", fictional members with `@example.com` emails.
- **How:** `createDemoData()` in `src/data/seed/demoSeed.ts` is pure and deterministic (seeded PRNG), so a backend seeder could reuse it. Each section has a progress profile so the list shows every status. Images have no file yet (`fileId: null`); scene art arrives with phase 4 / the demo world.

### D20. Simulated current user and demo reset in the avatar menu (2026-10-19) — *extends D6; the reset item was removed by D34*
- **Decision:** the avatar menu adds **Current user** (active members only; invited members cannot be selected) and **Reset demo data** (after a browser confirmation, deletes the sandbox and seeds it again). The default current user is the first manager, so the demo opens with the full view. The selection is stored in localStorage.
- **Spanish labels (confirmed):** *Manager* stays "Manager" in Spanish; *Worker* → "Colaborador".

### D21. Removing a member is a soft delete (2026-10-19) — *confirmed by the author*
- **Decision:** members have `removedAt`; removed members disappear from lists but stay in the store, so their translations remain attributed (SPEC 6: "Removing a member keeps their translations").

### D22. Project list filters and search (2026-10-20) — *phase 2*
- **Decision:** categories combine with AND; several values inside one category combine with OR (the SPEC 5.1 proposal; confirmed by the author). Applied filters show **one chip per category** ("Status is Not started, In progress ×"); × clears that category. The search matches the project name **or code**, ignoring case and accents. *Managers* lists members whose category is manager; *Workers* lists workers (invited ones included) and matches the project's team members.
- **Undesigned states (confirmed by the author on 2026-10-26):** a ticked checkbox is a filled square with a check; the filter button gets a stronger circle and a subtle fill while any filter is active; with no matches, the list shows a message and **Clear all filters**. Menus stay open while ticking so several values can be picked in a row.
- **Implementation:** pure functions in `src/domain/filters.ts`, with tests. Filters, search and sort are page state (not in the URL) for now.

### D23. Add new project: rules not in the design (2026-10-20) — *extends D8*
- **Decision:** required fields are *Project name*, *Original language* and **at least one manager** (SPEC: a project has one or more managers); these rules, the manager preselection and the manager/team member exclusion are confirmed by the author. The current user is preselected as manager when they are one. *Team members* offers workers; a person cannot be both manager and team member of the same project. Target languages exclude the original language and changing it removes it from the targets. Default priority: *None*. Errors are shown after the first submit.
- **Generated fields:** the identifier is generated from the name (up to three word initials, or the first four letters of a single word, plus the year, with `-2`, `-3`… if taken: "The Lantern Keeper" → `TLK-2026`; confirmed by the author). The release date starts empty. The project starts with no sections (progress 0 %, *Not started*).
- **Look (confirmed by the author on 2026-10-26):** *Managers* reuses the *Team members* picker, *Original language* is a dropdown styled like the name input and *Target languages* reuses the *Platforms* chips. The modal body scrolls when it does not fit.

### D24. Languages, flags and avatars (2026-10-20)
- **Languages:** a fixed catalog of 16 languages in `src/domain/languages.ts` (BCP 47 codes). Names come from `Intl.DisplayNames` in the interface language, so they need no i18n keys ("Japanese" / "Japonés").
- **Flags:** `country-flag-icons` (MIT) SVG components, because emoji flags do not render on Windows. Only the catalog's flags are imported, so the bundle carries 16 small SVGs.
- **Avatars:** members have no photo in v1, so avatars show initials on a colour picked from a stable hash of the member id (six theme tokens).
- **In progress icon:** the yellow pie fills with the project's progress (clamped to 10–90 % so it never looks empty or complete), as the design shows different fills.

### D25. Project rows link to the detail (2026-10-20)
- **Decision:** the name is a link stretched over the whole row (keyboard and screen-reader friendly); the status icon sits above it so hovering it opens the progress popover instead. `/projects/:projectId` shows a placeholder until phase 3.

### D26. Theme switch and language toggle next to the avatar (2026-10-20) — *replaces part of D6*
- **Decision:** at the author's request, the theme is a **light/dark switch** to the right of the avatar instead of a menu option. The switch shows the theme in use; until it is flipped the app follows the system preference, so the explicit *System* option is gone. The interface language follows the same idea as a compact **EN / ES** toggle beside it (with more languages it would go back to a menu) (confirmed by the author on 2026-10-26). The avatar menu keeps the current user and the demo reset.

### D27. Project and section detail: undesigned flows (2026-10-22) — *phase 3, confirmed by the author*
- **Add section:** a dialog with *Section name* (required) and *Description* (optional), styled like Add new project. **Create section** adds it at the end and stays on the project; **Create and add content** creates it and opens the new section (from phase 4 it also opens "Add content to section"; the intent is passed as router state `addContent`).
- **Edit section:** a pencil next to the title on the section card opens the same dialog, filled in, with **Save changes**.
- **Add language:** a popover above the button with one language dropdown (the catalog minus the original language and the languages already added) and **Add**. The new language starts at 0 % / *Not started*. Removing a language is out of scope.
- **Section Progress interaction (confirmed by the author on 2026-10-26):** the triangle expands or collapses a section (the first one starts expanded, several can be open); the section name is a link to its detail.
- **Not built yet, shown disabled with a tooltip:** *Export to code* (phase 8), the Glossary link (phase 6) and **+ Add** content (phase 4). The arrow of each content item opens `/projects/:id/items/:itemId`, a placeholder until the editor (phase 5).
- **Sidebar:** kept on the section detail (the Figma frame omits it). Making it collapsible is noted for a later iteration.

### D28. Section detail numbers (2026-10-22)
- **Languages Progress in the section detail** shows that section's own per-language progress (confirmed by the author), computed with the same rules as the project's (D18).
- **Managers and priority** on the section card are the project's (SPEC 3, inherited); the language counter is the project's target languages.
- **Labels (SPEC minor open decisions, confirmed by the author on 2026-10-26):** the overview says *Manager* with one manager and *Managers* with several; "Not-started" is written *Not started*; an empty release date shows *Not set*. "Updated 2h ago" uses the most recent change to the item, its images or translations, with its author's avatar.
- **Move to section** appends the items after the destination's last item, in their current order; nothing else about them changes, so translations and progress are kept. Selected items that leave the section drop out of the selection.

### D29. Add content to section and OCR (2026-10-22) — *phase 4, resolves SPEC open decision 3 (confirmed by the author)*
- **One content item per use of the modal:** the chosen images, in the chosen order. Above the designed areas, a row with *Name* (required) and *Type* (optional free text that suggests the types already used in the project); a footer with *Cancel* and **Create content item**. At least one image is required. Uploaded but unchosen images are discarded. Accepted files: PNG, JPEG and WebP up to 15 MB; others are listed as not added.
- **Choosing and ordering:** a click in *Image selector* adds the image at the end (or takes it out); *Image ordering* reorders by dragging, with the keyboard too (dnd-kit), and × takes an image out. Hover or focus shows it in *Image preview*.
- **No image titles:** with 10–40 images per dialogue, images are labelled from the item and their position ("North gate - 1", "North gate - 2"); only the original file name is kept. `SceneImage.title` was removed (IndexedDB v2 migration).
- **OCR runs after creating the item**, in the background, one image at a time, in the project's source language. Each image has a status: *pending* (shown as "Reading text…"), *done*, *empty* ("No text found") or *failed* (with **Retry** on the item). The queue resumes after a reload. Found text becomes the source text and is also kept as `ocrText`, with the line boxes, so the editor can mark later changes as "edited".
- **Engine:** Tesseract.js (Apache-2.0) in a Web Worker, behind `OcrProvider` (`src/ocr`). It is loaded only when OCR first runs.
- **Self-hosted, offline after first use:** `scripts/setup-ocr.mjs` (runs before `dev` and `build`, or `npm run ocr:setup`) copies the engine from `node_modules` and downloads the Tesseract **fast** models (tessdata_fast 4.1.0, Apache-2.0) for the 14 models of the catalog into `public/ocr` (git-ignored). Nothing is committed and no CDN is used at runtime; each user downloads only the languages they use, which the browser then caches. Sizes: engine ~12 MB in the build (one ~3.9 MB core is loaded, by SIMD support), languages ~20 MB in total.
- **Model choice, measured** on original generated images (English, Spanish, Japanese, Chinese; clean and low-contrast retro dialogue boxes): *fast* and *best_int* read the same text; *fast* is about a third smaller and a little quicker.
- **Preprocessing, measured:** without it neither model read light text on a dark box; a hard black-and-white threshold fixed that but destroyed low-contrast boxes. So OCR runs twice, on the original and on a softened copy (grayscale, inverted when mostly dark, ×2 when narrower than 1000 px), with automatic page segmentation, and keeps the result with more confidently read text. Known limit: small Chinese text in a low-contrast box was not read; a pixel-art test read 3 lines with 2 small errors. The text is always correctable by hand (phase 5).

### D30. Translation editor (2026-10-22) — *phase 5, resolves SPEC open decisions 1 and 2 (confirmed by the author)*
- **Review flow (open 1):** typing makes a translation *In progress*. **Mark translated** flags it as ready (a `ready` flag on an in-progress translation; it can be undone) and it then counts in the language cards' "x/N translated". **Submit for review**, in the header, moves every ready translation of the **section** to *Under Review* and says how many. A **manager** opening an Under Review translation gets **Approve** (→ *Completed*, stored as reviewer, shown as "Approved by …") and **Request changes** (→ *In progress*); a worker sees "Waiting for a manager's review". Editing an Under Review or Completed text sends it back to *In progress*. Rules in `src/domain/translationWorkflow.ts`; the repository rejects reviews by non-managers.
- **Source text (open 2):** clicking the text (or the pencil) edits text, speaker, type and context note together. When the text differs from what OCR read, an **edited** label and **Restore OCR text** appear. Text typed where OCR found nothing is not "edited".
- **Glossary panel:** built in phase 6 with the glossary; phase 5 shows the card with a short note and *Full glossary* disabled. Proposal for phase 6: a match is an entry whose title appears in the source text or the translation (whole words, ignoring case).
- **Comments:** threads per image with a language (or *General*), replies, Resolve / Reopen, and Open / Resolved tabs with a language filter. **No categories** for now (the author may add them later). `@` suggests the project's people and inserts "@Full Name"; mentions are only highlighted, nobody is notified. The demo seeds one open and one resolved thread on the first image of the first project.
- **Defaults (confirmed by the author on 2026-10-26; the comparison card and the managers-only note were superseded by D40):** autosave a short pause after typing (and when leaving the field, image or language), with "Saving… / All changes saved" in the header; the current image and language live in the URL (`?image=2&lang=es`); "Images in this item" (the design says "section"), with images named "<item> - <n>" (D29); demo images without a file show a placeholder; zoom steps 100–300 % and full screen; the **Note for translators** can be written or changed by managers; the comparison card starts on the first other language with text, and *Edit <language>* switches the editor to it.
- **Storage:** IndexedDB v3 adds comment threads and comments and the `ready` flag.

### D31. Glossary (2026-10-22) — *phase 6, confirmed by the author unless marked*
- **Comparison:** the "Compare versions" page (D7), not the "Older Version" modal.
- **A–Z list view (designed with the author, resolves D9):** entries sorted by title under letter headings, one compact row each (title, category, short description, two tags), and a jump bar of letters; letters without entries are dimmed and titles that do not start with a Latin letter go under "#". Search and the category filter apply to it too.
- **Short description:** its own required field (up to 200 characters), part of every version; it is what cards, the A–Z list and the editor panel show.
- **Links and references:** `[[Title]]` or `[[Title|text]]` link to another entry by title (ignoring case and accents); links to entries that do not exist yet are dimmed. Typing `[[` in the editor suggests titles. References are Markdown footnotes (`text[^1]` and `[^1]: source`), rendered as numbered links to a visible **References** list. The body is rendered to React elements (react-markdown + GFM), never raw HTML; images inside the body are not rendered.
- **Images:** a gallery block above the body in Edit entry ("+ Image", × to remove; PNG/JPEG/WebP up to 15 MB); the first image is shown large. Images are part of every version.
- **Versions:** every *Save changes* stores a numbered version with author and time (no version when nothing changed); *Restore version* saves the older content as a new version, so history is never lost. The diff is word by word: added text on `--diff-added`, removed text struck through on `--diff-removed`, a bar beside changed paragraphs, and tags compared too.
- **Defaults (confirmed by the author on 2026-10-26):** each project gets Characters, Factions, Locations and Lore (new projects too; IndexedDB v4 adds them to existing ones); *Create new category* asks for a unique name; the overview rows show the three most viewed entries per category, and opening an entry counts a view; *View all* selects that category; anyone in the project can edit; the title of the screen is "<Project> - Glossary" with a book icon (the project has no image); only *Add entry* is kept (the "+ New entry" of one frame duplicates it). Images uploaded and then discarded stay stored (no cleanup yet).
- **Editor panel (D30):** without a search, it lists the entries whose title appears in the image's source text or translation (whole words, ignoring case and accents), and the translation editor shows "N glossary match"; with a search, it searches the whole glossary.
- **Libraries:** CodeMirror 6 (MIT) for the live Markdown editor, loaded only on the edit page; react-markdown and remark-gfm (MIT); jsdiff (BSD-3-Clause), loaded only on the compare page.
- **Demo:** original fictional entries for the first project (characters, factions, places and lore of a placeholder river city), with older versions on "Mira Vale" to show the comparison.

### D32. Settings > Members (2026-10-22) — *phase 7, confirmed by the author unless marked*
- **No sub-teams (D10):** the current frame no longer has the Sub-team column; the "All sub-teams" filter is dropped too. **Legend:** Manager "Manages members, projects and translation reviews."; Worker "Translates and edits content in the projects they take part in."; "Removing a member keeps their existing translations." stays.
- **Invite members to workspace:** a dialog with one row per person (Name, Email, Category — Worker by default) and *Add another*. Emails must be valid, not already in the workspace and not repeated; empty rows are ignored. People are added as *Invited*; no email is sent (the dialog says so).
- **Selection:** with people selected, a bar shows "N selected", *Clear selection*, **Change category** and **Remove**.
- **Visibility (SPEC 5.6, simulated):** workers only see the projects they take part in, in the list and through direct links (one guard route for every project page); managers see everything. Switch the current user in the avatar menu to try it. A workspace setting can let workers see the other projects as view only (D41).
- **Defaults (confirmed by the author on 2026-10-26):** only active managers can invite, change categories or remove; workers see the table read-only with a note. You cannot remove yourself, and the workspace always keeps at least one active manager (removing or demoting the last ones is refused with a message). Remove asks for confirmation and is a soft delete (D21). Invited members stay *Invited* (no real sign-up); removing one cancels the invitation.

### D33. Export to code (2026-10-22) — *phase 8, resolves SPEC open decision 5 (confirmed by the author)*
- **Where:** *Export to code* on the project page opens a dialog: **format** (JSON or CSV — this is where the CSV lives), **languages** (all target languages ticked) and **"Include translations that are not completed yet"** (off by default: only *Completed* translations go in, so the game ships reviewed text). It shows how many strings and translations the file will have, then *Download* saves `<CODE>-translations.json|csv`.
- **JSON (one file, all languages):** `{ format: "translator-export", version: 1, project: { name, code, sourceLanguage }, exportedAt, languages, include, strings: [...] }`. Each string: `key`, `id`, `section`, `item`, `position`, `speaker`, `type`, `context`, `source` and `translations: { <language>: text | null }` — `null` when no translation passes the filter, so gaps are visible. Strings follow section → item → image order. Bump `version` when the shape changes.
- **Keys:** readable `section.item.position` slugs (`act-1-opening.north-gate.01`; accents removed; repeated names get `-2`, `-3`…), plus the image's stable `id`, which never changes. Renaming a section or item changes the key, not the id.
- **CSV:** the same rows with one column per language (`key,id,section,item,position,speaker,type,context,source,<languages…>`), RFC 4180 quoting, CRLF line endings, UTF-8 with a byte order mark so spreadsheet apps read accents.
- **Architecture:** the export is built once in a format-independent shape (`src/export/buildExport.ts`); each format is a `TranslationExporter` adapter (`json.ts`, `csv.ts`) listed in `src/export/registry.ts`, so PO/XLIFF (v2) are new adapters only. The file is assembled in the browser; nothing is uploaded.

### D34. Demo outside the repository, app starts empty (2026-10-23) — *phase 9, resolves SPEC open decision 9 (confirmed by the author)*
- **Empty start:** a new workspace has no projects and a single active manager, **Alex Morgan** (`alex@example.com`), so the current-user selector and permissions work. There is no automatic seed anymore.
- **Demo outside the repo:** the demo lives in its own repository (`gloss-demo`, formerly `translator-tool-demo`), so forks carry no demo content. The app reads it from `VITE_DEMO_URL`; without it the demo controls are hidden. `VITE_DEMO_IMAGES_URL` (optional) adds a "Try with real images" link to the author's separate repository of real screenshots, which are not part of this project or its license.
- **Separate workspace:** *Load demo* (below the avatar) downloads the demo and opens it in its **own IndexedDB database** (`translator-demo`); the user's data (`translator`) is never touched. While it is open, a *Demo* badge and *Exit demo* replace the button. Loading it again resets it. The open workspace and the simulated current user are remembered per workspace (`localStorage`).
- **Format:** a workspace snapshot `{ format: "translator-tool-workspace", version: 1, exportedAt, data, files }` (`src/domain/workspace.ts`). `data` holds every entity list; `files` lists image files with URLs relative to the snapshot, stored with the snapshot's MIME type (raw hosts serve SVG as text). On import every `…At` timestamp moves forward by the time since `exportedAt`, so the demo always looks recent.
- **Content:** project names are real game titles from the design, used as labels only; everything inside (story, characters, dialogue and its translations into es/fr/de/it/ja/pt-BR, glossary, generated SVG scenes) is original. 2 managers, 5 workers and 1 invited member; section profiles cover every status.
- **Tests:** the neutral placeholder data of D19 is now a test fixture (`src/test/fixtures`), loaded through `workspace.replace`.

### D35. License: AGPL-3.0 (2026-10-23) — *confirmed by the author*
- **Decision:** the code is licensed under the **GNU Affero General Public License v3.0 only** (`LICENSE`, `"license": "AGPL-3.0-only"` in `package.json`). Anyone can fork it, but derivatives stay open source, including modified versions run as a hosted web service (the reason to prefer it over GPL-3.0 for a web app).
- **Scope:** the code and this repository's docs. The demo repository has its own license, and real game screenshots linked from the app belong to their owners.

### D36. Larger sidebar text (2026-10-23) — *requested by the author, deviates from Figma*
- **Decision:** the general and settings navigation use 14px text with 16px icons (the design uses 10px/12px, too small to read comfortably); the demo controls below the avatar use 12px.

### D37. Building the pages without a design (2026-10-23) — *confirmed by the author, revises D11*
- **Decision:** Notifications, Assigned to me, Comments, Settings > General and Settings > Workspace projects will be built (ROADMAP phase 10), after the fidelity review so they reuse the polished components.
- **How:** there are no Figma frames, so each page is designed in code: a short spec (content, actions, data) is approved by the author first, then built with the existing components and tokens, and recorded here. Each page ends by adding its data to the demo. Until its turn, an entry stays disabled as in D11.

### D38. Editing project details from the Overview (2026-10-24) — *requested by the author, not in the design*
- **Decision:** on the project detail, clicking **platforms, managers, members, release date or the priority pill** opens a picker; each change saves at once (no Save button). Platforms, managers and members use checkbox menus like the "Add new project" modal, priority a radio menu, and the release date a popover with *Quarter* (*Not set*, Q1–Q4) and *Year* (last year to ten years ahead). This resolves SPEC minor open decision "Release Date": it is a quarter, stored as "Q3 2026"; *Not set* clears it.
- **Rules:** only active managers can edit (as D32); workers see the values read-only. A project keeps at least one manager (the last one cannot be unchecked) and nobody is both manager and member (D23). The name, project ID and original language are not editable here; target languages keep *Add language* (D27).
- **Data:** `ProjectRepository.updateDetails` with the rules in `domain/projectDetails.ts`.

### D39. Two-column "Add new project" modal (2026-10-24) — *requested by the author, deviates from Figma*
- **Decision:** the modal is 920px wide (Figma: 540px). Name on top; platforms, original language and priority on the left; managers and team members on the right; target languages full width below. The language fields of D23 made the Figma layout too tall; this fits at 1440×900 without scrolling. Priority options use 14px text to fit the column. If it still feels cramped, the fallback is a wider single column with scrolling.

### D40. Translation editor redesign (2026-10-24) — *decided with the author; replaces the three-column layout of SPEC 5.4 and D30's panels once built*
- **Layout (the author's mockup):** two columns. Left: **Source image** with "01 / 02 in this section" arrows (the image strip is dropped), file name, zoom and full screen, and below it the **Comments** card. Right: **Source text**, the **editor for one language** and the **Glossary** card. The header keeps the project name, status, "Translation workspace", "All changes saved" and *Submit for review*; the breadcrumb and project ID stay.
- **Languages:** the per-language cards are replaced by a "Spanish ▾" picker whose menu lists every target language with its status and x/N progress. The comparison between languages is dropped.
- **Kept, moved:** the character/line counter goes in the editor footer next to "Edited by you"; the glossary-match count moves to the Glossary card header ("N matches"); the note for translators becomes the context part of the source-text line ("Dialogue · <context> · 69 characters"), still edited by clicking. The locked *Speaker* field is dropped (the speaker shows in the source text).
- **Comments:** visible on the page in a compact card under the image: this image's open threads (author, language, one-line excerpt, time), each with **Resolve** and, when it has replies, an "N replies" link that opens the side bar scrolled to that thread, highlighted; or "No comments on this image". The card header has **+ Comment**, which opens a composer inside the card (text with `@`, language, *Cancel* / *Comment*), and **View all**, which opens a side bar (~400px) over the right side, closed with Esc or ×, holding the composer, replies, resolve/reopen and the resolved tab (changed by the author on 2026-10-25; first built with + Comment opening the side bar). Scope stays the current image.
- **Glossary card:** matching Markdown entries with title, short description and tags, plus search and "Full glossary ↗" (as D31). The mockup's "term → translation" and *Approved* came from old components and are not used.
- **Context (2026-10-25):** the per-image *context note* and the per-item *note for translators* are merged into one field, the item's (stored as `translatorNote`). It is the context of the source-text line, edited in the source text form as "Context (all images in this item)" by anyone who can edit the source text; the export's `context` column reads it. The per-image field is removed from the model.
- **Image arrows (2026-10-25):** "01 / 02 in this item": they step through the images of the content item, as before (the mockup says "section").
- **Built (2026-10-25)** from the author's mockup, which serves as the general layout; no final Figma frame. The Comments card shows up to three open threads; the side bar is a modal sheet over a dimmed page.

### D41. Settings > General and project visibility (2026-10-25) — *spec approved by the author (D37); the visibility setting proposed by the author*
- **Appearance:** theme (System / Light / Dark) and interface language, per browser, the same preferences as the switches next to the avatar.
- **Project visibility:** a workspace setting, *"Workers only see the projects they take part in"*, on by default (D32's rule). Only active managers change it. When off, a worker who is not part of a project sees it in the list and can open every page of it **as view only** (the author chose this over full access or view and comment): `ProjectAccessGate` shows a note and provides `canWork`, and each write action hides or disables itself. Being part of a project is what lets you work on it; managers work on every project.
- **Storage:** workspace settings are the first data that belongs to the workspace rather than the browser: JSON under the `settings` key of the `meta` table, read and written through `WorkspaceRepository.getSettings / updateSettings`, so a backend can take them over. Missing values fall back to the defaults.
- **Backup:** the demo snapshot format (D34) with the images embedded as `data:` URLs and the settings added, so one loader reads both; dates are kept as they are. Restoring replaces the workspace after a `window.confirm`; *Delete all data* asks to type "delete" ("borrar" in Spanish) and starts again with a new owner. Both reopen the workspace (new cache). In the demo, restore and delete are replaced by *Exit demo*. Backups and data actions are for active managers only.
- **About:** version from `package.json` (`__APP_VERSION__`), license and the repository link.

### D42. Settings > Workspace projects (2026-10-25) — *spec approved by the author (D37)*
- **Table** like Members, with the projects the current user can see (D41), search by name or ID, selection and a bar for deleting several.
- **Rename** edits the name and the project ID together (the Overview keeps them read-only, D38). The ID is stored in capitals, uses letters, digits and single hyphens, up to 24 characters, and must not be used by any other project, deleted ones included.
- **Delete** is a soft delete (`deletedAt`, like members' `removedAt`, D21) after a `window.confirm` naming the projects: deleted projects are left out of the list, the detail and the export, and their pages say "not found". Data from before the field existed has no `deletedAt` and counts as not deleted. No archiving.

### D43. Inbox pages and Comments (2026-10-25) — *spec approved by the author (D37), layout from the author's Linear-style mockup*
- **Shared inbox layout** for Comments, Assigned to me and Notifications: a list on the left (newest first, filters as chips, the selected entry highlighted with theme tokens) and, on the right, the entry's image with zoom and full screen, a breadcrumb with *Open in editor*, and the entry's content and actions. The selection lives in the URL (`?id=`); ↑/↓ and J/K move through the list. Only projects the user can see (D41); actions follow the view-only rule. Entries without an image show the project instead.
- **Comments:** threads across projects, ordered by latest activity, with Open / Resolved, language and project filters. **Managers** start on *Involving me* and can switch to *All*; **workers** only see the threads involving them, with no option. A thread involves you if you wrote in it or are @mentioned in it. The right side shows the whole thread with replies, the reply box, Resolve and Reopen.

### D44. Assigned to me (2026-10-25) — *spec approved by the author (D37)*
- **Assignments:** managers assign a **content item, for one language,** to a person, from the section detail. A new record per item and language (`assignments` table, IndexedDB v5); only managers assign, only to the project's people, only in its target languages. Reassigning counts as a new assignment. Snapshots without the list (the published demo) read it as empty.
- **The page:** the items assigned to you (name, language, status, x/N), by project priority and then latest assignment; the right side shows the item's first image, the source text, your translation and its status, and *Open in editor*. **Managers** also get a **To review** tab with the translations under review in the projects they manage. The demo gets assignments.

### D45. Notifications (2026-10-25) — *spec approved by the author (D37)*
- **Activity log:** the repository records events as things happen, with a read state per person, and the navigation shows the unread count. Events: you are @mentioned; someone replies in a thread you are in; a thread you are in is resolved; your translation is approved or sent back; a content item is assigned to you; a section is submitted for review (to that project's managers); you are added to a project. Your own actions never notify you.
- **The page:** the inbox layout with All / Unread / Mentions and *Mark all as read*; opening an entry marks it read. The right side shows the image and the event (the comment in its thread, or the translation with its status change).
- **Storage:** one `notifications` record per recipient and event (IndexedDB v6, optional in snapshots), with `readAt`. The rules of who hears what are pure functions in `src/domain/notifications.ts`; the local repository writes the records in the same transaction as the action, as a backend would on the server. Mentions are matched as "@Full Name" among the project's people. A "reply" goes to everyone who wrote earlier in the thread, unless that person is mentioned (then only "mention"); "resolved" goes to everyone who wrote in it. Reassigning the same person, or a review that changes nothing, sends nothing.
- **Built (2026-10-25)** after Comments and Assigned to me. The navigation entries no longer have a disabled state (D11 is fully superseded).
- **Demo (2026-10-25):** the demo repository's generator derives its notifications from its threads, assignments and reviews with these same rules (older than two days: read). Its assigned translations are written by their assignees, and the default user (a manager) has a few assignments in progress.

### D46. Collapsible sidebar (2026-10-26) — *requested by the author in D27; look and behaviour chosen by the author*
- **Collapsed look:** the general navigation shrinks from 182px to a 52px icon rail. Each link keeps its accessible name and shows its label in a tooltip on hover or focus; unread notifications become an accent dot on the icon. The theme switch, the EN / ES toggle and the demo controls move into the avatar menu (Theme, Interface language, Demo sections).
- **Behaviour:** a button at the top of the navigation (aligned with the icons when collapsed) and **Ctrl+B** (⌘B on macOS; ignored while typing in a field) toggle it. The choice is stored per browser in localStorage (`translator.sidebarCollapsed`) and applies on every page. Settings keeps its own navigation inside the panel and does not collapse.

### D47. Name and logo: Gloss (2026-10-27) — *name and logo from the author's Claude Design session; the app's yellow chosen by the author*
- **Name:** the app is called **Gloss** (a gloss is a translation note written beside a text, and it points at the per-project glossary). It is a proper noun and is not translated (`general.appName` is "Gloss" in both languages).
- **Mark:** two text lines and two dots. The dots use the app's accent instead of the logo's original yellow (`#F2CE2B` → `--accent` `#e9ca1b`; on light backgrounds `--accent-text` `#8a7400` instead of `#B8920F`). In the app it is `src/ui/GlossMark.tsx`, drawn with theme tokens, beside the name in Inter at the top of the expanded sidebar; the collapsed rail shows only the expand button.
- **Files:** favicons, app icons and `site.webmanifest` in `public/`; the clean mark SVGs and the logo with the name (Geist SemiBold, PNG, for the README) in `docs/brand/`. The originals from Claude Design stay in `docs/design/` (not in git).
- **Kept as they are:** internal identifiers that hold user data (the IndexedDB names `translator` / `translator-demo`, the `translator.*` localStorage keys, `TranslatorDb`), so renaming does not lose anyone's workspace or preferences. The repositories were renamed on 2026-10-27 (`translator-tool` → `gloss`, `translator-tool-demo` → `gloss-demo`; GitHub redirects the old addresses). The demo format id `translator-tool-workspace` stays, so existing snapshots and backups still load.

### D48. Loading screen (2026-10-27) — *requested by the author; layout, timing and scope confirmed by the author*
- **Look:** full screen, without the sidebar: the Gloss mark at 72px with its two dots pulsing in turn (still with reduced motion), "Gloss", and "Loading your workspace…" / "Cargando tu espacio de trabajo…". Theme tokens, so it follows light and dark.
- **When:** from the first paint (a static copy in `index.html`, picking the language and workspace from localStorage; a test keeps its texts equal to `loadingScreen.*`), while the workspace opens, and every time a workspace is opened again (leaving the demo, restoring a backup, deleting all data). Loading the demo shows it with "Loading the demo workspace…" while the demo downloads and opens; if the download fails, the app stays as it was and the demo controls show their error (D34).
- **Timing, faked on purpose for the showcase:** opening local data takes milliseconds, so the screen stays at least 900ms and then fades out over 300ms instead of flashing. Tests pass `minLoadingMs={0}`.
- **Error:** the same screen with "Your workspace could not be loaded." and *Try again*, which retries opening the workspace.

## Pending

Decisions that are still open, with the phase they block:

| Topic | Blocks | Status |
|---|---|---|
| `docs/design/` screenshots (FFVII art) | Public repo | Excluded from git (D16); replace with original material if they should be versioned |
