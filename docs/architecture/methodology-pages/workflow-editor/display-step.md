# Workflow Editor Display Step Dialog

This document defines the stable methodology Workflow Editor contract for the `display.v1` step dialog, aligned with the locked Epic 3 baseline in `docs/plans/2026-03-11-methodology-design-time-pages-tentative-design.md` section 6.8.

## Scope

- This is the design-time contract for `display.v1`.
- Display steps render workflow data in a read-only presentation surface.
- They support a single content view or a tabbed presentation, plus optional structured navigation.

## Contract goals

- Keep display configuration typed, versioned, and migration-safe.
- Support rich structured content without making display steps writable.
- Make navigation explicit instead of hiding it inside editor content.
- Preserve guidance and editor behavior needed for durable authoring.

## Core contract

```ts
type DisplayStepConfigV1 = DisplayStepBaseConfigV1 &
  (DisplaySingleModeConfigV1 | DisplayTabsModeConfigV1);

type DisplayStepBaseConfigV1 = {
  stepConfigVersion: "display.v1";

  overview: {
    stepKey: string;
    stepName: string;
    title?: string;
    message?: string;
  };

  contentSchemaVersion: number;

  navigation?: {
    nextStep?: string;
  };

  guidance?: {
    human?: string;
    agent?: string;
  };
};

type DisplaySingleModeConfigV1 = {
  presentationMode: "single";
  content: Record<string, unknown>;
  tabs?: never;
};

type DisplayTabsModeConfigV1 = {
  presentationMode: "tabs";
  content?: never;
  tabs: [DisplayTabConfigV1, ...DisplayTabConfigV1[]];
};

type DisplayTabConfigV1 = {
  key: string;
  title: string;
  content: Record<string, unknown>;
};
```

## Presentation and content model

- `presentationMode` controls whether the step stores one main content document or a list of named tabs.
- `single` mode requires `content` and the inactive `tabs` shape must be absent.
- `tabs` mode requires a non-empty `tabs[]` and the inactive `content` shape must be absent.
- In `tabs` mode, each row stores stable tab metadata and a separate content payload.
- Content is stored as Plate-style JSON, not as ad hoc HTML or markdown blobs.
- `contentSchemaVersion` is required so stored editor payloads remain migration-safe as the rich content schema evolves.
- Persisting both content shapes at once is a validation error.

## Structured navigation and guidance

- Navigation is modeled explicitly in `navigation`, not inferred from editor content.
- `navigation.nextStep` is optional and points to the next workflow step after the display completes.
- Guidance remains separate from presentation content:
  - `guidance.human` explains what the user should review or do next.
  - `guidance.agent` constrains any agent-facing framing around the rendered output.

## Variable interpolation and read-only policy

Allowed template variables in display content are locked to these namespaces:

- `context.*`
- `project.*`
- `self.*`

Display interpolation is read-only.

- Rendering may resolve templates from those namespaces.
- Display content must not mutate variables, facts, artifacts, or workflow routing state.
- The editor may support variable insertion and preview, but runtime behavior remains presentation-only.

## Runtime semantics

- The runtime resolves allowed variables referenced by the stored content payload.
- The resolved content renders read-only.
- `single` and `tabs` presentation modes share the same interpolation and read-only rules.
- If `navigation.nextStep` is present, the workflow proceeds there after the display step completes.
- Display steps are suitable for outcomes, diagnostics, summaries, usage views, and suggested next actions, but not for editing data.

## Expected editor behavior

- The display dialog uses `Overview`, `Content`, and `Navigation & Guidance` tabs.
- The content tab exposes `presentationMode` and switches between single-document editing and tab-list management.
- In `tabs` mode, `Add Tab` and row-level `Edit` open stacked dialogs:
  - Level 1: tab metadata (`key`, `title`)
  - Level 2: tab content editor
- Create and edit use the same dialog shell with empty vs prefilled values.
- Delete uses a confirmation dialog.
- Unsaved edits persist across tab switches until save or explicit discard.
- Dirty-state indication remains visible until save or discard.

### Dialog wireframes

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ EDIT STEP — DISPLAY                                         ● Unsaved      [Cancel] [Save] │
│ Tabs: [Overview] [Content] [Navigation & Guidance]                                        │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ (tab content area)                                                                          │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ CONTENT                                                                    │
│ Presentation Mode     [ single | tabs ]                                    │
│                                                                            │
│ if single:                                                                  │
│   [ Main display content editor ]                                           │
│   [Insert Variable] [Preview Rendered]                                     │
│                                                                            │
│ if tabs:                                                                    │
│   Tabs list:                                                                │
│   - results      | Results      | [Edit] [Delete]                          │
│   - diagnostics  | Diagnostics  | [Edit] [Delete]                          │
│   - next_steps   | Next Steps   | [Edit] [Delete]                          │
│   [ + Add Tab ]                                                             │
│                                                                            │
│   Edit/Add Tab opens stacked dialog:                                       │
│   - Level 1: tab metadata (key/title)                                      │
│   - Level 2: tab content editor                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ NAVIGATION & GUIDANCE                                                      │
│ Next Step (optional): [ step_key_here ]                                    │
│                                                                            │
│ Human Guidance                                                              │
│ [ Explain what the user should do next... ]                                │
│                                                                            │
│ Agent Guidance                                                              │
│ [ Keep display output concise and actionable... ]                           │
└────────────────────────────────────────────────────────────────────────────┘
```

## Deprecated legacy shape

The following older fields and concepts are no longer authoritative for Epic 3 implementation:

- primary contracts keyed by `type: "display"`
- top-level `nextStep` instead of structured `navigation`
- display content without `contentSchemaVersion`
- unversioned Plate payloads treated as implicitly stable
- display steps framed as editable or state-mutating surfaces

When older docs or prototypes reference those shapes, treat them as superseded by the versioned `display.v1` model above.
