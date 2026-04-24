# Chiron

Chiron is a methodology-first system for modeling and supervising agentic software delivery in a structured, inspectable way.

It gives teams durable objects for methodology versions, work units, workflows, facts, artifact slots, states, transitions, and human review. The goal is simple: turn AI-assisted delivery from a loose chain of chats into a system you can inspect, guide, and verify.

## Start here

- [Public docs](./apps/docs/) for the product overview, mental model, Taskflow example, and public layer language
- [Internal docs index](./docs/README.md) for repo-only architecture and planning canon

Public docs use these layer names:

- Methodology Layer
- Work Unit Layer
- Workflow Layer
- Step Layer

If you know the older internal shorthand, use the public docs bridge pages instead of treating `L1`, `L2`, and `L3` as the main framing.

## Current status

Chiron already has meaningful design-time and project-runtime surfaces in the repo, including methodology definitions, work-unit authoring, facts, workflows, state and transition modeling, and runtime execution views.

The Step Layer and the deepest step-execution behavior are still not fully implemented. For the full teaching flow, use the public docs. For deeper implementation intent, use the internal docs.

## Run locally

### Prerequisite

- [Bun](https://bun.sh)

### Install dependencies

```bash
bun install
```

### Set up the local database

```bash
bun run db:push
```

Optional seed data:

```bash
bun run db:seed
```

### Start the app

```bash
bun run dev
```

Default local endpoints:

- Web app: `http://localhost:3001`
- API server: `http://localhost:3000`

### Start only the docs site

```bash
bun run dev:docs
```

Docs site:

- Public docs local dev server: `http://localhost:4303`

## Useful commands

- `bun run dev` to start the main local development environment
- `bun run dev:docs` to run only the public docs site
- `bun run build` to build the repo
- `bun run build:docs` to build the public docs site
- `bun run check-types` to run TypeScript checks
- `bun run test` to run tests
- `bun run test:docs` to run the public docs smoke tests
- `bun run test:e2e` to run Playwright tests

## Install without cloning

This README will get a dedicated install-without-clone guide once that flow is documented and supported as a public onboarding path.

For now, clone the repo and use the local setup steps above.

## Repo-only internal documentation

Use the internal docs when you need the contributor-facing architecture view instead of the public product narrative.

- [Internal docs index](./docs/README.md)
- [Epic 3 authority routing](./docs/architecture/epic-3-authority.md)
- [Module structure](./docs/architecture/chiron-module-structure.md)
- [Methodology canonical authority](./docs/architecture/methodology-canonical-authority.md)
- [Module docs index](./docs/architecture/modules/README.md)
