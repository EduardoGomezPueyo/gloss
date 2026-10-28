# Security policy

## Supported versions

Only the latest code on `main`, which is what [gloss-app.vercel.app](https://gloss-app.vercel.app) runs, receives fixes.

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Report them privately through GitHub instead: open the repository's **Security** tab and choose **Report a vulnerability**.

Include what you found, the steps to reproduce it and the impact you expect. You should get a reply within a week. Once the problem is fixed, you are welcome to be credited in the advisory.

## Scope

Gloss v1 runs entirely in the browser: there is no backend, no accounts and no server-side storage. Everything a user creates stays in their browser's IndexedDB. The most relevant areas are:

- content that is rendered from user data, such as glossary Markdown, comments and source text (for example, script injection);
- files the app reads: workspace backups, the demo snapshot and uploaded images;
- the OCR engine and language files served from `public/ocr`.

Users, roles and permissions are simulated with a current-user selector, by design. Switching users or reaching another role's actions is not a vulnerability in v1.
