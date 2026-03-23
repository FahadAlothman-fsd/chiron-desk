# Learnings - Finish L2 Transition Dialog

## Conventions
- Transition dialog uses groups-only condition authoring
- Dirty indicators follow touched-style semantics (not diff-based)
- Group keys must be preserved when editing existing groups
- Route integration tests are the primary verification mechanism

## Patterns
- FactsTab.tsx and WorkflowsTab.tsx have dirty indicator patterns to mirror
- StateMachineTab.tsx is the main file to modify
- Shell route integration test is the test harness

## Decisions
- Frontend-only solution (no backend changes)
- Normalize legacy bare conditions to single-condition groups on load
- Keep scope limited to transition dialog only

---

## StateMachineTab.tsx Implementation Documentation

### File Location
`/home/gondilf/Desktop/projects/masters/chiron/apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx` (2050 lines)

---

### 1. GateDraft Type Structure (Lines 55-62)

```typescript
type GateDraft = {
  key: string;                    // Gate identifier
  mode: "all" | "any";           // Evaluation mode for conditions
  guidance: string;               // Human-readable guidance text
  description: string;              // Description text
  conditions: TransitionCondition[]; // BARE CONDITIONS (legacy, to be removed)
  groups: TransitionConditionGroup[]; // CONDITION GROUPS (target structure)
};
```

**Key Insight**: The draft maintains BOTH `conditions` (bare) and `groups`. The plan is to make it groups-only.

---

### 2. TransitionDraft Type (Lines 110-117)

```typescript
type TransitionDraft = {
  transitionKey: string;
  fromState: string;
  toState: string;
  startGate: GateDraft;        // Start phase conditions
  completionGate: GateDraft;   // Completion phase conditions
  workflowKeys: string[];      // Workflow bindings
};
```

---

### 3. toGateDraft Function (Lines 521-534)

**Purpose**: Converts a `TransitionConditionSet` from the backend into a `GateDraft` for the UI.

```typescript
const toGateDraft = (set: TransitionConditionSet | undefined): GateDraft => ({
  key: set?.key ?? "",
  mode: set?.mode ?? "all",
  guidance: set?.guidance ?? "",
  description: "",              // Currently not persisted
  conditions: [],               // Always empty - groups are the source of truth
  groups: Array.isArray(set?.groups)
    ? set.groups.map((group) => ({
        key: group.key,
        mode: group.mode,
        conditions: [...group.conditions],
      }))
    : [],
});
```

**Current Behavior**: 
- `conditions` array is always initialized as empty
- Groups are mapped from the condition set's groups
- Description field exists in draft but is not populated from backend

---

### 4. toConditionSet Function (Lines 569-593)

**Purpose**: Converts a `GateDraft` back to a `TransitionConditionSet` for saving.

```typescript
const toConditionSet = (
  phase: GatePhase,
  gate: GateDraft,
  transitionKey: string,
): TransitionConditionSet => {
  const fallbackKey = `${phase}.${transitionKey}`;
  return {
    key: gate.key.trim().length > 0 ? gate.key.trim() : fallbackKey,
    phase,
    mode: gate.mode,
    ...(gate.guidance.trim().length > 0 ? { guidance: gate.guidance.trim() } : {}),
    groups: [
      // BARE CONDITIONS: Each bare condition becomes a single-condition group
      ...gate.conditions.map((condition, index) => ({
        key: `${phase}.condition.${index + 1}`,
        mode: "all" as const,
        conditions: [condition],
      })),
      // EXISTING GROUPS: Preserved as-is with their keys
      ...gate.groups.map((group, index) => ({
        key: group.key.trim().length > 0 ? group.key.trim() : `${phase}.group.${index + 1}`,
        mode: group.mode,
        conditions: [...group.conditions],
      })),
    ],
  };
};
```

**Critical Behavior**:
- Bare conditions (in `gate.conditions`) are wrapped into single-condition groups
- Existing groups preserve their keys (important for editing)
- Groups without keys get auto-generated keys like `start.group.1`

---

### 5. Group Editor State (Lines 351-355, 1002-1027)

**State Definition**:
```typescript
const [groupEditor, setGroupEditor] = useState<{
  phase: GatePhase;                    // "start" or "completion"
  mode: "all" | "any";                // Group evaluation mode
  conditions: TransitionCondition[];   // Conditions being built
} | null>(null);
```

**Open Group Editor** (Line 1002-1008):
```typescript
const openGroupEditor = (phase: GatePhase) => {
  setGroupEditor({
    phase,
    mode: "all",
    conditions: [],
  });
};
```

**Save Group Editor** (Lines 1010-1027):
```typescript
const saveGroupEditor = () => {
  if (!groupEditor) return;
  
  updateGate(groupEditor.phase, (gate) => ({
    ...gate,
    groups: [
      ...gate.groups,
      {
        key: `group.${crypto.randomUUID()}`,  // NEW groups get UUID keys
        mode: groupEditor.mode,
        conditions: [...groupEditor.conditions],
      },
    ],
  }));
  setGroupEditor(null);
};
```

**Current Limitation**: Can only ADD new groups, cannot EDIT existing groups.

---

### 6. Current Condition Authoring (Bare vs Grouped)

**Bare Conditions Flow**:
1. `addGateCondition(phase, kind)` (Lines 976-991) adds to `gate.conditions`
2. Rendered in "Start/Completion Conditions" section (Lines 1657-1667, 1830-1840)
3. In `toConditionSet`, each bare condition is wrapped into a single-condition group

**Grouped Conditions Flow**:
1. `openGroupEditor(phase)` opens the group editor dialog
2. User adds conditions to the group editor's `conditions` array
3. `saveGroupEditor()` appends the new group to `gate.groups`
4. Rendered in "Start/Completion Groups" section (Lines 1673-1688, 1846-1861)

**Current UI Structure** (Start/Completion tabs):
- Gate Mode selector (all/any)
- Edit Guidance/Description buttons
- Add Fact/Work Unit Condition buttons (adds BARE conditions)
- Add Group button (opens group editor)
- "Conditions" section (shows bare conditions)
- "Groups" section (shows groups as read-only summaries)

---

### 7. Save Path and Payload Generation (Lines 600-629)

```typescript
const saveTransitionDialog = async () => {
  // 1. Validate required fields
  const transitionKey = transitionEditor.transitionKey.trim();
  const toState = transitionEditor.toState.trim();
  if (!transitionKey || !toState) return;

  // 2. Normalize fromState (handle absent state)
  const normalizedFromState = transitionEditor.fromState.trim();

  // 3. Build the transition payload
  const nextTransition: LifecycleTransition = {
    transitionKey,
    fromState: normalizedFromState === absentFromStateValue ? null : normalizedFromState,
    toState,
    conditionSets: toConditionSets(transitionEditor),  // Converts both gates
    workflowKeys: transitionEditor.workflowKeys,
  };

  // 4. Update local state
  const nextTransitions = editingTransitionKey
    ? transitionsDraft.map((t) => t.transitionKey === editingTransitionKey ? nextTransition : t)
    : [...transitionsDraft, nextTransition];

  setTransitionsDraft(nextTransitions);
  
  // 5. Persist to backend
  await onSaveTransitions?.(nextTransitions);
  setTransitionDialogOpen(false);
};
```

**toConditionSets Helper** (Lines 595-598):
```typescript
const toConditionSets = (draft: TransitionDraft): TransitionConditionSet[] => [
  toConditionSet("start", draft.startGate, draft.transitionKey.trim()),
  toConditionSet("completion", draft.completionGate, draft.transitionKey.trim()),
];
```

---

### 8. UI Components and Their Purposes

#### Main Dialog Structure (Lines 1351-1897)
- **Dialog**: `transitionDialogOpen` controls visibility
- **Form**: Contains all tab content
- **Tab Navigation**: Contract | Start Conditions | Completion Conditions | Bindings
- **Scroll Region**: `transition-tab-scroll-region` contains tab content

#### Tab: Contract (Lines 1410-1589)
- Transition Key input (disabled when editing)
- From State selector (includes "Activate Work Unit" option for absent state)
- To State selector

#### Tab: Start Conditions (Lines 1590-1690)
- Start Gate Mode selector (all/any)
- Edit Start Guidance button → opens `gateTextEditor` dialog
- Edit Start Description button → opens `gateTextEditor` dialog
- Add Fact Condition button → adds bare condition
- Add Work Unit Condition button → adds bare condition
- Add Group button → opens `groupEditor` dialog
- Start Conditions list (renders bare conditions via `renderConditionEditor`)
- Start Groups list (renders groups as read-only summaries)

#### Tab: Completion Conditions (Lines 1763-1864)
- Same structure as Start Conditions but for completion gate

#### Tab: Bindings (Lines 1691-1762)
- Workflow multi-select combobox
- Binds workflows to transition

#### Dialog: Gate Text Editor (Lines 1899-1959)
- Edits `guidance` or `description` for a gate
- Saves back to gate via `updateGate`

#### Dialog: Group Editor (Lines 1961-2047)
- Group Mode selector (all/any)
- Add Fact/Work Unit Condition buttons
- Group Conditions list (renders via `renderConditionEditor`)
- Save/Cancel buttons

#### Component: ConditionComboboxField (Lines 226-307)
- Reusable combobox for selecting facts, dependencies, work units, states
- Uses Command/Popover pattern from shadcn/ui

#### Component: renderConditionEditor (Lines 754-956)
- Renders fact conditions (with operator: exists/equals, value field)
- Renders work_unit conditions (with dependency, work unit, operator, state)
- Used for both bare conditions and group conditions

---

### 9. State Management Summary

| State Variable | Purpose |
|---------------|---------|
| `transitionDialogOpen` | Controls transition dialog visibility |
| `editingTransitionKey` | null = create mode, string = edit mode |
| `transitionEditor` | The `TransitionDraft` being edited |
| `transitionEditorTab` | Current tab: "contract" \| "start" \| "completion" \| "bindings" |
| `gateTextEditor` | Dialog state for editing guidance/description |
| `groupEditor` | Dialog state for creating new groups |
| `isFromStateOpen` / `isToStateOpen` / `isBindingsOpen` | Popover open states |

---

### 10. Key Files for Reference

- **StateMachineTab.tsx**: Main implementation (2050 lines)
- **packages/contracts/src/methodology/lifecycle.ts**: Canonical type definitions
- **FactsTab.tsx**: Reference for dirty indicator patterns
- **WorkflowsTab.tsx**: Reference for dirty indicator patterns

---

### 11. Current Limitations Identified

1. **No dirty indicators** on transition dialog tabs (unlike state dialog)
2. **Cannot edit existing groups** - groups are read-only after creation
3. **Bare conditions still supported** - need to migrate to groups-only
4. **Group keys not editable** - auto-generated on creation
5. **No group deletion** - once added, groups cannot be removed
6. **No condition deletion** - within groups or bare list

---

### 12. Contract Types (from packages/contracts)

```typescript
// Canonical types from lifecycle.ts
TransitionConditionSet = {
  key: string;
  phase: "start" | "completion";
  mode: "all" | "any";
  groups: TransitionConditionGroup[];
  guidance?: string;
}

TransitionConditionGroup = {
  key: string;
  mode: "all" | "any";
  conditions: TransitionCondition[];
}

TransitionCondition = {
  kind: string;
  required?: boolean;
  config: unknown;
  rationale?: string;
}
```


## Dirty Indicator Pattern Documentation

### State Shape for Dirty Flags

**Per-Tab Dirty Tracking (FactsTab.tsx - 2 tabs):**
```typescript
const [isContractTabDirty, setIsContractTabDirty] = useState(false);
const [isGuidanceTabDirty, setIsGuidanceTabDirty] = useState(false);
const isDialogDirty = isContractTabDirty || isGuidanceTabDirty;
```

**Per-Mode + Per-Tab Dirty Tracking (WorkflowsTab.tsx - 3 tabs, 2 modes):**
```typescript
// Create mode dirty flags
const [isCreateContractDirty, setIsCreateContractDirty] = useState(false);
const [isCreateMetadataDirty, setIsCreateMetadataDirty] = useState(false);
const [isCreateGuidanceDirty, setIsCreateGuidanceDirty] = useState(false);

// Edit mode dirty flags
const [isEditContractDirty, setIsEditContractDirty] = useState(false);
const [isEditMetadataDirty, setIsEditMetadataDirty] = useState(false);
const [isEditGuidanceDirty, setIsEditGuidanceDirty] = useState(false);

// Combined dirty check
const isCreateDirty = isCreateContractDirty || isCreateMetadataDirty || isCreateGuidanceDirty;
const isEditDirty = isEditContractDirty || isEditMetadataDirty || isEditGuidanceDirty;
```

**StateMachineTab.tsx (existing pattern - 2 tabs, 2 modes):**
```typescript
const [isCreateContractDirty, setIsCreateContractDirty] = useState(false);
const [isCreateGuidanceDirty, setIsCreateGuidanceDirty] = useState(false);
const [isEditContractDirty, setIsEditContractDirty] = useState(false);
const [isEditGuidanceDirty, setIsEditGuidanceDirty] = useState(false);

const isCreateStateDirty = isCreateContractDirty || isCreateGuidanceDirty;
const isEditStateDirty = isEditContractDirty || isEditGuidanceDirty;
```

### How Dirty Flags Are Set (on edits)

**Method 1: onChangeCapture on container (FactsTab.tsx):**
```tsx
<div onChangeCapture={() => setIsContractTabDirty(true)}>
  {/* form fields */}
</div>
```

## Recent Notes

- Added WorkUnitDefinition and workUnits prop typings for the FactsTab work unit selector expansion.
- Methodology fact description payload now stays as a trimmed string, and the route/schema cooperates without constructing human/agent objects.

**Method 2: Centralized mark function (WorkflowsTab.tsx):**
```typescript
const markDirtyForActiveTab = (mode: WorkflowEditorMode, tab: WorkflowEditorTab) => {
  if (mode === "create") {
    if (tab === "contract") { setIsCreateContractDirty(true); return; }
    if (tab === "metadata") { setIsCreateMetadataDirty(true); return; }
    setIsCreateGuidanceDirty(true);
    return;
  }
  // edit mode logic...
};

// Usage on form container:
<form onChangeCapture={() => markDirtyForActiveTab("create", activeTab)}>
```

**Method 3: markStateDirtyForActiveTab (StateMachineTab.tsx - existing):**
```typescript
const markStateDirtyForActiveTab = (mode: StateEditorMode, tab: StateEditorTab) => {
  if (mode === "create") {
    if (tab === "contract") { setIsCreateContractDirty(true); return; }
    setIsCreateGuidanceDirty(true);
    return;
  }
  // edit mode logic...
};
```

### Visual Indicator Implementation (Tab Markers)

**Pattern for showing asterisk on dirty tabs:**
```tsx
<div className="flex flex-wrap gap-2 border-b border-border pb-3">
  {(
    [
      ["contract", "Contract"],
      ["metadata", "Metadata"],
      ["guidance", "Guidance"],
    ] as const
  ).map(([stepValue, label]) => (
    <div key={stepValue}>
      <Button
        type="button"
        size="sm"
        variant={activeTab === stepValue ? "default" : "outline"}
        className="rounded-none"
        onClick={() => setActiveTab(stepValue)}
      >
        {label}
        {stepValue === "contract" && isCreateContractDirty ? (
          <span
            data-testid="workflow-contract-modified-indicator"
            className="ml-1 text-[0.85rem] leading-none"
          >
            *
          </span>
        ) : null}
        {/* repeat for other tabs */}
      </Button>
    </div>
  ))}
</div>
```

**StateMachineTab.tsx existing pattern (lines 1182-1208):**
```tsx
{((stateDialogMode === "create" && isCreateContractDirty) ||
  (stateDialogMode === "edit" && isEditContractDirty)) && (
  <span
    data-testid="state-contract-modified-indicator"
    className="ml-1 text-[0.85rem] leading-none"
  >
    *
  </span>
)}
```

### How Dirty Flags Are Reset

**Reset functions (WorkflowsTab.tsx pattern):**
```typescript
const resetCreateDirty = () => {
  setIsCreateContractDirty(false);
  setIsCreateMetadataDirty(false);
  setIsCreateGuidanceDirty(false);
};

const resetEditDirty = () => {
  setIsEditContractDirty(false);
  setIsEditMetadataDirty(false);
  setIsEditGuidanceDirty(false);
};
```

**Reset on dialog open (initialize):**
```typescript
const openCreate = () => {
  // ... initialize form values
  setActiveTab("contract");
  resetCreateDirty();  // Reset dirty flags when opening
  setCreateOpen(true);
};

const openEdit = (workflow: WorkflowMetadata) => {
  // ... load form values
  setActiveTab("contract");
  resetEditDirty();  // Reset dirty flags when opening
};
```

**Reset on save/close:**
```typescript
const closeCreateDialog = () => {
  setCreateDiscardOpen(false);
  setActiveTab("contract");
  setCreateOpen(false);
  resetCreateDirty();  // Reset on close
};
```

### Discard Confirmation Pattern

**Discard dialog state:**
```typescript
const [createDiscardOpen, setCreateDiscardOpen] = useState(false);
const [editDiscardOpen, setEditDiscardOpen] = useState(false);
```

**Request close with dirty check:**
```typescript
const requestCloseCreateDialog = () => {
  if (isCreateDirty) {
    setCreateDiscardOpen(true);
    return;
  }
  closeCreateDialog();
};
```

**Dialog onOpenChange handler:**
```tsx
<Dialog
  open={createOpen}
  onOpenChange={(nextOpen) => {
    if (nextOpen) {
      setCreateOpen(true);
      return;
    }
    requestCloseCreateDialog();
  }}
>
```

**Discard confirmation dialog:**
```tsx
<Dialog open={createDiscardOpen} onOpenChange={setCreateDiscardOpen}>
  <DialogContent className="max-w-md rounded-none">
    <DialogHeader>
      <DialogTitle>Discard unsaved changes?</DialogTitle>
      <DialogDescription>
        You have unsaved workflow edits. Discarding now will close the dialog and lose those changes.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button
        type="button"
        variant="outline"
        className="rounded-none"
        onClick={() => setCreateDiscardOpen(false)}
      >
        Keep Editing
      </Button>
      <Button type="button" className="rounded-none" onClick={closeCreateDialog}>
        Discard Changes
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Key Implementation Notes

1. **Touched-style semantics**: Dirty flags are set on ANY change, not just when values differ from original
2. **Per-tab granularity**: Each tab has its own dirty flag for precise indicator placement
3. **Per-mode separation**: Create and edit modes have separate dirty flag sets
4. **Combined dirty check**: Use OR operator to check if ANY tab is dirty for discard confirmation
5. **Reset on open**: Always reset dirty flags when opening dialog (both create and edit)
6. **Reset on save**: Reset dirty flags when closing after successful save
7. **data-testid pattern**: Use descriptive test IDs like `{feature}-{tab}-modified-indicator`
8. **Visual indicator**: Simple asterisk (*) with ml-1 margin, text-[0.85rem] size, leading-none

### Files with Reference Implementations

- `/home/gondilf/Desktop/projects/masters/chiron/apps/web/src/features/methodologies/work-unit-l2/FactsTab.tsx` - Simple 2-tab pattern
- `/home/gondilf/Desktop/projects/masters/chiron/apps/web/src/features/methodologies/work-unit-l2/WorkflowsTab.tsx` - Complete 3-tab pattern with full discard flow
- `/home/gondilf/Desktop/projects/masters/chiron/apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx` - Existing state editor pattern (lines 330-460, 1160-1210)

## Test File Analysis: shell-routes.integration.test.tsx

**File Path**: `/home/gondilf/Desktop/projects/masters/chiron/apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`

### Test Harness Structure

#### 1. Mock Setup (Lines 6-27)
The test file uses Vitest's `vi.hoisted()` to create mock functions for TanStack Router hooks:
- `useParamsMock` - Route parameters
- `useSearchMock` - URL search params
- `useRouteContextMock` - Route context (contains ORPC client)
- `useLocationMock` - Current location
- `useNavigateMock` - Navigation function

#### 2. createRouteContext() Factory (Lines 46-545)
This is the main test harness factory that creates a mock route context with ORPC mutations. Key transition-related mocks:

```typescript
const saveStateMachineTransitionMock = vi.fn(async () => ({ diagnostics: [] }));
const upsertStateMachineTransitionMock = vi.fn(async () => ({ diagnostics: [] }));
const deleteStateMachineTransitionMock = vi.fn(async () => ({ diagnostics: [] }));
const listTransitionConditionSetsMock = vi.fn(async () => [
  {
    key: "start_guard",
    phase: "start",
    mode: "all",
    groups: [],
    guidance: "Start only when prerequisites pass",
  },
  {
    key: "done_guard",
    phase: "completion",
    mode: "all",
    groups: [],
    guidance: "Require evidence",
  },
]);
const updateTransitionConditionSetsMock = vi.fn(async () => ({ diagnostics: [] }));
```

The factory returns these mocks as properties so tests can assert against them via `routeContext.saveStateMachineTransitionMock`.

#### 3. Helper Functions (Lines 547-584)

**Combobox Helpers**:
- `comboboxForField(label)` - Gets combobox button within a field label
- `chooseOption(label, optionName)` - Opens combobox and selects option
- `comboboxForFieldIn(container, label)` - Scoped combobox finder
- `chooseOptionIn(container, label, optionName)` - Scoped option selection

**Query Client Helper**:
- `renderWithQueryClient(node)` - Renders with fresh QueryClient (retry: false, gcTime: 0)

### Existing Transition Dialog Test Scenarios

#### Test 1: "supports state-machine CRUD with transition contract/start/completion/bindings tabs" (Lines 954-1156)

**What it tests**:
- Opening the transition dialog via "+ Add Transition" button
- Dialog has 4 tabs: Contract, Start Conditions, Completion Conditions, Bindings
- Dialog dimensions: `w-[min(72rem,calc(100vw-2rem))]`
- Scroll region has `overflow-y-auto` and `flex-1` classes
- Footer has `shrink-0` and `border-t` classes

**How transitions are opened**:
```typescript
fireEvent.click(screen.getByRole("button", { name: "+ Add Transition" }));
expect(await screen.findByText("Add Transition")).toBeTruthy();
const transitionCreateDialog = screen.getByRole("dialog");
```

**How it seeds transition data**:
1. Contract tab: Sets transition key, from/to states via comboboxes
2. Start Conditions tab: Sets gate mode ("any"), adds guidance/description
3. Completion Conditions tab: Sets gate mode ("all")
4. Bindings tab: Selects workflows via combobox

**Key interactions**:
```typescript
// Setting states
chooseOption("From State", "activate work unit");
chooseOption("To State", "done");
fireEvent.change(screen.getByLabelText("Transition Key"), { target: { value: "review_to_done" } });

// Start conditions
fireEvent.change(screen.getByLabelText("Start Gate Mode"), { target: { value: "any" } });
fireEvent.click(screen.getByRole("button", { name: "Edit Start Guidance" }));
fireEvent.change(screen.getByLabelText("Guidance"), { target: { value: "Start guidance text" } });

// Adding groups
fireEvent.click(screen.getByRole("button", { name: "Add Group" }));
const groupDialog = await screen.findByRole("dialog", { name: "Add Group" });
fireEvent.click(within(groupDialog).getByRole("button", { name: "Add Fact Condition" }));
fireEvent.click(within(groupDialog).getByRole("button", { name: "Save Group" }));

// Bindings
chooseOption("Bind Workflows", "wf.intake");
```

**Save assertion pattern**:
```typescript
fireEvent.click(screen.getByRole("button", { name: "Create Transition" }));
await waitFor(() => {
  expect(routeContext.saveStateMachineTransitionMock.mock.calls.length).toBeGreaterThan(0);
});

// Assert workflowKeys
expect(routeContext.saveStateMachineTransitionMock).toHaveBeenLastCalledWith(
  expect.objectContaining({ workflowKeys: ["wf.intake"] }),
  expect.anything(),
);

// Assert conditionSets structure
expect(routeContext.saveStateMachineTransitionMock).toHaveBeenLastCalledWith(
  expect.objectContaining({
    conditionSets: expect.arrayContaining([
      expect.objectContaining({ phase: "start", mode: "any", guidance: "Start guidance text" }),
      expect.objectContaining({ phase: "completion", mode: "all" }),
    ]),
  }),
  expect.anything(),
);

// Assert __absent__ is NOT in payload
expect(routeContext.saveStateMachineTransitionMock).toHaveBeenLastCalledWith(
  expect.not.objectContaining({
    transition: expect.objectContaining({ fromState: "__absent__" }),
  }),
  expect.anything(),
);
```

**Edit transition pattern**:
```typescript
fireEvent.click(screen.getAllByRole("button", { name: "Edit Transition" })[0]!);
expect(await screen.findByText("Edit Transition")).toBeTruthy();
const transitionEditDialog = screen.getByRole("dialog");
// ... make changes ...
fireEvent.click(screen.getByRole("button", { name: "Save Transition" }));
await waitFor(() => {
  expect(routeContext.saveStateMachineTransitionMock.mock.calls.length).toBeGreaterThan(
    transitionSaveCallsAfterCreate,
  );
});
```

#### Test 2: "authors typed fact/work-unit conditions in transition dialog and saves edited configs through transition.save" (Lines 1158-1293)

**What it tests**:
- Creating fact conditions with specific operators and values
- Creating work unit conditions with dependency, state checks
- Creating grouped conditions (nested groups)
- Verifying the complete condition payload structure

**How it seeds conditions**:
```typescript
// Start conditions - fact condition
fireEvent.click(screen.getByRole("button", { name: "Add Fact Condition" }));
const startFactConditionRow = screen.getByTestId("start-condition-0");
chooseOptionIn(startFactConditionRow, "Fact", "fact.input_path");
fireEvent.change(within(startFactConditionRow).getByLabelText("Operator"), {
  target: { value: "equals" },
});
fireEvent.change(within(startFactConditionRow).getByLabelText("Value"), {
  target: { value: "docs/input.md" },
});

// Start conditions - work unit condition
fireEvent.click(screen.getByRole("button", { name: "Add Work Unit Condition" }));
const startWorkUnitConditionRow = screen.getByTestId("start-condition-1");
chooseOptionIn(startWorkUnitConditionRow, "Dependency", "link.requires");
chooseOptionIn(startWorkUnitConditionRow, "Work Unit", "WU.TASK");
fireEvent.change(within(startWorkUnitConditionRow).getByLabelText("Operator"), {
  target: { value: "state_is" },
});
chooseOptionIn(startWorkUnitConditionRow, "State", "done");

// Grouped conditions
fireEvent.click(screen.getByRole("button", { name: "Add Group" }));
const groupDialog = await screen.findByRole("dialog", { name: "Add Group" });
fireEvent.click(within(groupDialog).getByRole("button", { name: "Add Fact Condition" }));
const groupedConditionRow = within(groupDialog).getByTestId("group-condition-0");
chooseOptionIn(groupedConditionRow, "Fact", "fact.contract_json");
fireEvent.change(within(groupedConditionRow).getByLabelText("Operator"), {
  target: { value: "exists" },
});
fireEvent.click(within(groupDialog).getByRole("button", { name: "Save Group" }));
```

**Save payload assertion pattern**:
```typescript
await waitFor(() => {
  expect(routeContext.saveStateMachineTransitionMock).toHaveBeenCalledTimes(1);
});

expect(routeContext.saveStateMachineTransitionMock).toHaveBeenLastCalledWith(
  expect.objectContaining({
    conditionSets: expect.arrayContaining([
      expect.objectContaining({
        phase: "start",
        groups: expect.arrayContaining([
          // Flat fact condition
          expect.objectContaining({
            conditions: expect.arrayContaining([
              expect.objectContaining({
                kind: "fact",
                config: expect.objectContaining({
                  factKey: "fact.input_path",
                  operator: "equals",
                  value: "docs/input.md",
                }),
              }),
            ]),
          }),
          // Flat work unit condition
          expect.objectContaining({
            conditions: expect.arrayContaining([
              expect.objectContaining({
                kind: "work_unit",
                config: expect.objectContaining({
                  dependencyKey: "link.requires",
                  workUnitKey: "WU.TASK",
                  operator: "state_is",
                  stateKey: "done",
                }),
              }),
            ]),
          }),
          // Grouped condition
          expect.objectContaining({
            conditions: expect.arrayContaining([
              expect.objectContaining({
                kind: "fact",
                config: expect.objectContaining({
                  factKey: "fact.contract_json",
                  operator: "exists",
                }),
              }),
            ]),
          }),
        ]),
      }),
      expect.objectContaining({
        phase: "completion",
        groups: expect.arrayContaining([
          expect.objectContaining({
            conditions: expect.arrayContaining([
              expect.objectContaining({
                kind: "fact",
                config: expect.objectContaining({
                  factKey: "fact.contract_json",
                  operator: "exists",
                }),
              }),
            ]),
          }),
        ]),
      }),
    ]),
  }),
  expect.anything(),
);
```

### Key Patterns for New Tests

#### 1. Opening Transition Dialog
```typescript
fireEvent.click(await screen.findByRole("button", { name: "+ Add Transition" }));
expect(await screen.findByText("Add Transition")).toBeTruthy();
```

#### 2. Setting Contract Fields
```typescript
fireEvent.change(screen.getByLabelText("Transition Key"), { target: { value: "my_transition" } });
chooseOption("From State", "some state");
chooseOption("To State", "another state");
```

#### 3. Adding Conditions
```typescript
// Navigate to conditions tab
fireEvent.click(screen.getByRole("button", { name: "Start Conditions" }));

// Add flat conditions
fireEvent.click(screen.getByRole("button", { name: "Add Fact Condition" }));
fireEvent.click(screen.getByRole("button", { name: "Add Work Unit Condition" }));

// Add grouped conditions
fireEvent.click(screen.getByRole("button", { name: "Add Group" }));
const groupDialog = await screen.findByRole("dialog", { name: "Add Group" });
fireEvent.click(within(groupDialog).getByRole("button", { name: "Add Fact Condition" }));
// ... configure group conditions ...
fireEvent.click(within(groupDialog).getByRole("button", { name: "Save Group" }));
```

#### 4. Configuring Condition Rows
```typescript
const conditionRow = screen.getByTestId("start-condition-0"); // or "group-condition-0"
chooseOptionIn(conditionRow, "Fact", "fact.key");
fireEvent.change(within(conditionRow).getByLabelText("Operator"), { target: { value: "equals" } });
fireEvent.change(within(conditionRow).getByLabelText("Value"), { target: { value: "test" } });
```

#### 5. Saving and Asserting
```typescript
fireEvent.click(screen.getByRole("button", { name: "Create Transition" }));
await waitFor(() => {
  expect(routeContext.saveStateMachineTransitionMock).toHaveBeenCalledTimes(1);
});

// Assert payload structure
expect(routeContext.saveStateMachineTransitionMock).toHaveBeenLastCalledWith(
  expect.objectContaining({
    conditionSets: expect.arrayContaining([
      expect.objectContaining({
        phase: "start",
        groups: expect.arrayContaining([/* ... */]),
      }),
    ]),
  }),
  expect.anything(),
);
```

#### 6. Editing Existing Transitions
```typescript
fireEvent.click(screen.getAllByRole("button", { name: "Edit Transition" })[0]!);
expect(await screen.findByText("Edit Transition")).toBeTruthy();
// ... make changes ...
fireEvent.click(screen.getByRole("button", { name: "Save Transition" }));
```

### Test Data Fixtures

The `createRouteContext()` factory provides default fixtures:

**Work Unit Types** (lines 55-117):
- Key: "WU.TASK"
- States: "todo", "done"
- Transitions: "todo_to_done" (todo -> done)
- Workflows: "wf.intake"
- Fact schemas: "fact.input_path" (string), "fact.contract_json" (json)

**Condition Sets** (lines 177-192):
- "start_guard" (phase: "start", mode: "all")
- "done_guard" (phase: "completion", mode: "all")

### Important Notes for New Tests

1. **Dialog Structure**: The transition dialog uses test IDs:
   - `transition-tab-scroll-region` - Scrollable content area
   - `transition-dialog-footer` - Fixed footer area
   - `start-condition-N` / `completion-condition-N` / `group-condition-N` - Condition rows

2. **Save Mock**: `saveStateMachineTransitionMock` is the primary mock to assert against for transition saves

3. **Payload Structure**: The save payload should contain:
   - `workflowKeys`: array of workflow keys
   - `conditionSets`: array with `phase`, `mode`, `guidance`, `groups`
   - Groups contain `conditions` array with `kind` and `config`

4. **No __absent__**: The payload should NOT contain `fromState: "__absent__"` (this is a UI placeholder)

## Condition Set Types Documentation

### Source File
`/home/gondilf/Desktop/projects/masters/chiron/packages/contracts/src/methodology/lifecycle.ts`

---

### 1. TransitionConditionSet (Top Level)

The highest-level container for transition conditions:

```typescript
export const TransitionConditionSet = Schema.Struct({
  key: Schema.NonEmptyString,           // Unique identifier for the condition set
  phase: TransitionConditionSetPhase, // "start" | "completion"
  mode: TransitionConditionSetMode,     // "all" | "any"
  groups: Schema.Array(TransitionConditionGroup), // Array of condition groups
  guidance: Schema.optional(Schema.String),     // Optional guidance text
});
```

**Fields:**
- `key`: Non-empty string identifier (e.g., "gate.activate.task")
- `phase`: Either "start" or "completion" - determines which gate this applies to
- `mode`: Either "all" (all groups must pass) or "any" (at least one group must pass)
- `groups`: Array of `TransitionConditionGroup` objects - this is the ONLY container for conditions
- `guidance`: Optional human-readable guidance for this condition set

---

### 2. TransitionConditionGroup (Mid Level)

Groups contain conditions and have their own mode logic:

```typescript
export const TransitionConditionGroup = Schema.Struct({
  key: Schema.NonEmptyString,              // Unique identifier for the group
  mode: TransitionConditionGroupMode,      // "all" | "any"
  conditions: Schema.Array(TransitionCondition), // Array of individual conditions
});
```

**Fields:**
- `key`: Non-empty string identifier (e.g., "group.fact")
- `mode`: Either "all" (all conditions must pass) or "any" (at least one condition must pass)
- `conditions`: Array of `TransitionCondition` objects

**Nesting Rules:**
- Groups can be nested up to 2 levels deep (design constraint)
- Groups are the ONLY way to organize conditions - there are no standalone conditions outside groups

---

### 3. TransitionCondition (Leaf Level)

Individual condition with discriminated kind:

```typescript
export const TransitionCondition = Schema.Struct({
  kind: Schema.NonEmptyString,      // Discriminator: "fact" | "work_unit" | etc.
  required: Schema.optionalWith(Schema.Boolean, { default: () => true }),
  config: Schema.Unknown,           // Type-specific configuration object
  rationale: Schema.optional(Schema.String), // Optional explanation
});
```

**Fields:**
- `kind`: String discriminator determining the condition type
  - `"fact"`: Fact-based condition (checks fact values)
  - `"work_unit"`: Work-unit-based condition (checks work unit state/existence)
- `required`: Boolean, defaults to true. If false, condition is optional
- `config`: Unknown/any type - structure depends on `kind`
- `rationale`: Optional human-readable explanation

---

### 4. Condition Kind: "fact"

Fact conditions check values of facts:

**Config Structure:**
```typescript
{
  factKey: string,      // The fact identifier to check
  operator: string,     // "exists" | "equals" | etc.
  value?: any          // Expected value (for binary operators)
}
```

**Supported Operators:**
- `"exists"`: Check if fact has any value (unary)
- `"equals"`: Check if fact equals expected value (binary)

**Example:**
```typescript
{
  kind: "fact",
  required: true,
  config: {
    factKey: "isApproved",
    operator: "equals",
    value: true
  }
}
```

---

### 5. Condition Kind: "work_unit"

Work-unit conditions check work unit state or existence:

**Config Structure:**
```typescript
{
  operator: string,       // "exists" | "state_is" | etc.
  workUnitKey?: string, // Target work unit (defaults to active)
  stateKey?: string     // Required for state_is operator
}
```

**Supported Operators:**
- `"exists"`: Check if work unit type exists in project
- `"state_is"`: Check if work unit is in specific state

**Example:**
```typescript
{
  kind: "work_unit",
  required: true,
  config: {
    operator: "exists",
    workUnitKey: "dependency-task"
  }
}
```

---

### 6. Complete Payload Example

Full structure expected by `SaveWorkUnitLifecycleTransitionDialogInput`:

```typescript
{
  versionId: "methodology-version-uuid",
  workUnitTypeKey: "task",
  transition: {
    transitionKey: "activate",
    fromState: "draft",
    toState: "ready"
  },
  conditionSets: [
    {
      key: "gate.activate.task",
      phase: "start",           // or "completion"
      mode: "all",              // or "any"
      groups: [
        {
          key: "group.fact",
          mode: "all",          // or "any"
          conditions: [
            {
              kind: "fact",
              required: true,
              config: {
                factKey: "isApproved",
                operator: "equals",
                value: true
              }
            }
          ]
        }
      ],
      guidance: "Optional guidance text"
    }
  ],
  workflowKeys: ["workflow-1", "workflow-2"]
}
```

---

### 7. Key Contract Rules for UI

1. **Groups-Only Structure**: ALL conditions MUST be inside groups. There is no direct conditions array on the set.

2. **Required Keys**: Every set and every group MUST have a unique `key` field (non-empty string).

3. **Mode Values**: Only "all" or "any" are valid for both set-level and group-level mode.

4. **Phase Values**: Only "start" or "completion" are valid for set phase.

5. **Condition Kinds**: Currently supported kinds are "fact" and "work_unit". Unknown kinds will render as read-only diagnostic cards.

6. **Config is Opaque**: The `config` field is `Schema.Unknown` - the UI should preserve whatever structure the condition editor produces.

7. **Default Values**: 
   - `required` defaults to true if not specified
   - `mode` should default to "all" if not specified (runtime behavior)

---

### 8. Related Types Summary

| Type | Purpose | Location |
|------|---------|----------|
| `TransitionConditionSet` | Top-level container for conditions | lifecycle.ts:44-51 |
| `TransitionConditionSetPhase` | "start" \| "completion" | lifecycle.ts:38-39 |
| `TransitionConditionSetMode` | "all" \| "any" | lifecycle.ts:41-42 |
| `TransitionConditionGroup` | Container for conditions | lifecycle.ts:31-36 |
| `TransitionConditionGroupMode` | "all" \| "any" | lifecycle.ts:28-29 |
| `TransitionCondition` | Individual condition | lifecycle.ts:20-26 |
| `SaveWorkUnitLifecycleTransitionDialogInput` | Save payload contract | lifecycle.ts:151-163 |
| `ReplaceWorkUnitTransitionConditionSetsInput` | Direct condition sets replacement | lifecycle.ts:173-180 |

---

### 9. Runtime Interfaces (for reference)

From `/home/gondilf/Desktop/projects/masters/chiron/packages/project-context/src/transition-condition-evaluator.ts`:

```typescript
interface RuntimeConditionSet {
  readonly key: string;
  readonly phase: "start" | "completion";
  readonly mode: "all" | "any";
  readonly groups: readonly RuntimeConditionGroup[];
}

interface RuntimeConditionGroup {
  readonly key?: string;
  readonly mode?: "all" | "any";
  readonly conditions?: readonly RuntimeCondition[];
}

interface RuntimeCondition {
  readonly kind: string;
  readonly required?: boolean;
  readonly config?: Record<string, unknown>;
}
```

---

**Documented**: 2026-03-23
**Source**: packages/contracts/src/methodology/lifecycle.ts
**Purpose**: L2 Transition Dialog UI development

## Task 1 Learnings (2026-03-23)

- Route characterization can seed existing grouped transition data by overriding `routeContext.listStateMachineTransitionsMock.mockResolvedValue(...)` per test.
- Existing-group assertions are most stable through rendered group summaries (`fact.input_path equals ...`, `link.requires state_is done`) after opening `Edit Transition`.
- Save-payload seam for groups-only contracts is best asserted from `saveStateMachineTransitionMock.mock.calls` by verifying each `conditionSet` has `groups` and does not expose top-level `conditions`.
- Update-vs-duplicate regression seam is captured by checking edited seeded transitions keep `groups.length === 1` and preserve seeded group keys for both start/completion sets.

## Task 2 Learnings (2026-03-23)

- Removing top-level bare condition authoring is localized to `GateDraft`, `toConditionSet`, and the Start/Completion tab action + section markup in `StateMachineTab.tsx`.
- Group editor remains the only place where `Add Fact Condition` / `Add Work Unit Condition` should exist; route tests can enforce this by asserting those buttons are absent in Start/Completion tabs while still present in the Add Group dialog.
- The transition save payload stays contract-aligned by serializing only `gate.groups` in `toConditionSet`; no backend/API changes are needed.

## Task 3 Learnings (2026-03-23)

- Group edit-mode can be modeled with a nullable `groupKey` on `groupEditor`; `null` cleanly represents create-mode while preserving existing dialog flow.
- Existing group summary cards are the correct edit affordance surface for both start/completion phases; making them buttons with explicit ARIA labels enables deterministic route integration testing.
- In-place group updates are safest via `gate.groups.map(...)` keyed by `group.key`, which guarantees no duplication and preserves the original key.
- Prefill validation is robustly asserted by opening the group dialog from seeded summaries and checking existing typed condition selections (`fact.input_path`, `fact.contract_json`) render immediately.

## Task 4 Learnings (2026-03-23)

- Transition dialog dirty tracking works best as four explicit tab flags (`isContractDirty`, `isStartDirty`, `isCompletionDirty`, `isBindingsDirty`) with touched-style semantics.
- `onChangeCapture` on per-tab containers catches standard form edits, but combobox command selections and modal save buttons need explicit dirty setters to reliably mark tabs dirty.
- Start/completion dirty state must be marked from both `saveGroupEditor` and gate text save actions (`Save Guidance`/`Save Description`) because those edits happen in nested dialogs outside the main tab container.
- A shared `resetTransitionDirty()` function is the stable reset seam; call it on transition dialog initialization (create/edit) and after successful save.
- Route integration tests can verify resets by asserting indicators are absent immediately after opening edit dialogs and after saving then reopening.

## Task 5 Learnings (2026-03-23)

- Transition close behavior is safest with an explicit two-step flow: `requestCloseTransitionDialog()` gates close attempts on dirty flags, while `closeTransitionDialog()` performs full teardown/reset.
- Full transition-dialog teardown should clear all transient state, not just dirty flags (`transitionDialogOpen`, `transitionDiscardOpen`, `editingTransitionKey`, `transitionEditor`, `transitionEditorTab`, `gateTextEditor`, `groupEditor`, and transition popover open states).
- Reopening transitions must call `resetTransitionDirty()` and clear nested editor state to prevent stale dialog session artifacts from leaking.
- Integration coverage for cancel/reopen regressions is robust when it asserts both discard UX (`Keep Editing` + `Discard Changes`) and post-reopen cleanliness (no dirty indicators, fresh `Add Group` dialog with no seeded unsaved condition rows).

## FactsTab contract description addition (2026-03-23)

- Added `descriptionHuman`/`descriptionAgent` to `RawFact`/`UiFact`/`FactFormState` so the dialog can hold structured markdown for both audiences without mutating the existing guidance objects.
- Contract tab now surfaces two Description textareas that update the dirty flag via the existing `onChangeCapture`, and `toMutationFact` conditionally emits a `description` block only when either textarea has non-empty content.

## FactsTab workUnitKey typing correction (2026-03-23)

- Normalization now trims `fact.validation.workUnitKey` into `UiFact.workUnitKey`, preventing the missing property errors seen during edit/resave flows.
- `toFormState` keeps the normalized `workUnitKey` so the contract tab form can round-trip the value, and `saveFact` writes it back into each `nextFact` entry used for optimistic UI updates.

## FactsTab description routing (2026-03-23)

- Route callbacks now extract `descriptionHuman`/`descriptionAgent` from the FactsTab payload and include a structured `description` block in `apiFact` when either audience has content.
- The new description object keeps both human and agent markdown while still skipping the field when nothing was supplied, preventing extra API chatter.

## FactsTab description simplification (2026-03-23)

- Swapped `descriptionHuman`/`descriptionAgent` for a single `description` string throughout normalization, form state, mutation helpers, and optimistic updates to align with the new schema.
- Contract tab now renders one description textarea bound to `formState.description`, keeping the dirty tracking flow intact.
