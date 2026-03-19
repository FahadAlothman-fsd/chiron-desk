# Chiron - AI Assistant Instructions

<!-- effect-solutions:start -->

## Effect Best Practices

**IMPORTANT:** Always consult effect-solutions before writing Effect code.

1. Run `effect-solutions list` to see available guides
2. Run `effect-solutions show <topic>...` for relevant patterns (supports multiple topics)
3. Search `~/.local/share/effect-solutions/effect` for real implementations

Topics: quick-start, project-setup, tsconfig, basics, services-and-layers, data-modeling, error-handling, config, testing, cli.

Never guess at Effect patterns - check the guide first.

<!-- effect-solutions:end -->

## Local Effect Source

The Effect repository is cloned to `~/.local/share/effect-solutions/effect` for reference.
Use this to explore APIs, find usage examples, and understand implementation
details when the documentation isn't enough.

## Project Overview

This is a Better-T-Stack monorepo with:

- **Frontend**: React + TanStack Router + shadcn/ui
- **Backend**: Hono + oRPC
- **Database**: SQLite/Turso with Drizzle ORM
- **Authentication**: Better-Auth
- **Runtime**: Bun
- **Build System**: Turborepo

## Effect Setup

- Effect Language Service is installed and configured in `tsconfig.base.json`
- To enable build-time diagnostics: `bunx effect-language-service patch`
- Run `prepare` script after install to patch TypeScript

## Important Notes

- **Schema**: Use `effect/Schema` (not `@effect/schema`, which is deprecated since Effect 3.10)
- **Module Resolution**: Bundler mode for apps, NodeNext for libraries
- **TypeScript**: Always use workspace version in VS Code/Cursor
