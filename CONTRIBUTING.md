# Contributing to Gloss

Thanks for your interest in Gloss. v1 is complete, so the most useful contributions are bug fixes and the work listed in [Beyond v1: open for contributors](docs/ROADMAP.md#beyond-v1-open-for-contributors) (a backend, teams, PO/XLIFF export, other OCR engines).

## Before you start

- **Bugs:** open an issue with the steps to reproduce it, what you expected and what happened. A screenshot helps.
- **New features or larger changes:** open an issue first to discuss the idea, so no one spends time on something that won't be merged.
- **Security problems:** do not open a public issue; see [SECURITY.md](SECURITY.md).

Read [`docs/SPEC.md`](docs/SPEC.md) (behaviour and data model) and [`docs/DECISIONS.md`](docs/DECISIONS.md) (why things are the way they are) before changing how something works.

## Setup

Requires Node.js 20 or later.

```bash
npm install
npm run dev      # http://localhost:5173
```

To try the app with sample data, copy `.env.example` to `.env.local` and set `VITE_DEMO_URL=https://raw.githubusercontent.com/EduardoGomezPueyo/gloss-demo/main/v1/workspace.json`: a **Load demo** button appears in the sidebar.

Before opening a pull request, make sure these pass:

```bash
npm run typecheck
npm run lint
npm test
```

## Guidelines

- **Architecture:** the UI (`src/features`, `src/ui`) reads and writes data only through the repository interfaces in `src/data/repositories`, never through storage directly (an ESLint rule enforces it). OCR providers implement the interface in `src/ocr`; export formats are adapters in `src/export`.
- **Styling:** use the semantic tokens from `src/styles/tokens.css` (`bg-surface`, `text-text-secondary`…), never raw colours, and check both the dark and light themes.
- **Interface texts:** every text goes through i18next. Add each new key to both `src/i18n/locales/en.json` and `es.json` (a test checks they match). If you don't speak Spanish, add your best attempt and say so in the pull request.
- **Tests:** add or update tests for domain logic (progress, statuses, sorting, filters, export…) and for the behaviour you change. Tests use Vitest and Testing Library.
- **Language:** code, comments, commits and documentation are in English.
- **Commits:** short, imperative summaries that say what changed ("Keep read notifications listed under the Unread filter"), with a body explaining why when it isn't obvious.
- **Decisions:** if your change settles a design or technical question, add an entry to `docs/DECISIONS.md` with the reason.

## Content

Never add text, screenshots or art from commercial games to this repository, including in tests and fixtures. Use original, free or public-domain content. Demo data lives in the separate [gloss-demo](https://github.com/EduardoGomezPueyo/gloss-demo) repository.

## Pull requests

- Keep each pull request focused on one change, and describe what it does and how you tested it.
- Include a screenshot or short recording for visible UI changes.
- Pull requests are squash-merged, so the title becomes the commit message.

## License

Gloss is licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-only). By submitting a contribution, you agree that it is licensed under the same terms.
