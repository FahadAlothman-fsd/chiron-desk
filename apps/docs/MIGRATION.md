# Starlight migration note

- Migrated the public docs shell from a custom Astro implementation to Astro Starlight while keeping the existing markdown corpus, route slugs, and sidebar information architecture.
- Moved public docs content into `src/content/docs/` for the Starlight content-collection convention.
- Kept server-capable survey scaffolding in the same app: `/survey`, `POST /api/survey/launch`, and `POST /api/survey/webhook`.

## Known follow-up work

- Survey launch validation, provider handoff, webhook signature verification, and ingestion behavior are explicit TODOs only.
- The docs shell is now Starlight-based, so smoke tests should keep targeting semantic selectors instead of framework-specific DOM classes.

## Theme and authoring

- Use Starlight frontmatter and Markdown files in `src/content/docs/`.
- Chiron theme overrides live in `src/styles/starlight-custom.css`.
- Keep the survey page and API routes outside the Starlight docs collection under `src/pages/`.
