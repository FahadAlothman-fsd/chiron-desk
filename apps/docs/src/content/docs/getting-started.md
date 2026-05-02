---
title: Getting Started
---
Chiron is for practitioners who want methodology, execution, and durable work context to stay connected instead of drifting across docs, chats, and ad-hoc tools.

## What you get today

Chiron already exposes meaningful design-time and runtime surfaces for:

- methodology versions
- work-unit authoring
- methodology facts
- dependency definitions
- project/runtime views
- transition execution detail
- workflow execution detail

The **Step Layer** is still a partial surface. Public docs call that out plainly anywhere maturity matters.

## Local setup

```bash
bun install
bun run db:push
bun run dev
```

Default local endpoints:

- Web app: `http://localhost:3001`
- API server: `http://localhost:3000`
- Docs app: `http://localhost:4303`

If you only want the docs site:

```bash
bun run dev:docs
```

To preview the production docs build locally:

```bash
bun run build:docs
bun run preview:docs
```

## How to read the docs

1. Start with the [mental model](/mental-model).
2. Read the [Taskflow overview](/taskflow/) so the running example stays consistent.
2. Move into [Design Time](/design-time/) if you are shaping methodologies.
3. Move into [Project Runtime](/project-runtime/) if you are operating or reviewing live work.

## Follow Taskflow while you read

Taskflow is the one running example across the site.

Keep this public slice in view as you move between pages:

- setup
- brainstorming
- research
- product brief
- prd
- implementation

If a page feels abstract, jump back to [/taskflow/](/taskflow/) and re-anchor the layer explanation in the same Taskflow story.

If you need the seeded method behind that runtime story, read [/methodology/](/methodology/).

## Public vs internal docs

Public docs live in `apps/docs`.

Internal architecture and planning references stay in `docs/**`. Public pages may link to that canon, but they do not mirror it wholesale into public navigation.
