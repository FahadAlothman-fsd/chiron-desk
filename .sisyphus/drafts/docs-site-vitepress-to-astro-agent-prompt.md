# Draft: VitePress to Astro Migration Agent Prompt

## Recommended Prompt

Use this prompt with the implementation agent working in the docs-site worktree:

```md
Migrate this docs site from VitePress to Astro and keep it deployable on Vercel.

## Goal
We want one site that can handle:
- static markdown-based documentation
- a hosted survey gateway page
- secure server-side endpoints for survey launch/token validation
- a webhook route for Formbricks completion handling

The purpose of this migration is to replace a static-docs-only architecture with a single-site architecture that supports both documentation and secure server logic.

## What to build
1. Replace the current VitePress setup with an Astro docs site.
2. Preserve the existing docs content, navigation, information architecture, and markdown pages as closely as possible.
3. Keep the site compatible with deployment on Vercel.
4. Add Astro server endpoints so the site can eventually support:
   - `/survey` as a hosted survey gateway page
   - `/api/survey/launch` for secure survey launch/token validation
   - `/api/survey/webhook` for Formbricks webhook ingestion
5. Do not implement the full survey business logic unless scaffolding is required; the goal is to create the architecture and migration foundation.
6. Preserve or improve the current docs UX, including sidebar/nav structure, markdown rendering, code blocks, and internal linking.

## Constraints
- Keep everything in one Astro site/codebase.
- Optimize for maintainability and a clean Vercel deployment model.
- Do not introduce unnecessary complexity or unrelated redesign work.
- Minimize content churn: migrate the docs faithfully unless Astro requires small structural adjustments.
- If there are VitePress-only features, replace them with the closest Astro equivalent and document any differences.

## Deliverables
- Astro-based docs site replacing VitePress
- migrated markdown docs
- preserved navigation structure
- working Vercel-compatible Astro config
- scaffolded server routes/pages for future survey integration
- short migration note documenting what changed and why

## Technical expectations
- Use Astro’s docs-friendly approach for markdown content
- Use Astro server routes/endpoints for future secure survey logic
- Ensure the project can support webhook handling on Vercel
- Keep the resulting architecture suitable for:
  - static docs pages
  - interactive survey gateway UI
  - server-side validation logic
  - webhook ingestion

## Verification
- The docs site runs locally
- Existing docs pages render correctly after migration
- Internal links/navigation still work
- Astro routes exist for `/survey`, `/api/survey/launch`, and `/api/survey/webhook`
- The site is ready for Vercel deployment

Before making changes, first inspect the current VitePress structure and explain the migration plan.
After implementation, summarize:
- what was migrated
- what changed structurally
- what still needs to be implemented later for the survey flow
```

## Why this migration makes sense

- **VitePress is excellent for static docs**, but your survey flow needs secure server-side behavior.
- **Astro can keep markdown-first docs** while also giving you **server endpoints** in the same site.
- That means one deployable Vercel app can own:
  - docs pages
  - the survey gateway page
  - launch-token validation
  - webhook handling
- This avoids splitting the experience across a docs site plus a separate mini backend app.
- It also gives you a cleaner thesis/demo story: **one site, one deployment, one architecture**.

## Why not stay on VitePress

- VitePress can render the survey page UI, but secure survey launch and webhook handling become awkward and bolted-on.
- Since you already know you need server-side logic, Astro is a better fit for the long-term shape of the site.
- The migration cost is justified if the docs site is going to become a real interactive product-adjacent surface rather than stay purely static.

## Important caution

This migration is worth doing **because** you want the docs site to become the survey gateway and secure integration point.
If that requirement disappears, staying on VitePress would likely be the lower-cost option.
