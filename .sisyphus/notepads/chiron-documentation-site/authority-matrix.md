# Chiron Documentation Authority Matrix

## Purpose

This matrix defines which surface is authoritative for which kind of documentation claim before any public docs page writing starts.

## Claim Policy Vocabulary

| Claim policy | Meaning | Required authority | Public-docs rule |
| --- | --- | --- | --- |
| `conceptual` | Explains the stable mental model, vocabulary, and intended user-facing structure. | Root README, promoted internal docs, and contracts when available. | Safe for primers and layer explainers, but must not imply unfinished behavior is shipped. |
| `current behavior` | Describes what the product and contracts support now. | Code/contracts first; promoted internal docs may support interpretation. | Use when implementation reality is present and observable in code or contracts. |
| `planned/not fully implemented` | Describes locked direction that is intentionally ahead of the current implementation. | Internal canonical docs/plans plus explicit status notes; code/contracts may contradict readiness. | Must be labeled plainly as planned, partial, deferred, scaffold-only, or not yet fully implemented. |

## Source-of-Truth Domains

| Domain | Primary audience | Owns | Allowed claim policies | Must defer to | Update rule |
| --- | --- | --- | --- | --- | --- |
| `apps/docs` public docs site | External evaluators, new users, methodology builders, operators | Product mental model, public IA, getting-started flows, layer explanations, Taskflow walkthroughs, runtime/design-time orientation | `conceptual`, `current behavior`, `planned/not fully implemented` | Root README for GitHub gateway framing; `docs/**` for canonical internal architecture intent; code/contracts for implementation reality | Update when public teaching needs change, but re-check every implementation-facing statement against contracts/code first. |
| Root `README.md` | GitHub visitors, contributors, evaluators | Project overview, setup/run/install gateway, public-docs entry, internal-docs entry, high-level status framing | `conceptual`, limited `current behavior`, limited `planned/not fully implemented` | Public docs for full teaching flow; `docs/**` for deep internal canon; code/contracts for exact implementation claims | Keep concise and gateway-oriented; do not let README become the full product handbook. |
| Internal repo docs under `docs/**` | Contributors, maintainers, implementers | Canonical architecture intent, promoted page specs, precedence rules, planning lineage, internal implementation rationale | `conceptual`, `planned/not fully implemented`, selective `current behavior` when explicitly promoted | Code/contracts when implementation reality differs; authority routing docs for precedence inside `docs/**` | Update stable promoted docs first, then routing docs, then plans/history if needed. |
| Code/contracts implementation authority | Engineers, tests, runtime consumers | Exact current behavior, schema shapes, route inventories, step taxonomy, runtime entities, persistence ownership | `current behavior` only | Nothing lower; docs must conform to this when describing shipped behavior | Any public or internal claim about shipped behavior must be reconciled here before publication. |

## Precedence Matrix

| Documentation question | Winning authority | Supporting authority | Notes |
| --- | --- | --- | --- |
| What does Chiron conceptually teach on the public site? | `apps/docs` | Root `README.md`, promoted `docs/**` | Public docs own explanation quality, not implementation truth. |
| What should the GitHub landing surface say? | Root `README.md` | `apps/docs`, `docs/README.md` | README is a gateway, not the canonical architecture handbook. |
| Which internal doc is canonical for a product surface? | `docs/README.md` + `docs/architecture/epic-3-authority.md` | Other promoted `docs/architecture/**` docs | Internal routing/precedence stays inside `docs/**`. |
| What is truly implemented right now? | Code/contracts | Promoted internal docs if aligned | If docs conflict with code/contracts, code/contracts win. |
| Can public docs describe an approved but unfinished capability? | Public docs may describe it only as `planned/not fully implemented` | Canonical internal docs/plans | Never present deferred Step Layer/runtime capabilities as already shipped. |

## Authority Notes By Surface

### 1. Public docs site (`apps/docs`)

- Public-facing source for the teaching narrative.
- Uses clear labels only: `Methodology Layer`, `Work Unit Layer`, `Workflow Layer`, `Step Layer`.
- Must not use `L1`, `L2`, or `L3` as primary page titles, nav labels, or landing-page section names.
- Uses **Taskflow** as the single running example across shared intro, design time, and runtime.

### 2. Root README

- GitHub-facing gateway.
- Should answer: what Chiron is, current status, local setup/run, where public docs live, where internal docs live.
- Can summarize status, but should not carry the full public docs corpus.

### 3. Internal docs under `docs/**`

- Canonical internal architecture and planning corpus.
- `docs/README.md` is the internal index and active-canonical router.
- `docs/architecture/epic-3-authority.md` decides which promoted docs are canonical for Epic 3 surfaces.
- Historical docs remain archived or contextual; they are not implementation truth.

### 4. Code/contracts

- Final authority for implementation reality.
- Current examples used for public-docs grounding:
  - `packages/contracts/src/runtime/overview.ts` for runtime page inventory and naming.
  - `packages/contracts/src/runtime/work-units.ts` for runtime work-unit terminology.
  - `packages/contracts/src/runtime/executions.ts` for workflow execution, transition execution, and step execution entities.
  - `packages/contracts/src/methodology/**` plus canonical docs for design-time terminology and step taxonomy.

## Public/Internal Boundary Rule

Internal docs remain canonical in `docs/**` and are linked from public-docs or README surfaces as advanced/internal references, but they are **not** mirrored wholesale into `apps/docs` and are **not** treated as first-class public navigation content.

Practical rule:

1. Public docs summarize the concept or operator-facing behavior.
2. Public docs may link to an internal doc when a contributor needs deeper architecture or implementation context.
3. Internal pages stay in-repo, keep their own authority chain, and do not become duplicated public pages.

## Public Language Rules

- Primary labels must use:
  - `Methodology Layer`
  - `Work Unit Layer`
  - `Workflow Layer`
  - `Step Layer`
- `L1/L2/L3` are glossary-only legacy bridge terms.
- Do not invent alternate product terms that conflict with contracts or promoted internal docs.

## Working Defaults For Future Page Authors

| If you are writing... | Start from | Verify with |
| --- | --- | --- |
| Shared intro / mental model pages | Root `README.md` + promoted internal docs | contracts/code for any shipped-behavior statements |
| Design Time pages | `docs/architecture/methodology-pages/**` + module structure docs | methodology contracts/code for exact nouns and scope |
| Runtime pages | runtime contracts + runtime/internal architecture docs | code/contracts first, then public simplification |
| Maturity/status notes | README + internal authority docs | implementation reality before calling anything shipped |

## Required Coverage Check

- Public docs site authority: covered
- Root README authority: covered
- Internal repo docs authority: covered
- Code/contracts implementation authority: covered
