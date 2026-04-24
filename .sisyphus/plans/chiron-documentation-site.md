# Chiron Documentation Site and Corpus Plan

## TL;DR
> **Summary**: Build a public VitePress docs site in `apps/docs` that teaches Chiron through a shared mental model plus two operational tracks—Design Time and Project Runtime—while keeping internal/developer documentation in-repo and repositioning the root README as a GitHub-facing gateway.
> **Deliverables**:
> - Public docs information architecture and migration-ready corpus aligned to actual code/contracts
> - `apps/docs` VitePress app with Vercel-native auto-deploy from Git changes
> - README repositioned to setup/run/install gateway role
> - Separate in-repo internal docs section/index with explicit public/internal boundaries
> - Docs-specific verification via existing Vitest/Playwright conventions
> **Effort**: Large
> **Parallel**: YES - 4 waves
> **Critical Path**: Source-of-truth matrix → docs app scaffold → public corpus pages → README/internal separation → deployment/test verification

## Context
### Original Request
- Fully document Chiron for helpers and users.
- Publish the docs into a deployable documentation site.
- Research easy hosting with automatic deploys from Git changes.
- Focus the work plan on building the site.
- Create the actual documentation content structure/content drafts in this session.
- Cover both design time and project runtime, with screenshots where needed.

### Interview Summary
- Public docs site must explain how to use Chiron, not expose internal implementation as first-class content.
- Public docs should use clear layer names: `Methodology Layer`, `Work Unit Layer`, `Workflow Layer`, `Step Layer`.
- Legacy `L1/L2/L3` labels remain internal/legacy only.
- Public docs open with a shared high-level hierarchy/mental model, then split into two tracks:
  - **Design Time** for methodology builders
  - **Project Runtime** for operators/users
- Shared intro uses the **Taskflow** example project site-wide.
- Shared intro uses three representative Taskflow scenario slices:
  - setup/onboarding
  - fan-out/delegation
  - review/rework
  Branching and artifact production are embedded inside those slices rather than getting standalone intro examples.
- Design Time structure is grounded in the implemented model:
  - Methodology Layer
  - Work Unit Layer
  - Workflow Layer
  - Step Layer
- Methodology Layer stays global and covers methodology-wide facts, dependency definitions, and work-unit catalog/pointers; versioning is only mentioned briefly.
- Work Unit Layer gets overview + deep dives for facts, artifact slots, workflows, transitions/state machine; workflows and transitions are taught separately but linked via workflow bindings.
- Workflow Layer gets one overview page with workflow context facts as a first-class subsection, plus separate step-semantics pages.
- Step Layer gets one page per step type: `form`, `agent`, `action`, `invoke`, `display`, `branch`.
- Runtime track gets overview + deep dives for project facts, work unit instances, workflow executions, and step executions.
- Each runtime page must explicitly link back to the design-time layer/contract that defines it.
- Runtime pages should lead with operator-observable actions/surfaces, then explain underlying runtime state.
- Root `README.md` becomes GitHub-facing: what Chiron is, local setup/run, later install guidance, and links to internal docs.
- Internal/developer docs stay in a clearly separate in-repo section and are not first-class public docs-site content.
- Framework: **VitePress**.
- Hosting/deploy: **Vercel** with native Git integration.
- Verification posture: **tests-after**, reusing existing Vitest + Playwright conventions.

### Metis Review (gaps addressed)
- Added a required **source-of-truth matrix** to prevent drift between public docs, README, internal docs, and code/contracts.
- Added a **terminology bridge** so public docs use clear layer names while legacy L1/L2/L3 remain glossary-only.
- Added a **claim policy** so public pages distinguish conceptual model, current product behavior, and planned/not-fully-implemented behavior.
- Added guardrails for VitePress/Turbo output alignment and Playwright base-URL separation from the existing web-app setup.
- Added public/internal boundary rules so `docs/**` remains internal canon and is not mirrored wholesale into the public site.

## Work Objectives
### Core Objective
Deliver a decision-complete public documentation system for Chiron that accurately reflects the code/contracts, teaches the product through a coherent layer model and running Taskflow example, and ships as a standalone docs app with automated deployment and agent-executable verification.

### Deliverables
- `apps/docs` VitePress application wired into the Bun/Turborepo monorepo.
- Public docs IA and page inventory with exact slugs and content authority mapping.
- Public docs corpus covering shared intro, Design Time track, and Project Runtime track.
- Public/internal documentation separation model and internal-doc index strategy.
- Root README rewritten as GitHub-facing gateway.
- Vercel deployment configuration through project settings/native Git integration.
- Docs-specific automated verification commands and Playwright smoke coverage.

### Definition of Done (verifiable conditions with commands)
- Public docs build successfully from the monorepo using documented package-level scripts.
- Generated VitePress output directory exists after build.
- Public docs homepage renders and exposes shared hierarchy + Design Time + Project Runtime entry points.
- Public docs use clear layer names and do not expose `L1`, `L2`, `L3` as primary nav/page headings.
- Runtime deep-dive pages visibly link back to their defining design-time contract pages.
- Internal docs are not exposed as first-class public-site nav/content.
- Root README exposes setup/run guidance plus links to public docs and internal docs.
- Verification commands pass:
  - `bun run check-types`
  - `bun run build`
  - `bun run test`
  - docs-specific Playwright smoke test command

### Must Have
- One public docs site under `apps/docs`.
- Public docs focused on usage and operational understanding.
- Site-wide Taskflow example.
- Shared intro with concepts plus representative scenarios.
- Design Time and Project Runtime split.
- Public/internal docs separation.
- README repositioning.
- Vercel-native auto-deploy from Git changes.

### Must NOT Have
- No public-site-first internal implementation handbook.
- No bulk mirroring of `docs/**` into the public docs site.
- No primary use of `L1/L2/L3` in public nav or page titles.
- No overclaiming unfinished Step Layer/runtime behavior.
- No versioned docs/blog/search/analytics/custom interactive platform extras unless required by implementation reality.
- No reliance on the existing web-app Playwright base URL for docs smoke tests.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: **tests-after** using existing Vitest + Playwright patterns.
- QA policy: Every task includes agent-executed verification and evidence.
- Evidence:
  - `.sisyphus/evidence/task-{N}-{slug}.txt`
  - `.sisyphus/evidence/task-{N}-{slug}.png`
  - `test-results/artifacts/**`
  - `test-results/junit.xml`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.

Wave 1: governance + monorepo/docs-app foundation
- source-of-truth matrix and page inventory
- public/internal docs boundary/index strategy
- `apps/docs` scaffold + package scripts
- Turbo/VitePress fit + docs preview/test port strategy

Wave 2: shared intro + Design Time corpus
- shared hierarchy + Taskflow running example
- Methodology Layer pages
- Work Unit Layer overview + deep dives

Wave 3: Workflow/Step + Runtime corpus
- Workflow Layer overview + workflow context facts
- Step Layer pages for all step types
- Project Runtime overview + deep dives + design-time backlinks

Wave 4: repo gateway + deployment + smoke verification
- README repositioning
- internal-doc linking/index cleanup
- Vercel deployment hookup
- docs-specific Playwright smoke coverage + final repo checks

### Dependency Matrix (full, all tasks)
| Task | Depends On | Blocks |
|---|---|---|
| 1 | — | 2,3,5,6,7,8,9,10 |
| 2 | 1 | 5,6,7,8,9,10 |
| 3 | 1 | 4,10,11,12 |
| 4 | 3 | 11,12 |
| 5 | 1,2 | 6,7,8,9 |
| 6 | 1,2,5 | 8,9 |
| 7 | 1,2,5 | 8,9 |
| 8 | 1,2,5,6,7 | 9,12 |
| 9 | 1,2,5,6,7,8 | 12 |
| 10 | 1,2,3 | 11,12 |
| 11 | 3,4,10 | 12 |
| 12 | 4,8,9,10,11 | F1-F4 |

### Agent Dispatch Summary
- Wave 1 → 4 tasks → deep / writing / visual-engineering / unspecified-high
- Wave 2 → 3 tasks → writing-heavy content work
- Wave 3 → 3 tasks → writing / unspecified-high
- Wave 4 → 3 tasks → writing / unspecified-high

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Establish authority matrix and public page inventory

  **What to do**: Create the documentation governance foundation before any page writing. Define a source-of-truth matrix covering public docs site, root README, internal repo docs under `docs/**`, and code/contracts as implementation authority. Produce a full public page inventory with exact slugs, page purpose, target audience, authority sources, and claim policy (`conceptual`, `current behavior`, `planned/not fully implemented`). Include the public/internal boundary rule that internal docs are linked from public/docs README surfaces but are not mirrored as first-class public content.
  **Must NOT do**: Do not physically relocate the internal canonical docs tree. Do not invent new product terminology that conflicts with code/contracts. Do not allow `L1/L2/L3` into public page titles or nav labels.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: this sets the authority model that all later writing and implementation depend on.
  - Skills: []
  - Omitted: [`grill-me`] - interview is already complete; execution should apply the locked decisions directly.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2,3,5,6,7,8,9,10 | Blocked By: —

  **References**:
  - Pattern: `docs/README.md:6-18` - internal canonical index and precedence posture to follow for repo-only docs.
  - Pattern: `docs/README.md:39-67` - archive/not-delete governance to preserve.
  - Pattern: `docs/architecture/epic-3-authority.md` - canonical routing/precedence for architecture pages.
  - Pattern: `docs/architecture/chiron-module-structure.md:146-160` - implemented ownership split across methodology version, work unit, workflow.
  - Pattern: `docs/architecture/methodology-canonical-authority.md:14-27` - canonical table-level split for methodology surfaces.

  **Acceptance Criteria**:
  - [ ] A source-of-truth matrix exists in the working docs artifacts and covers public docs, README, internal docs, and code/contracts.
  - [ ] Public page inventory lists exact slugs for shared intro, Design Time pages, Runtime pages, and glossary/bridge pages.
  - [ ] Every public page has at least one listed authority source.
  - [ ] Public inventory explicitly bans `L1/L2/L3` as primary nav labels.

  **QA Scenarios**:
  ```
  Scenario: Authority matrix complete
    Tool: Bash
    Steps: Run the repository grep/check command that verifies the generated inventory artifact contains entries for public docs, README, internal docs, and code/contracts authorities.
    Expected: All four authority domains are present with no missing section.
    Evidence: .sisyphus/evidence/task-1-authority-matrix.txt

  Scenario: Legacy labels blocked from public IA
    Tool: Bash
    Steps: Search the generated public page inventory for nav/page-title usage of `L1`, `L2`, `L3`.
    Expected: No primary public page title or nav label uses `L1`, `L2`, or `L3`.
    Evidence: .sisyphus/evidence/task-1-legacy-labels.txt
  ```

  **Commit**: YES | Message: `docs(plan): define public docs authority model` | Files: `apps/docs/**`, `README.md`, `docs/**` planning/index files as needed

- [x] 2. Separate public docs from internal repo docs

  **What to do**: Create the structural boundary between public and internal documentation. Keep internal/developer docs in a dedicated in-repo section rooted in existing `docs/**`, add or refine an internal index if needed, and ensure the public docs plan references internal docs only as linked advanced resources. Define which current internal docs remain canon, which are archive-only, and which should be linked from README but excluded from public-site navigation.
  **Must NOT do**: Do not publish `docs/architecture/**` wholesale into public navigation. Do not create duplicate copies of internal docs inside `apps/docs`.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: this is documentation IA/governance work.
  - Skills: []
  - Omitted: [`web-design-guidelines`] - boundary/index work matters more than UI review here.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 5,6,7,8,9,10 | Blocked By: 1

  **References**:
  - Pattern: `docs/README.md:6-18` - internal documentation index precedent.
  - Pattern: `docs/README.md:62-67` - rules for maintaining active vs archive structure.
  - Pattern: `README.md:420-438` - current “Where to read next” section to simplify and relink.

  **Acceptance Criteria**:
  - [ ] Internal docs have a clearly defined in-repo section/index.
  - [ ] Public docs inventory explicitly marks internal docs as linked advanced resources, not public content.
  - [ ] No public sidebar/nav spec includes raw internal canonical tree sections such as `docs/architecture` as first-class public nav groups.

  **QA Scenarios**:
  ```
  Scenario: Public/internal boundary encoded
    Tool: Bash
    Steps: Search the docs inventory/config artifacts for internal-doc markers and for forbidden direct nav groups exposing `docs/architecture`.
    Expected: Internal docs appear only as external/internal links or notes, not as public top-level nav groups.
    Evidence: .sisyphus/evidence/task-2-boundary.txt

  Scenario: Internal index still discoverable
    Tool: Bash
    Steps: Verify README/internal index references resolve to the intended repo-local internal docs section.
    Expected: At least one explicit README/internal index path points to the repo-only docs section.
    Evidence: .sisyphus/evidence/task-2-internal-index.txt
  ```

  **Commit**: YES | Message: `docs(repo): separate public and internal documentation` | Files: `docs/**`, `README.md`, `apps/docs/**` nav/spec files

- [x] 3. Scaffold `apps/docs` VitePress app as a first-class monorepo package

  **What to do**: Create a standalone VitePress app in `apps/docs` with its own `package.json`, scripts, config, theme/nav scaffolding, and content root. Wire it into the Bun/Turborepo monorepo as a real app rather than root-only script glue. Add a homepage, top-level nav, sidebar groups, and a stable docs preview command/port. Ensure page sources live where public docs belong and do not require runtime server dependencies.
  **Must NOT do**: Do not build the docs into `apps/web`. Do not make the docs site depend on `apps/server` or database state. Do not import the internal docs tree wholesale.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: site scaffold, nav, and documentation UI shell.
  - Skills: []
  - Omitted: [`vercel-react-best-practices`] - VitePress scaffold is not a React app concern.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 4,10,11,12 | Blocked By: 1

  **References**:
  - Pattern: `package.json:4-8` - monorepo workspace structure (`apps/*`, `packages/*`).
  - Pattern: `turbo.json:6-20` - existing build/test task behavior that docs app must fit.
  - Pattern: `apps/web/package.json` - package-level script pattern to mirror for a first-class app.
  - External: `https://vercel.com/docs/monorepos` - monorepo deployment support.

  **Acceptance Criteria**:
  - [ ] `apps/docs` exists as a standalone app/package with installable scripts.
  - [ ] Docs app starts locally on a fixed preview/dev URL defined in package scripts or docs config.
  - [ ] VitePress homepage, nav, and sidebar scaffolding exist.
  - [ ] Public docs content root is separate from internal docs canon.

  **QA Scenarios**:
  ```
  Scenario: Docs app boots locally
    Tool: Bash
    Steps: Run the docs app dev or preview command from the workspace and wait for the configured local URL to respond.
    Expected: The docs site serves a homepage successfully on the declared docs port.
    Evidence: .sisyphus/evidence/task-3-docs-boot.txt

  Scenario: Docs app is package-level, not root-only
    Tool: Bash
    Steps: Inspect the workspace scripts/package graph for `apps/docs` package scripts.
    Expected: `apps/docs` owns its own build/dev/preview scripts instead of relying only on root ad hoc commands.
    Evidence: .sisyphus/evidence/task-3-package-scripts.txt
  ```

  **Commit**: YES | Message: `docs(app): scaffold vitepress docs app` | Files: `apps/docs/**`, `package.json`, `turbo.json`

- [x] 4. Align Turbo and docs-specific verification plumbing

  **What to do**: Make the new docs app fit the existing monorepo task system. Add/adjust package scripts and Turbo behavior so docs build outputs and Markdown/content inputs are tracked correctly. Establish a docs-specific preview port and a docs-specific Playwright smoke-test command that does not reuse the existing web-app `BASE_URL`. Ensure docs build artifacts are generated in a predictable output path and are usable for Vercel deployment and local verification.
  **Must NOT do**: Do not leave docs build caching/output behavior implicit. Do not let docs smoke tests point at `http://localhost:3001` unless that is intentionally changed for the docs app.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: monorepo/task-pipeline + test-plumbing work.
  - Skills: [`turborepo`] - needed to align package tasks, outputs, and inputs correctly.
  - Omitted: [`deploy-to-vercel`] - deployment comes later; this task is local task-system fit.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 11,12 | Blocked By: 3

  **References**:
  - Pattern: `turbo.json:6-20` - current task and output defaults.
  - Pattern: `playwright.config.ts:3-24` - current base URL defaults that must not silently target the docs site.
  - Pattern: `package.json:51-57` - existing root verification commands to integrate with.
  - Pattern: `tests/README.md:1-96` - existing Playwright conventions.

  **Acceptance Criteria**:
  - [ ] Docs build output path is explicit and compatible with Turbo/Vercel expectations.
  - [ ] Docs content inputs are included in build invalidation.
  - [ ] A docs-specific smoke-test command exists and targets the docs URL, not the web-app default.
  - [ ] Root verification instructions include docs app build/test participation where appropriate.

  **QA Scenarios**:
  ```
  Scenario: Docs build emits expected artifact directory
    Tool: Bash
    Steps: Run the docs build command and verify the configured VitePress output directory exists afterward.
    Expected: The expected docs artifact directory is present and non-empty.
    Evidence: .sisyphus/evidence/task-4-build-output.txt

  Scenario: Docs smoke tests target docs URL
    Tool: Bash
    Steps: Inspect and run the docs-specific smoke-test command/env configuration.
    Expected: The smoke-test command resolves to the docs preview/dev URL rather than the existing web-app base URL.
    Evidence: .sisyphus/evidence/task-4-docs-base-url.txt
  ```

  **Commit**: YES | Message: `build(docs): align turbo outputs and docs qa commands` | Files: `apps/docs/**`, `turbo.json`, `package.json`, `playwright.config.*`, `tests/**`

- [x] 5. Draft the shared intro, hierarchy, glossary, and Taskflow scenario spine

  **What to do**: Write the public entry pages that establish the mental model. Create the homepage/shared intro that explains Chiron at a high level, introduces the Design Time and Project Runtime split, and uses the Taskflow example consistently. Add the terminology bridge/glossary so public pages use the clear layer names while legacy `L1/L2/L3` appear only in glossary/history contexts. Structure the shared intro around three representative Taskflow scenario slices: setup/onboarding, fan-out/delegation, and review/rework, with branching and artifact production embedded inside those narratives.
  **Must NOT do**: Do not teach deep workflow context fact kinds in the shared intro. Do not duplicate internal architecture prose wholesale. Do not present Taskflow as a hardcoded product requirement rather than an illustrative example.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: this is high-value explanatory prose and IA content.
  - Skills: []
  - Omitted: [`bmad-cis-storytelling`] - narrative clarity matters, but the docs must stay technical and product-grounded rather than becoming marketing prose.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 6,7,8,9 | Blocked By: 1,2

  **References**:
  - Pattern: `README.md:1-56` - current high-level product framing to shrink/reframe rather than copy verbatim.
  - Pattern: `README.md:128-285` - current taxonomy/example material that can be selectively reworked.
  - Pattern: `docs/architecture/chiron-module-structure.md:146-160` - implemented layer ownership framing.

  **Acceptance Criteria**:
  - [ ] Shared intro exists and links to both Design Time and Project Runtime tracks.
  - [ ] Shared intro uses the Taskflow example consistently.
  - [ ] Glossary/bridge page explains clear layer names and confines `L1/L2/L3` to legacy/internal context only.
  - [ ] Shared intro remains high-level and defers fact-kind specifics to layer pages.

  **QA Scenarios**:
  ```
  Scenario: Shared intro renders core structure
    Tool: Playwright
    Steps: Open the docs homepage/shared intro page; verify visible links or section headings for `Design Time`, `Project Runtime`, and `Taskflow`.
    Expected: All three are present and navigable from the shared intro.
    Evidence: .sisyphus/evidence/task-5-shared-intro.png

  Scenario: Legacy labels are glossary-only
    Tool: Bash
    Steps: Search public nav and major page headings for `L1`, `L2`, `L3`.
    Expected: Legacy labels appear only in the glossary/bridge context, not as primary page/nav labels.
    Evidence: .sisyphus/evidence/task-5-legacy-bridge.txt
  ```

  **Commit**: YES | Message: `docs(content): add shared intro and taskflow spine` | Files: `apps/docs/**`

- [x] 6. Write Methodology Layer and Work Unit Layer public docs

  **What to do**: Create the Design Time docs for `Methodology Layer` and `Work Unit Layer`. Methodology Layer must stay global: methodology-wide facts, dependency definitions as a first-class subsection, work-unit catalog/pointers, and only a brief note on versioning/publishing. Work Unit Layer must include one overview page plus deep dives for facts, artifact slots, workflows, and transitions/state machine. Teach transitions and workflows as separate concepts linked by explicit workflow bindings. Use Taskflow examples and screenshot placeholders where appropriate.
  **Must NOT do**: Do not collapse Methodology Layer and Work Unit Layer into one page. Do not demote artifact slots to “just outputs.” Do not let versioning dominate the Design Time explanation.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: precise concept pages with structural depth.
  - Skills: []
  - Omitted: [`web-design-guidelines`] - content accuracy and structure matter before UI polish.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8,9 | Blocked By: 1,2,5

  **References**:
  - Pattern: `docs/architecture/methodology-pages/methodology-facts.md` - methodology-facts semantics.
  - Pattern: `docs/architecture/methodology-pages/work-units/overview.md` - work-unit conceptual surface.
  - Pattern: `docs/architecture/methodology-pages/work-units/detail-tabs.md` - work-unit tab/deep-dive decomposition.
  - Pattern: `docs/architecture/methodology-pages/artifact-slots-design-time.md` - artifact slot contract framing.
  - Pattern: `packages/contracts/src/methodology/fact.ts` - methodology/work-unit fact contract authority.
  - Pattern: `packages/db/src/schema/methodology.ts` - methodology/work-unit persistence authority.

  **Acceptance Criteria**:
  - [ ] Methodology Layer page exists and covers global facts, dependency definitions, and work-unit catalog/pointers.
  - [ ] Versioning/publishing is present only as a brief contextual note.
  - [ ] Work Unit Layer has one overview page plus deep-dive pages for facts, artifact slots, workflows, and transitions/state machine.
  - [ ] Artifact slots are described as first-class contract surfaces.
  - [ ] Workflows and transitions are explained separately, with workflow bindings as their bridge.

  **QA Scenarios**:
  ```
  Scenario: Methodology and Work Unit pages present expected sections
    Tool: Playwright
    Steps: Navigate from Design Time entry to Methodology Layer and Work Unit Layer pages; inspect visible headings/links for `Dependency Definitions`, `Facts`, `Artifact Slots`, `Workflows`, `Transitions`.
    Expected: All named sections/pages are present and reachable.
    Evidence: .sisyphus/evidence/task-6-design-time-pages.png

  Scenario: Versioning is de-emphasized
    Tool: Bash
    Steps: Search Methodology Layer page for versioning-related headings and count prominence relative to main sections.
    Expected: Versioning appears only as a brief contextual section or note, not as the dominant page structure.
    Evidence: .sisyphus/evidence/task-6-versioning.txt
  ```

  **Commit**: YES | Message: `docs(content): add methodology and work unit layers` | Files: `apps/docs/**`

- [x] 7. Write Workflow Layer overview and Step Layer pages

  **What to do**: Create the Workflow Layer overview page plus Step Layer pages. Workflow Layer must explain the workflow graph/model and include workflow context facts as a first-class subsection without overloading the shared intro. Step Layer must provide one page per step type: `form`, `agent`, `action`, `invoke`, `display`, `branch`. Each step page must explain capabilities, constraints, inputs/outputs, and Taskflow-backed usage examples. Explicitly mark not-yet-fully-implemented behavior where necessary so public docs do not overclaim.
  **Must NOT do**: Do not merge all step semantics into one unreadable page. Do not hide implementation gaps. Do not misstate workflow context fact relationships or present fake universal propagation rules.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: concept-heavy explanatory pages.
  - Skills: []
  - Omitted: [`effect-best-practices`] - not relevant to public docs prose.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 9,12 | Blocked By: 1,2,5,6

  **References**:
  - Pattern: `docs/architecture/methodology-pages/workflow-editor/*.md` - current canonical step/workflow editor docs.
  - Pattern: `packages/contracts/src/methodology/workflow.ts` - workflow and context-fact contract authority.
  - Pattern: `packages/contracts/src/mcp/context-fact-crud-v2.ts` - context-fact family/kind authority.
  - Pattern: `packages/methodology-engine/src/services/workflow-service.ts` - workflow ownership under work-unit scope.
  - Pattern: `packages/methodology-engine/src/services/*step-definition-service.ts` - step-type semantics authority.

  **Acceptance Criteria**:
  - [ ] Workflow Layer overview exists and includes a first-class workflow context facts subsection.
  - [ ] Step Layer has six dedicated step pages.
  - [ ] Each step page includes capabilities, constraints, and a Taskflow example.
  - [ ] Any incomplete current behavior is explicitly labeled as such.

  **QA Scenarios**:
  ```
  Scenario: Step pages complete and navigable
    Tool: Playwright
    Steps: Open the Step Layer index and navigate to `form`, `agent`, `action`, `invoke`, `display`, and `branch` pages.
    Expected: All six pages exist and load successfully.
    Evidence: .sisyphus/evidence/task-7-step-pages.png

  Scenario: Incomplete behavior is not overclaimed
    Tool: Bash
    Steps: Search Workflow/Step docs for required implementation-status callouts around unfinished behavior.
    Expected: Pages touching incomplete Step Layer/runtime behavior include explicit current-vs-planned labeling.
    Evidence: .sisyphus/evidence/task-7-status-callouts.txt
  ```

  **Commit**: YES | Message: `docs(content): add workflow and step layers` | Files: `apps/docs/**`

- [x] 8. Write Project Runtime overview and deep dives with back-links

  **What to do**: Create the public `Project Runtime` track. Add one overview page plus deep dives for project facts, work unit instances, workflow executions, and step executions. Each page must lead with what the operator can observe/do in Taskflow, then explain the runtime object/state behind it. Each runtime page must include a visible link back to the design-time layer or contract that defines it. Include branching/review/artifact behavior only insofar as it is observable in runtime execution.
  **Must NOT do**: Do not write runtime pages as pure schema dumps. Do not omit the back-links to defining design-time contracts. Do not assume readers know the design-time layers already.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: operator-oriented explanatory prose with structural linkage.
  - Skills: []
  - Omitted: [`review-work`] - final review belongs in the verification wave, not in task execution.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 12 | Blocked By: 1,2,5,6,7

  **References**:
  - Pattern: `packages/contracts/src/runtime/overview.ts` - runtime surface inventory authority.
  - Pattern: `packages/contracts/src/runtime/executions.ts` - execution-level contract authority.
  - Pattern: `packages/db/src/schema/runtime.ts` - runtime persistence authority.
  - Pattern: `apps/web/src/routes/projects*` - existing runtime UI surface inventory.
  - Pattern: `packages/api/src/routers/project-runtime.ts` - runtime backend/router grouping.

  **Acceptance Criteria**:
  - [ ] Runtime overview exists and links to project facts, work unit instances, workflow executions, and step executions pages.
  - [ ] Each runtime deep-dive page begins with observable operator actions/surfaces.
  - [ ] Each runtime deep-dive page visibly links back to the design-time layer or contract that defines it.
  - [ ] Runtime pages use the Taskflow example consistently.

  **QA Scenarios**:
  ```
  Scenario: Runtime pages expose expected deep dives
    Tool: Playwright
    Steps: Navigate from `Project Runtime` entry to each deep-dive page and verify visible headings for the four runtime surfaces.
    Expected: All four runtime pages exist and are reachable from the runtime overview.
    Evidence: .sisyphus/evidence/task-8-runtime-pages.png

  Scenario: Runtime pages include design-time back-links
    Tool: Playwright
    Steps: Open each runtime deep-dive page and inspect for a visible link/section referencing the defining design-time page/contract.
    Expected: Each page contains a visible back-link to its originating design-time definition.
    Evidence: .sisyphus/evidence/task-8-runtime-backlinks.txt
  ```

  **Commit**: YES | Message: `docs(content): add project runtime track` | Files: `apps/docs/**`

- [x] 9. Add screenshot placeholders and Taskflow scenario consistency checks across pages

  **What to do**: Thread the running Taskflow example consistently across shared intro, Design Time, and Project Runtime pages. Add explicit screenshot placeholder callouts anywhere a visual is needed but not yet supplied. Ensure the three scenario slices (setup/onboarding, fan-out/delegation, review/rework) are distributed coherently across the site, with branching and artifact production embedded where relevant instead of silently disappearing.
  **Must NOT do**: Do not leave visuals implied without placeholders. Do not let different pages rename or reinterpret Taskflow entities inconsistently. Do not create separate unrelated example projects.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: consistency and content-governance pass.
  - Skills: []
  - Omitted: [`frontend-ui-ux`] - placeholders and content consistency come before design polish.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 12 | Blocked By: 5,6,7,8

  **References**:
  - Pattern: `apps/web/public/visuals/**` - existing visual asset/source locations that may be reused or referenced.
  - Pattern: `.sisyphus/evidence/*.png` - prior screenshot/evidence naming precedent.

  **Acceptance Criteria**:
  - [ ] Taskflow remains the single running example across public docs.
  - [ ] Each page that needs visuals contains either a concrete screenshot or an explicit screenshot placeholder.
  - [ ] All three representative scenario slices are represented somewhere in the public corpus.

  **QA Scenarios**:
  ```
  Scenario: Taskflow consistency across corpus
    Tool: Bash
    Steps: Search public docs content for `Taskflow` and scenario-slice anchors.
    Expected: Shared intro, Design Time, and Project Runtime pages all reference the same Taskflow example model.
    Evidence: .sisyphus/evidence/task-9-taskflow-consistency.txt

  Scenario: Visual placeholders are explicit
    Tool: Bash
    Steps: Search public docs for placeholder markers on pages that reference screenshots/visual walkthroughs.
    Expected: Pages requiring visuals include explicit placeholder text instead of silently omitting intended visuals.
    Evidence: .sisyphus/evidence/task-9-placeholders.txt
  ```

  **Commit**: YES | Message: `docs(content): align taskflow example and visual placeholders` | Files: `apps/docs/**`

- [x] 10. Reposition root README as GitHub-facing gateway

  **What to do**: Rewrite `README.md` so it becomes the GitHub-facing entrypoint. Keep a concise overview of what Chiron is, how to set it up and run it locally, and a placeholder/brief section for future install-without-clone guidance. Add clear links to the public docs site and to the repo-only internal documentation section. Remove the README’s role as the primary deep conceptual handbook and replace outdated public framing around `L1/L2/L3` with the new public language or outbound links.
  **Must NOT do**: Do not duplicate the full public docs corpus inside README. Do not keep the old long-form layer taxonomy as the README’s main body structure. Do not remove setup/run instructions.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: README restructuring is primarily technical writing.
  - Skills: []
  - Omitted: [`bmad-agent-tech-writer`] - not necessary; the task is bounded and repo-specific.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 11,12 | Blocked By: 1,2,3

  **References**:
  - Pattern: `README.md:1-438` - current README to replace/reframe.
  - Pattern: `package.json:35-57` - setup/run/test scripts that must remain discoverable.
  - Pattern: `docs/README.md` - internal-docs destination to link toward.

  **Acceptance Criteria**:
  - [ ] README still explains what Chiron is at a high level.
  - [ ] README contains working local setup/run instructions.
  - [ ] README includes a public docs link and an internal docs link.
  - [ ] README no longer acts as the main conceptual handbook for all layers and runtime semantics.

  **QA Scenarios**:
  ```
  Scenario: README remains runnable
    Tool: Bash
    Steps: Verify README still contains setup/run command references that match current scripts.
    Expected: Setup/run instructions mention valid current commands such as install, dev, build, and tests.
    Evidence: .sisyphus/evidence/task-10-readme-commands.txt

  Scenario: README points outward correctly
    Tool: Bash
    Steps: Search README for links to the public docs site and internal repo-only docs section.
    Expected: Both links are present and clearly labeled.
    Evidence: .sisyphus/evidence/task-10-readme-links.txt
  ```

  **Commit**: YES | Message: `docs(repo): reposition root readme` | Files: `README.md`

- [x] 11. Hook the docs app to Vercel-native deployment

  **What to do**: Configure the deployment model for the docs app using Vercel’s native Git integration for the monorepo. Define the project root/output expectations, build/install commands, environment assumptions, and preview/production behavior for `apps/docs`. Document the deployment setup in repo docs so future maintainers know how the docs site auto-deploys from Git changes. If the implementation requires a small repo config artifact (for example, Vercel project-local config), keep it limited to docs-site deployment needs.
  **Must NOT do**: Do not require GitHub Actions for v1 unless implementation reality forces it. Do not route deployment through the main web app. Do not add Railway/Cloudflare-specific plumbing after Vercel is chosen.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: deployment/provider setup with monorepo implications.
  - Skills: [`deploy-to-vercel`] - deployment flow and provider alignment.
  - Omitted: [`vercel-cli-with-tokens`] - only use if token-based CLI automation is actually needed.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 12 | Blocked By: 3,4,10

  **References**:
  - External: `https://vercel.com/docs/monorepos` - monorepo deployment guidance.
  - External: `https://vercel.com/docs/deployments/git` - native Git integration behavior.
  - Pattern: `apps/docs/**` - docs app build/output definitions established in tasks 3-4.

  **Acceptance Criteria**:
  - [ ] The plan/config documents one Vercel project for the docs app.
  - [ ] Build/install/output settings for the docs app are explicit.
  - [ ] Auto-deploy behavior from Git changes is documented.
  - [ ] Preview deployment expectations are documented.

  **QA Scenarios**:
  ```
  Scenario: Deployment settings are explicit
    Tool: Bash
    Steps: Inspect deployment docs/config for root directory, build command, install command, and output directory.
    Expected: All required Vercel deployment settings for the docs app are explicitly defined.
    Evidence: .sisyphus/evidence/task-11-vercel-settings.txt

  Scenario: Auto-deploy flow documented
    Tool: Bash
    Steps: Search deployment documentation for Git-triggered preview and production deploy behavior.
    Expected: The docs clearly state how pushes/PRs lead to Vercel deploys.
    Evidence: .sisyphus/evidence/task-11-autodeploy.txt
  ```

  **Commit**: YES | Message: `ci(docs): configure vercel deployment` | Files: `apps/docs/**`, repo deployment docs, optional Vercel config files

- [x] 12. Add docs smoke tests and run full repository verification

  **What to do**: Add docs-specific smoke coverage using the existing Playwright conventions and run the full repo verification pass. Smoke tests must validate homepage rendering, shared hierarchy presence, Design Time and Project Runtime navigation, Taskflow running-example presence, clear layer labels, absence of `L1/L2/L3` as primary public labels, internal-doc boundary enforcement, and runtime-to-design-time backlinks. Then run `bun run check-types`, `bun run build`, `bun run test`, and the docs-specific Playwright command.
  **Must NOT do**: Do not rely on manual visual confirmation. Do not leave docs testing pointed at the existing web app URL. Do not skip README link checks.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: hands-on QA and repo verification.
  - Skills: []
  - Omitted: [`playwright`] - use Playwright tooling directly during execution rather than loading browser skill instructions unless needed.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: F1-F4 | Blocked By: 4,7,8,9,10,11

  **References**:
  - Pattern: `tests/README.md:54-60` - existing `data-testid` preference.
  - Pattern: `tests/support/page-objects/app.page.ts:3-14` - page-object convention.
  - Pattern: `playwright.config.ts:3-24` - current Playwright config that needs docs-specific targeting.
  - Pattern: `package.json:51-57` - root verification commands.

  **Acceptance Criteria**:
  - [ ] Docs smoke tests exist and target the docs URL.
  - [ ] Smoke tests verify homepage, shared hierarchy section, Design Time navigation, Project Runtime navigation, and Taskflow example presence.
  - [ ] Smoke tests verify public docs use `Methodology Layer`, `Work Unit Layer`, `Workflow Layer`, `Step Layer` and do not expose `L1/L2/L3` as primary headings/nav labels.
  - [ ] Smoke tests verify internal docs are not first-class public-site content.
  - [ ] Smoke tests verify runtime pages include visible links back to design-time definitions.
  - [ ] `bun run check-types`, `bun run build`, `bun run test`, and docs-specific Playwright smoke tests all pass.

  **QA Scenarios**:
  ```
  Scenario: Public docs happy path
    Tool: Playwright
    Steps: Open docs homepage; verify shared hierarchy section; click `Design Time`; return; click `Project Runtime`; verify `Taskflow` appears as running example.
    Expected: Core public navigation works and the running example is visible.
    Evidence: .sisyphus/evidence/task-12-happy-path.png

  Scenario: Public/internal boundary and legacy label enforcement
    Tool: Playwright
    Steps: Inspect public nav/sidebar for internal-doc tree exposure and primary `L1/L2/L3` labels; attempt a direct internal-style public path if one exists.
    Expected: No public nav exposes internal canonical tree as first-class content, and legacy labels are not primary public labels.
    Evidence: .sisyphus/evidence/task-12-boundary.txt

  Scenario: Full repo verification
    Tool: Bash
    Steps: Run `bun run check-types && bun run build && bun run test && <docs-playwright-command>`.
    Expected: All commands exit successfully.
    Evidence: .sisyphus/evidence/task-12-full-suite.txt
  ```

  **Commit**: YES | Message: `test(docs): add smoke coverage and verify repo` | Files: `tests/**`, `playwright.config.*`, `apps/docs/**`, `README.md`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Use atomic commits aligned to workstreams:
  1. docs(app): scaffold vitepress app and monorepo wiring
  2. docs(content): add public docs corpus and Taskflow examples
  3. docs(repo): reposition readme and internal docs index
  4. ci/docs: add deployment and docs smoke verification
- Avoid mixing public corpus, repo README, and deployment plumbing in one commit unless required by hooks/build integrity.

## Success Criteria
- A contributor can open the public docs site and understand Chiron through the Taskflow example without reading internal architecture docs.
- A methodology builder can follow the Design Time track from Methodology Layer to Step Layer coherently.
- An operator can follow the Project Runtime track from observable actions to runtime state coherently.
- Internal/developer docs remain in-repo, linked but not published as first-class public content.
- The README behaves as a GitHub entrypoint, not a duplicate conceptual handbook.
- Docs deployment and smoke verification are repeatable by agents without human intervention.
