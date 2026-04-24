---
title: Internal Docs
sidebar:
  hidden: true
---
Public docs live in `apps/docs`. Internal contributor canon stays in `docs/**`.

## Boundary rule

The public docs site teaches the product and its operator-facing model.

The internal docs tree exists for:

- architecture authority
- implementation routing
- detailed module notes
- planning lineage and historical decisions

Public pages may link to that canon as advanced resources, but they do not mirror `docs/**` into public navigation.

## When to use public docs

Stay in the public site when you want to understand:

- the Chiron mental model
- the Taskflow running example
- the Design Time track
- the Project Runtime track
- the public vocabulary for layers, facts, transitions, workflows, and steps

## When to jump to internal docs

Jump to the repo-only docs when you need:

- architecture precedence and promotion rules
- exact module boundaries
- internal page specs and design records
- contributor-facing implementation context

## Recommended internal entry points

- `docs/README.md`
- `docs/architecture/epic-3-authority.md`
- `docs/architecture/chiron-module-structure.md`
- `docs/architecture/methodology-canonical-authority.md`
- `docs/architecture/modules/README.md`

## Why these docs stay separate

The split keeps the public site readable.

- Public docs explain how to use and reason about Chiron.
- Internal docs preserve deeper engineering context without turning the public site into a repo mirror.
- Code and contracts remain the final authority for exact shipped behavior.

## See also

- [Claim Policy](/reference/claim-policy)
- [Glossary](/reference/glossary)
- [Getting Started](/getting-started)
