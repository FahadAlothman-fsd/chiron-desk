# Version Workspace Author Hub Design

Date: 2026-03-17
Status: approved-reusable-card-direction

## Goal

Redefine the top layer of `/methodologies/:methodologyId/versions/:versionId` as a calmer authoring hub with two top-level tabs, visible status cards, surface-entry cards, and discoverable keyboard quick actions.

## Scope

This document only defines the first-layer workspace shell.

Included:

- the top-level tab model
- the `Author` hub composition
- the `Review & Publish` shell role
- visible quick actions and hotkey grammar

Not included yet:

- the detailed `Facts` page contract
- the full `Work Units` L1 graph/list contract
- the `Work Unit Detail` L2 contract
- the detailed `Agents` and `Dependency Definitions` page internals

## Inputs and Constraints

- `docs/architecture/epic-3-authority.md` promotes version-scoped pages as first-class surfaces.
- `docs/architecture/methodology-pages/work-units/overview.md` defines Work Units L1 as its own page.
- `docs/architecture/methodology-pages/work-units/detail-tabs.md` defines Work Unit L2 as its own routed detail surface.
- `docs/architecture/methodology-pages/methodology-facts.md` defines facts as a dialog-first CRUD page.
- `docs/architecture/methodology-pages/agents.md` defines agents as a catalog page.
- `docs/architecture/methodology-pages/dependency-definitions.md` defines dependency definitions as a dedicated page.
- `docs/plans/2026-03-17-story-3-1-design-time-shell-baseline-design.md` already expects separate owner routes for workspace, facts, work units, work-unit detail, agents, and dependency definitions.
- `apps/web/src/features/methodologies/commands.ts` already establishes existing shortcut grammar with `g *` for open/go and `c *` for create.
- `@tanstack/react-hotkeys` is already installed and in use in the web app shell.

## Approved Direction

### Top-Level Tabs

Use exactly two top-level tabs:

1. `Author`
2. `Review & Publish`

Rationale:

- `Author` is where the operator decides what to work on next.
- `Review & Publish` is where the operator checks readiness, reviews diagnostics, and publishes.
- `Publish`, `Evidence`, and `Context` should no longer compete as equal top-level tabs.

### Author Tab Role

`Author` is a hub, not a mega-editor.

It should:

- show current version status at a glance
- expose entry points into first-class authoring surfaces
- expose quick-create actions with visible keyboard hints
- highlight readiness problems that need attention

It should not:

- embed the full Work Units graph/list editor
- inline all facts/agents/dependency-definition CRUD in one screen
- become a dense spec-sheet or giant operations form

### Surface Ownership

- `Work Units` full graph/list lives on the dedicated Work Units page.
- `Facts` editing lives on the dedicated Facts page.
- `Agents` editing lives on the dedicated Agents page.
- `Dependency Definitions` editing lives on the dedicated Dependency Definitions page.

Inside `Author`, each of these appears as a card with summary, open action, and create action.

## Reusable Surface Card Contract

The surface card visual language is now an approved reusable app primitive, not a one-off Author hub treatment.

### Reuse Rule

- Build a shared card component first.
- Use the Author hub as the first consumer.
- Keep the primitive generic enough to reuse across other app surfaces later.

### Visual Direction

Match the referenced tryelements card structure as closely as practical, but use the app's existing palette and tokens rather than importing the reference site's exact colors.

Approved motifs:

- square corners
- thin border
- tinted dark panel
- subtle diagonal stripe wash
- four small corner squares
- strong internal separator before footer/actions
- compact footer rail with side-by-side actions

### Composition

Each reusable surface card should support these slots:

- `eyebrow`
- `title`
- `description`
- `primaryValue`
- `secondaryValues`
- `badge`
- `actions`

The Author hub keeps the current information hierarchy, but the card shell becomes more structured and more visual.

### Actions Layout

- Actions should sit horizontally in the footer rail.
- They should feel compact and utility-like rather than large stacked CTA buttons.
- Visible shortcut hints remain attached to those actions.
- Disabled actions and their rationale must still be supported by the shared component API.

### Palette Rule

Keep the current app palette as the color source of truth.

- different surfaces can use different existing semantic tones/tints
- the diagonal wash should be derived from those existing tokens
- do not introduce a second disconnected color system just to mimic the reference

### Initial Primitive API Direction

The shared component should likely expose a shape along these lines:

```ts
type SurfaceCardTone = "work-units" | "facts" | "agents" | "link-types" | "neutral";

type SurfaceCardAction = {
  label: string;
  shortcut?: string;
  disabledReason?: string;
  onTrigger?: () => void;
};
```

And render props/slots for:

- tone
- eyebrow
- title
- description
- primary value
- secondary values
- badge/meta
- footer actions
- optional decorative corners/stripe treatment toggle

Exact prop naming can be refined during implementation, but the reusable split is now part of the approved design.

## Layout Direction

Choose the calmer `Status-card shell` presentation.

### Row 1 - Status Cards

Four compact cards:

- `DRAFT`
- `SAVE STATE`
- `RUNTIME`
- `READINESS`

Purpose:

- establish orientation immediately
- reduce scanning cost before action
- make the workspace feel like a cockpit instead of a spec dump

### Row 2 - Surface Cards

- `Work Units` is the visual hero card
- `Facts` and `Agents` sit side-by-side as secondary cards
- `Link Types / Dependency Definitions` spans full width beneath them

Purpose:

- make `Work Units` feel primary without embedding the graph
- keep the other surfaces visible and actionable
- preserve a clear sense of authoring breadth

### Row 3 - Quiet Quick Actions

Add a compact horizontal quick-action strip that repeats the primary keyboard actions in one place.

This strip is secondary to the cards, not the hero of the page.

## Hotkey Model

Use shell-level hotkeys via `@tanstack/react-hotkeys`.

Do not invent a new key grammar.
Reuse the command system's existing shortcut convention:

- `g *` = open/go to a surface
- `c *` = create inside that surface

### Approved First-Pass Keymap

- `g w` - Open Work Units
- `c w` - Add Work Unit
- `g f` - Open Facts
- `c f` - Add Fact
- `g a` - Open Agents
- `c a` - Add Agent
- `g l` - Open Link Types / Dependency Definitions
- `c l` - Add Link Type

### Hotkey Rules

- Every hotkey must have an equivalent visible control on the page.
- Every visible quick action should show its shortcut hint.
- If an action is blocked, keep the hint visible and disable the action with rationale.
- Workspace hotkeys should work anywhere in the version workspace shell except while typing in an active text input, textarea, or other editable field.
- Command palette shortcuts and visible quick actions must stay in parity.

## Review & Publish Role

`Review & Publish` becomes the second top-level tab for:

- scope/context summary
- diagnostics and readiness review
- publish controls
- evidence/history summary

Detailed composition for that tab is intentionally deferred to the next design slice.

## First-Layer Wireframe

```text
+--------------------------------------------------------------------------------------------------+
| Methodologies / Equity Core / Draft v3                                                           |
| [ Author ]  Review & Publish                                                                     |
+--------------------------------------------------------------------------------------------------+

+------------------+ +------------------+ +------------------+ +------------------+
| DRAFT            | | SAVE STATE       | | RUNTIME          | | READINESS        |
| Draft v3         | | Unsaved changes  | | Deferred         | | 3 blockers       |
| Editable         | | Last saved 2m ago| | Design-time only | | Needs review     |
+------------------+ +------------------+ +------------------+ +------------------+

+--------------------------------------------------------------------------------------------------+
| WORK UNITS                                                                 [ Open ]     [ Add ] |
| Core structure, relationship map, and unit inventory.                                           |
| 18 units  -  4 flagged  -  Graph + List live on dedicated page                                  |
| Shortcut: [ G W ] Open Work Units    [ C W ] Add Work Unit                                      |
+--------------------------------------------------------------------------------------------------+

+-------------------------------------------+ +-------------------------------------------+
| FACTS                            [ Open ] | | AGENTS                           [ Open ] |
| Methodology-level facts and rules         | | Agent catalog and responsibilities         |
| 42 facts                                  | | 6 agents                                  |
| Shortcut: [ G F ] Open Facts              | | Shortcut: [ G A ] Open Agents             |
|           [ C F ] Add Fact                | |           [ C A ] Add Agent               |
+-------------------------------------------+ +-------------------------------------------+

+--------------------------------------------------------------------------------------------------+
| LINK TYPES / DEPENDENCY DEFINITIONS                                   [ Open ]        [ Add ]   |
| Relationship vocabulary, usage rules, diagnostics.                                               |
| 9 link types                                                                                      |
| Shortcut: [ G L ] Open Link Types    [ C L ] Add Link Type                                       |
+--------------------------------------------------------------------------------------------------+

+--------------------------------------------------------------------------------------------------+
| QUICK ACTIONS                                                                                    |
| [ G W ] Work Units   [ C W ] New Work Unit   [ G F ] Facts   [ C F ] New Fact                   |
| [ G A ] Agents       [ C A ] New Agent       [ G L ] Link Types [ C L ] New Link Type           |
+--------------------------------------------------------------------------------------------------+
```

## Reusable Card Styling Notes

For the first implementation pass, the reusable card should follow this structural pattern:

```text
+--------------------------------------------------------------+
| [] title area                                        [badge] |
| description                                                   |
|                                                              |
| PRIMARY VALUE                                                 |
| [secondary] [secondary] [secondary]                           |
|--------------------------------------------------------------|
| [Open      G W] [Add      C W]                                |
+--------------------------------------------------------------+
```

Where the final rendered version includes:

- diagonal tinted background wash
- four tiny corner squares
- square outer edges
- compact footer buttons aligned next to each other

## Implementation Notes

- The current route still carries old `author|publish|evidence|context` search-state behavior and heavy embedded authoring logic.
- The next implementation should move the first-layer `Author` shell toward a presentational hub and stop treating the route as a multi-tool workspace.
- Existing command IDs and shortcuts in `apps/web/src/features/methodologies/commands.ts` should be reused instead of introducing parallel keyboard systems.

## Verification Expectations

Implementation should prove:

- the two-tab top-layer shell renders as approved
- the `Author` tab shows status cards + surface cards + visible shortcut hints
- shell-level hotkeys call the same navigation/create actions as visible controls
- disabled-state rationale remains consistent with command palette behavior
