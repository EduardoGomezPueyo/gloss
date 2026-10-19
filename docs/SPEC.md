# Translator Software — Specification (v4)

> Derived from the Obsidian design notes and the Figma screenshots.
> **Integrated:** project list (filters, progress, create project), project detail, section detail (with moving items and adding content), translation editor, glossary (overview, category, detail, editing, history and comparison) and member settings.
> **No design in the screenshots:** Notifications, Assigned to me, Comments, General settings and Workspace projects.
> **Figma takes precedence over the screenshots.** According to the author, Figma is up to date and some screenshots may be an earlier version. When a screen has several versions or there is any doubt, ask and check it in Figma (see resolved decision 20).
> Parts marked **[Proposal]** are scope or model decisions that were not in the notes or the design and must be validated.
> The interface texts in the design are in English; they are kept verbatim in this spec.

## 1. Vision

### Why it exists

A personal development project to design software from scratch, improve the way I design, and build something with a concrete meaning. It is also a portfolio project that will eventually be published as **open source**.

### What it is

A video game translation tool. Given how it is conceived, it can be extended to other media (books, films, series).

### Problem

Video game translations suffer from a lack of context, time and knowledge of the game's world.

### Solution

Bring together in one place:

- The **visual part** that accompanies the dialogue (the game scene).
- The **knowledge** associated with the game, as a per-project glossary: story, locations, characters, lore.
- **Teamwork** with supervision from colleagues (peer review).

## 2. Scope by phase **[Proposal]**

### v1 — Showcase (local, single user)

Priority: the whole flow should look polished and faithful to the Figma design. It does not have to be perfect.

- Project management: list with search, filters, progress popover and sorting; create project.
- Project detail: overview, collapsible sections with progress, progress per language.
- Section detail: list of content items with search, status filter, multi-select and moving items; adding content (images).
- **Source text entered via OCR** on the images. The detected text can be **edited** by clicking on it, with an "edited" label.
- Full translation editor as designed (see 5.4), with threaded comments and an integrated glossary.
- Per-project glossary, with **simplified Markdown entries** only: overview, category filter, detail, editing, history and version comparison.
- **Export to code:** export of the translations to a JSON file. CSV is also planned (location in the interface undefined).
- Settings > Members, **local only**: view, search, filter, change category and remove members; "Invite members" creates a member with status _Invited_ without sending real emails.
- Local persistence. Users and roles **simulated** with a current-user selector, so the manager and worker views can be shown without a backend.
- Sample project included, with original, free or public-domain content (see open decision 9).

### v2 — Teams

- Backend, authentication, real email invitations.
- Real permissions (managers / workers, project visibility).
- Notifications and synchronization.
- AI translation with mandatory human review (a requirement from the notes; **the designed editor has no interface for it**).
- Import of additional formats (PO, XLIFF).

### Future

- Kanban and Timeline views in project management.
- Media other than video games.

**Architecture requirement:** data access must sit behind an interface (repository/service) so local persistence can be replaced by a backend in v2 without rewriting the UI.

## 3. Domain model (draft)

Hierarchy: **Workspace > Project > Section > Content item > Image**. Each image has **one text block**, and translation is done per image and language.

> Design terminology: a _Section_ is an act ("Act 1 - World introduction") and a _Content item_ is what hangs from it ("Bomber mission"). A content item groups one or more ordered images ("01 / 02"). The editor's "Images in this section" text refers to the content item and should be corrected.

- **Workspace**: members and projects.
- **User / Member**: name, email, avatar (or initials), category (`manager` | `worker`), sub-team (see open decision 4), status (`active` | `invited`; when someone is removed, their translations are kept).
- **Project**: name (required), identifier (e.g. `FFVII-GEN-2025`), release date (in the design, a quarter: "Q3 2025"), **source language** (per project; e.g. a game in Japanese translated into other languages), target languages (not including the source), platforms (Playstation, Xbox, PC, Switch; each with its own color), **one or more managers**, members, priority, status, total words, its own glossary.
- **Section**: name, description, order, progress (%), status. Shows the project's managers and priority **[Proposal: they are inherited]**.
- **Content item**: name, **type** (in the design, "Mission dialogue" and "Character dialogue"), status, progress, word count, language count, last update (who and when), ordered images, note for translators.
- **Image**: file, short title ("Station rendezvous"), order within the content item, and its **source text block**: text (from OCR, editable), _speaker_, type (e.g. "Dialogue"), context note (e.g. "After the reactor escape"), character count, and the **edited** mark if the text has been changed from the OCR result.
- **Translation**: per image and language; text, status, author, last edit date, reviewer (peer review), AI flag pending human review (v2). The speaker is inherited from the source and is read-only.
- **TranslatorNote**: style instruction attached to the content item or to the image.
- **CommentThread**: belongs to an image; language, category (e.g. "Terminology"), status (`open` | `resolved`), who resolved it, replies, `@` mentions.
- **GlossaryCategory**: Characters, Factions, Locations, Lore and any created with "New category".
- **GlossaryEntry** (per project, **Markdown type only**): title, short description (shown on cards and in the editor), category, free tags, images, Markdown content with internal links and references, view counter. **No** per-language translation fields or approval status.
- **GlossaryVersion**: saved version of an entry: content, author, date and time.

**Priority:** `Urgent`, `High`, `Medium`, `Low`, `None` (highest to lowest).
**Statuses:** `Not started`, `In progress`, `Under Review`, `Completed`.

## 4. Navigation

Two levels:

- **General:** Projects, Notifications, Assigned to me, Comments, Settings. User avatar at the bottom left.
- **Settings:** "← Back to translation space", General settings, Members, Workspace projects.

The **glossary is per project**: it is reached from the _Glossary_ card on the project and section details, and from _Full glossary_ in the editor. It is not an item in the general navigation.

> Some screenshots (project list with filters and the glossary) show the **old navigation** (Projects, Glossary). What is described here is current; on the glossary screens the active item must be _Projects_.

**No design:** Notifications, Assigned to me, Comments, General settings and Workspace projects. **[Proposal]** they are not built in v1; their navigation entries are hidden or disabled (open decision 6).

Requirements:

- Distinguish between "no project selected" and "project selected".
- General search across the user's projects.
- Managers see at a glance all projects, their progress, who works on them and whether there are pending requests.

## 5. Screens

### 5.1 Project list ("List of projects")

- **Header:** title and **Add project** button.
- **Bar:** filter button (settings icon, highlighted with a circle when active) and "Search projects" search box.
- **Table** with columns _Name, Platforms, Manager, Members, Priority, Status_:
  - Platforms as chips with a colored dot (Playstation blue, Xbox green, PC light blue, Switch red).
  - Manager(s) and members as stacked avatars.
  - Priority as an icon: Urgent (diamond with exclamation mark), High (3 bars), Medium (2), Low (1), None (dash).
  - Status as an icon: Not started (dashed circle), In progress (partial yellow circle), Under Review (orange circle with "!"), Completed (green circle with check).
  - Hover highlights the row; clicking opens the project detail (5.2).
  - **Progress per language:** hovering over the status icon shows a "Progress" popover with a bar and a % per language (in the design, with a flag: English, Spanish, Japanese, Chinese, Italian, Portuguese, German).
- **Filters:** the menu has five categories, each with a checkbox submenu:
  - _Platforms:_ Playstation, Xbox, PC, Switch.
  - _Managers_ and _Workers:_ people with avatars.
  - _Priority:_ Urgent, High, Medium, Low, None (with icon).
  - _Status:_ Not started, **In progress**, Under Review, Completed (with icon). The screenshot that says "Started" is an earlier version.
  - Applied filters appear as **removable chips** under the bar ("Status is Not Started ×", "Manager is James Fielden ×") with **Clear all filters**.
  - Several filters combine with each other (the result matches all of them). **[Proposal]** Several checkboxes within one category = any of them.
  - There is no filter by project tags (genre, etc.).
- **Sorting** (from the notes; the design shows no indicators): hovering over the header shows an arrow on sortable columns.
  - Name (default): starts A-Z; clicking again toggles A-Z / Z-A.
  - Priority: highest to lowest (Urgent → None).
  - Status: In progress > Under Review > Not started > Completed.

**Add new project (modal)**

- Title "Add new project" and subtitle "Set up the project, platforms and people."
- _Project name_ (required, `*`).
- _Platforms:_ selectable chips with a check; help text "Select all platforms this project supports."
- _Manager:_ dropdown with avatar. **Must allow several managers** (the screenshot shows single selection; according to the author, Figma is up to date).
- _Team members:_ chips with avatar and `×`, an "N added" counter and "+ Add team members".
- _Priority:_ None, Low, Medium, High, Urgent.
- **Source language** and **project languages**: decided, but the screenshot does not show them (design to be confirmed in Figma). **[Proposal]** source language required; target languages optional (they can also be added later with _Add language_).
- Actions: **Cancel** and **Create project**. Once created, it is placed according to the list's active sort order.

### 5.2 Project detail

Two-column layout. There are two versions of the screenshot: in one, the _Section Progress_ item list overflows to the right and hides the percentages. This is considered a layout bug; the version with visible percentages is the reference.

**Header**

- Project name, status badge, progress pill (e.g. _33% translated_), subtitle ("Section-based translation progress").
- **Export to code** button at the top right: downloads a JSON file with the translations.

**Left column**

- **Overview**: priority badge (_Urgent_), platforms, manager(s) and members (avatars), Project ID, Release Date, Word Count. The label says "Manager" even though there can be several.
- **Section Progress**: _Add section_ button. Each section is collapsible and shows its name, % completion and a circular indicator (partial; dashed if _Not started_). When expanded, it lists its content items with name, status badge and a progress bar colored by status (green Completed, orange Under Review, yellow In progress). No per-language breakdown. Clicking a section opens its detail view (5.3).

**Right column**

- **Glossary**: card with a description and a link to the project glossary.
- **Languages Progress**: counter ("6 languages"), list of languages with percentage and status badge, and an _Add language_ button.

### 5.3 Section detail

- **Breadcrumb:** `← All sections > Act 1 - World introduction`, with the project identifier on the right. Below the project header (name, status, % translated).
- **Section card:** name, % completion with circular indicator, description, counters (content items, words, languages), managers (avatars) and priority.
- **Glossary:** same card as in the project detail.
- **Content items** (with counter) and primary **+ Add** button:
  - "Search content in this section..." search box and "All statuses" filter.
  - **Multi-select** with checkboxes. With a selection, "N items selected", **Clear selection** and **Move to section** appear.
  - Each row: checkbox, name, status badge, % and progress bar (colored by status), subtitle with type, words and languages ("Mission dialogue · 6,400 words · 6 languages"), avatar of whoever last updated it with "Updated 2h ago", and an arrow that opens the editor (5.4).
  - Footer: "Showing all N items" and "Translation progress across all languages".
- **Languages Progress:** same card as in the project, without the _Add language_ button.
- **Move to section (popover):** list of the selected items, "Destination section" dropdown, the notice "Translations and item progress will be kept." and **Cancel** and "Move N items" buttons.

**Add content to section (modal, three states)**

- Areas: _Image ordering_ ("Click on uploaded images to add them. Drag horizontally to set order."; empty: "Selected images will appear here"), _Image preview_ ("Preview images by hovering on them") and _Image selector_ ("Drag images here", with a "+" button to browse files).
- States: no images; uploaded images not selected (thumbnails on the right, preview on hover); selected images (they appear at the top with a number that is their **order** in the translation, and are reordered by dragging).
- **What the design does not show:** confirm or cancel button, a field for the content item's **name** and **type**, each image's title, and the OCR status (open decision 3).

### 5.4 Translation editor ("Translation workspace")

Three-column layout.

**Header**

- Project name, status badge, "Translation workspace" label.
- Autosave indicator ("All changes saved") and primary **Submit for review** button, which acts on the **section** (resolved decision 17). Although the button is in the content item editor, it affects the section that contains it.
- Breadcrumb: `← All sections > Act 1 - World introduction > Bomber mission`, and the project identifier on the right.

**Left column — context**

- **Source image**: "01 / 02" counter, the scene image, file name, zoom (100%) and full screen.
- **Source text**: source language ("English · Read only"), speaker, source text and metadata (type, context note, character count). **The text can be edited by clicking on it** (a small action, not yet designed) and, if changed, the **edited** label appears. **[Proposal]** the same action covers text, speaker, type and context.
- **Images in this section** (should say "item"): thumbnails with number, title and a _Current_ / _Next_ mark, and _Previous image_ / _Next image_ buttons.

**Center column — translation**

- **Translations**: grid of cards per language with a status icon and an "x/N translated" counter. The selected card is highlighted. Help text: "Select a language to edit its translation."
- **Editor for the selected language**: language selector, status badge, _Speaker_ (inherited, locked), text area, character and line counter, "N glossary match" notice, "Edited by you · Just now" and primary **Mark translated** button.
- **Comparison between languages**: below the editor, cards for other languages appear with a language selector, status, text, author and date, and the _Edit French_ action. It is a visual comparison, not collaborative editing.
- **Note for translators** at the bottom.
- The character and line counters (against those of the source) are the only help for knowing whether the text fits; there is no preview over the scene (see section 8).

**Right column — knowledge and conversation**

- **Glossary**: _Full glossary_ link, search box (in the design, filled in with "Sector 8"), result counter and matching entries. **The design's panel shows "term → translation", usage guidance and an _Approved_ status, which no longer exist**: it must be adapted to show the Markdown entry (title, short description and tags). **[Proposal]** a match ("N glossary match") is an entry whose title appears in the source text or in the translation.
- **Comments** (scope: the current image): _Open · N_ and _Resolved · N_ tabs, language filter; threads with a language and category label, author, time, replies, _Reply to thread_, _Resolve_; on resolved ones, "Resolved by …", _View thread_ and _Reopen_; composer with `@` to mention, language selector and _Comment_ button.

**Translation statuses**: Not started → In progress → (Mark translated) → Under Review → Completed. **[Proposal]** _Submit for review_ moves the section's translations marked as translated to _Under Review_, and a manager moves them to _Completed_. The design shows the statuses but not the transitions (open decision 1).

### 5.5 Glossary (per project, Markdown entries only)

**Overview** (title "<Project> - Glossary", with icon)

- **+ New entry** button, "Search terms" search box, category chips (Characters, Factions, Locations, Lore) and **New category**.
- One section per category with **View all »** and a row of three cards (according to the notes, the most viewed). Card: title, description and tags.
- **Category filter:** the selected chip is highlighted, "New category" becomes **Clear filters** and the full grid for that category is shown in three columns.

**Entry detail**

- Back arrow, title and **Edit entry** action.
- Image gallery, tags and rendered Markdown body, with internal links to other entries and numbered references. The page scrolls. The syntax of internal links is not defined.
- "Simplified" (author's decision): the translation and approval fields are dropped. **[Proposal]** the rest of the entry (images, tags, references) stays as in the design.

**Entry editing**

- "Edit entry - <name>" with **Discard changes** / **Save changes**.
- "Live" Markdown editor (heading syntax is visible), tags with **+ Tag** and embedded images.
- **Version history** panel on the right: "Current Version" and earlier versions with date, time and author.

**Version comparison** — there are **two designs** and which one is current in Figma remains to be confirmed:

- **A. "Compare versions" page** with **Go back** and **Restore version**: two columns, _Current Version_ (green dot) and the version from the history (grey dot). Changes are highlighted on the current column: added in blue `#353967`; removed struck through on `#272729`; side bar on modified blocks.
- **B. "Older Version" modal** over the editing screen, with an orange dot, date and time, **Restore version** and a `×` close button. It shows the old version with the removed text struck through on a highlighted block.

### 5.6 Settings — Members

- "Settings" page with side navigation: "← Back to translation space", General settings, **Members**, Workspace projects. This format is the basis for the other settings pages.
- **Team Members** with a counter ("6 members") and primary **Invite members to workspace** button.
- Search by name or email, and _All categories_ and _All sub-teams_ filters.
- Table: selection checkbox (also in the header), _Member_ (initials, name and email), _Category_ (Manager / Worker dropdown), _Sub-team_ (dropdown), _Status_ (Active / Invited) and _Actions_ (**Remove**).
- Footer: "Showing all N members" and "5 active · 1 invitation pending".
- Legend: **Manager** "Manages members, sub-teams and translation reviews."; **Worker** "Translates and edits content assigned to their team."; "Removing a member keeps their existing translations."
- Workers only see what they take part in; managers see everything (simulated in v1).
- **Conflict:** the _Sub-team_ column and filter contradict the decision to leave sub-teams out of scope (open decision 4).

## 6. Business rules and vocabulary

- **Statuses (canonical):** `Not started`, `In progress`, `Under Review`, `Completed`. Order when sorting by status: In progress > Under Review > Not started > Completed.
- **Priorities (canonical):** `Urgent`, `High`, `Medium`, `Low`, `None`.
- **Progress [Proposal]:** a content item's = completed translations ÷ (images × target languages), "across all languages"; a section's = average of its items; the project's = average of its sections; a language's = completed translations in that language ÷ total images. The percentages in the design are sample data, not requirements.
- The source language does **not** count as a target language.
- Moving a content item to another section keeps its translations and progress.
- Removing a member keeps their translations.

## 7. Decisions

### Resolved

1. **Text source:** OCR on the image.
2. **Preview over the scene:** discarded (see section 8). The help for knowing whether the text fits is the character and line counters.
3. **Translation comparison:** language cards below the editor, visual; not collaborative.
4. **Priority:** Urgent, High, Medium, Low, None.
5. **Language progress:** panel with % and status per language, counter and _Add language_ button; in the list, a per-language progress popover.
6. **Sub-teams per language:** out of scope (but see the conflict in 5.6).
7. **Formats:** JSON and CSV export; PO/XLIFF import in v2.
8. **Texts per image:** one image = one text block.
9. **Source language:** configurable per project. English as a target language in the example is a mistake in the sample design.
10. **Export to code:** exports a JSON file with the translations.
11. **Inconsistent sample data:** it is filler data.
12. **Per-project glossary**, reachable from the project and section details and from the editor.
13. **Glossary with simplified Markdown entries only:** per-language term → translation and the _Approved_ status are removed.
14. **Source text editable by clicking**, with an "edited" label; no image-by-image review step.
15. **Create project modal** includes the source language (and the project languages).
16. **Status filter:** "In progress". **Several managers** per project.
17. **Submit for review** acts on the section.
18. **Terminology:** Section (act) > Content item > Image.
19. **Progress in the list:** per-language popover when hovering over the status.
20. **Figma is the visual source of truth and may be more recent than the screenshots.** Claude Code must connect to the Figma MCP and **ask every time** which version is current when a screen has several versions.

### Open — blocking the model or the flow

1. **Review transitions.** What changes a translation's status (_Mark translated_, _Submit for review_ at section level), who moves it to _Completed_ and where the reviewer is shown (the notes ask to show who translated and who reviewed; the design only shows the author). See the proposal in 5.4.
2. **Source text metadata.** OCR does not detect speaker, type or context note. **[Proposal]** the action that edits the source text covers them too.
3. **Incomplete "Add content to section" modal.** It has no confirm/cancel, content item name or type, image titles, or OCR status (progress, errors, empty text).
4. **Sub-teams.** Settings > Members has a _Sub-team_ column and filter ("Manages members, sub-teams…", "content assigned to their team"), but they were decided to be out of scope. Either they are removed from Figma, or they are kept as the worker's language assignment.
5. **Schema of the "Export to code" JSON** (what it includes: only completed translations? selectable languages? keys) and where the CSV is exported.
6. **Navigation pages without a design:** Notifications, Assigned to me, Comments, General settings, Workspace projects. **[Proposal]** they stay out of v1.
7. **Editor glossary panel.** Redesign it to show the Markdown entry (title, short description, tags) and define what a match is.
8. **Glossary version comparison:** choose between page A and modal B (see 5.5).
9. **Demo content.** There is no original game. Options under discussion: a fictional world with CC0 art, a public-domain work as the glossary universe, or an open-source game with a compatible license. Until decided, use original fictional content.

### Open — minor

- **Release Date** as a quarter ("Q3 2025"): model it as a quarter or free text.
- **"Manager" label** in the overview with several managers: change to "Managers".
- **Project tags** (genre, etc.) from the notes: they do not appear in any design.
- **Naming:** "Not-started" with a hyphen in Languages Progress; "Started" in the earlier filter.
- **Design details:** "88" and "100" without "%" in one version of the project detail; "Images in this section" instead of "item"; typos in the glossary sample data; a stray white line in Lucas Moreau's row in Settings.
- **Flags** to represent languages in the progress popover: confirm they are kept.
- **Content item types** ("Mission dialogue", "Character dialogue"): closed list or free?
- **Project icon** next to the glossary title: a project field?
- **How many comparison cards** fit at once in the editor.
- **Permissions to edit the source text** (proposal: managers).

## 8. Out of scope in v1

Real authentication, real email invitations, notifications, synchronization between users, AI translation, Kanban and Timeline views, PO/XLIFF import, pages without a design (see section 4), and **preview of the translated text over the game image**: the tool cannot rewrite the text inside the scene without rendering it with the game's own font and text box, so it is not considered even for the future.

## 9. Design references

Copy the screenshots from Attachments to `docs/design/` with descriptive names. There are duplicate screenshots: use one of each.

| Screen                                                         | Suggested file                       | Notes                                   |
| -------------------------------------------------------------- | ------------------------------------ | --------------------------------------- |
| Project list (new navigation)                                  | `proyectos-lista.png`                | Current                                 |
| Project list (old navigation)                                  | `proyectos-lista-nav-antigua.png`    | Secondary                               |
| Progress per language (popover)                                | `proyectos-progreso-popover.png`     |                                         |
| Filters: applied, Status, Workers, Platforms, Managers, Priority | `proyectos-filtros-*.png`          | Status says "Started": earlier version  |
| Filter menu (earlier version)                                  | `proyectos-filtros-menu-antiguo.png` | Secondary                               |
| Create project                                                 | `proyecto-crear.png`                 | Missing source language and several managers |
| Project detail                                                 | `proyecto-detalle.png`               | Use the version with visible percentages |
| Section detail                                                 | `seccion-detalle.png`                |                                         |
| Move to another section (popover)                              | `seccion-mover-items.png`            |                                         |
| Add content (3 states)                                         | `seccion-anadir-contenido.png`       |                                         |
| Translation editor                                             | `editor.png`                         |                                         |
| Glossary overview                                              | `glosario-overview.png`              | Old navigation                          |
| Glossary filtered by category                                  | `glosario-categoria-locations.png`   |                                         |
| Glossary detail                                                | `glosario-detalle.png`               |                                         |
| Glossary editing and history                                   | `glosario-edicion.png`               |                                         |
| Glossary comparison A (page)                                   | `glosario-comparacion-a.png`         |                                         |
| Glossary comparison B (modal)                                  | `glosario-comparacion-b.png`         |                                         |
| Settings — Members                                             | `ajustes-miembros.png`               |                                         |

> **Copyright:** the screenshots use images and text from Final Fantasy VII (game scene, character art, glossary articles) and names of other games. For a public repository, they should be replaced with original, free or public-domain content in `docs/design/` and in the demo data (open decision 9).
