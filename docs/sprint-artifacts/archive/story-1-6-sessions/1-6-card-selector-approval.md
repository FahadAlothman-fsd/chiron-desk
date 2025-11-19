# Story 1.6: Card Selector Approval Implementation

**Date**: 2025-11-16  
**Feature**: Visual card selector for tool approvals with dynamic options

---

## Overview

Enhanced the approval flow to support **card-based selection** when tools have dynamic options from the database (using `optionsSource`). This provides a better UX for selecting from predefined choices like complexity levels or workflow paths.

---

## Changes Made

### 1. Backend: ax-generation-tool.ts

**File**: `/packages/api/src/services/workflow-engine/tools/ax-generation-tool.ts`

**Change**: Return different approval type when tool has `optionsSource`

```typescript
// Before: Always returned "approval_required"
if (config.requiresApproval) {
  return {
    type: "approval_required",
    tool_name: config.name,
    generated_value: publicResult,
    reasoning,
  };
}

// After: Return "approval_required_selector" when options exist
if (config.requiresApproval) {
  // Check if this tool has options (for card selector UI)
  if (config.optionsSource) {
    const availableOptions =
      context.executionVariables[config.optionsSource.outputVariable];

    return {
      type: "approval_required_selector",
      tool_name: config.name,
      generated_value: publicResult,
      available_options: availableOptions || [],
      reasoning,
    };
  }

  // Standard text-based approval
  return {
    type: "approval_required",
    tool_name: config.name,
    generated_value: publicResult,
    reasoning,
  };
}
```

**Impact**: Tools with `optionsSource` now include the available options in the approval result.

---

### 2. Backend: ask-user-chat-handler.ts

**File**: `/packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts`

**Change**: Detect and store both approval types in approval states

```typescript
// Updated to handle both approval types
if (
  toolResult &&
  typeof toolResult === "object" &&
  "type" in toolResult &&
  (toolResult.type === "approval_required" ||
   toolResult.type === "approval_required_selector")
) {
  console.log(
    `[AskUserChatHandler] Tool ${toolName} requires approval (type: ${toolResult.type})`,
  );

  // Save to approval states with optional available_options
  approvalStates[toolName] = {
    status: "pending",
    value: toolResult.generated_value || toolResult.value || {},
    reasoning: toolResult.reasoning,
    ...(toolResult.type === "approval_required_selector" && {
      available_options: toolResult.available_options || [],
    }),
    rejection_history: approvalStates[toolName]?.rejection_history || [],
    createdAt: new Date().toISOString(),
  };
}
```

**Impact**: Approval states now include `available_options` for selector-based tools.

---

### 3. Frontend: New Component - ApprovalCardSelector

**File**: `/apps/web/src/components/workflows/approval-card-selector.tsx` (NEW)

**Purpose**: Card-based selector UI for tools with dynamic options

**Features**:
- ✅ Visual radio button cards for each option
- ✅ AI's recommendation is pre-selected and highlighted with ⭐
- ✅ User can select a different option before approving
- ✅ Shows option name and description
- ✅ Collapsible reasoning section
- ✅ Approve/Reject with feedback
- ✅ Read-only state after approval showing selected option

**Key Props**:
```typescript
interface ApprovalCardSelectorProps {
  executionId: string;
  agentId: string;
  toolName: string;
  generatedValue: Record<string, unknown>; // AI's recommended choice
  availableOptions: Option[];              // All options from database
  reasoning?: string;
  isApproved?: boolean;
  isRejected?: boolean;
}

interface Option {
  value: string;      // e.g., "simple", "moderate", "complex"
  name: string;       // e.g., "Quick Flow Track"
  description: string; // Full description from database
}
```

**User Flow**:
1. AI recommends an option (e.g., "simple" complexity)
2. Card selector shows all 3 options with AI's choice highlighted
3. User can click a different card to override AI's recommendation
4. User clicks "Accept" → submits their selected choice (not necessarily AI's)
5. Approval state shows the final selected option

---

### 4. Frontend: ask-user-chat-step-new.tsx

**File**: `/apps/web/src/components/workflows/steps/ask-user-chat-step-new.tsx`

**Changes**:

1. **Import new component**:
```typescript
import { ApprovalCardSelector } from "../approval-card-selector";
```

2. **Update ApprovalState interface**:
```typescript
interface ApprovalState {
  status: "pending" | "approved" | "rejected";
  value: Record<string, unknown>;
  reasoning?: string;
  available_options?: Array<{  // NEW
    value: string;
    name: string;
    description: string;
  }>;
  rejection_history?: Array<{
    feedback: string;
    timestamp: string;
  }>;
  createdAt?: string;
}
```

3. **Render logic - detect selector type**:
```typescript
// Render selector card if available_options exist
if (state.available_options && state.available_options.length > 0) {
  return (
    <div key={`approval-${toolName}`} className="my-4">
      <ApprovalCardSelector
        executionId={executionId}
        agentId={stepConfig.agentId}
        toolName={toolName}
        generatedValue={state.value as Record<string, unknown>}
        availableOptions={state.available_options}
        reasoning={state.reasoning}
        isApproved={state.status === "approved"}
        isRejected={state.status === "rejected"}
      />
    </div>
  );
}

// Default approval card for other tools (text-based)
return (
  <div key={`approval-${toolName}`} className="my-4">
    <ApprovalCard
      // ... existing props
    />
  </div>
);
```

---

## Data Flow

### 1. Tool Execution (Backend)
```
1. Tool configured with optionsSource
   ↓
2. Fetch options from database (e.g., 3 complexity levels)
   ↓
3. Store in context.executionVariables.complexity_options
   ↓
4. Pass to Ax signature as input
   ↓
5. AI generates choice (e.g., "simple")
   ↓
6. Return approval_required_selector with:
   - generated_value: { complexity_classification: "simple" }
   - available_options: [{ value: "simple", ... }, { value: "moderate", ... }, ...]
   - reasoning: "The project is a solo developer..."
```

### 2. Approval State Storage (Backend)
```
Tool result received
   ↓
Check type === "approval_required_selector"
   ↓
Save to approval_states:
   {
     status: "pending",
     value: { complexity_classification: "simple" },
     available_options: [...],
     reasoning: "..."
   }
```

### 3. Frontend Rendering
```
Load approval_states from execution
   ↓
Check if state.available_options exists
   ↓
YES: Render ApprovalCardSelector
   - Show all options as cards
   - Highlight AI's choice
   - Allow user to select different option
   ↓
User clicks Accept
   ↓
Submit user's selected value (might differ from AI's)
```

---

## Tool Compatibility

### ✅ Works With
- `update_complexity` - Has optionsSource (complexity levels)
- `select_workflow_path` - Has optionsSource (workflow paths) [future]
- Any tool with `optionsSource` configuration

### ⚠️ Fallback Behavior
- `update_summary` - No optionsSource → uses standard ApprovalCard
- `generate_project_name` - Custom implementation → uses ProjectNameSelectorCard

---

## Testing Checklist

### Backend
- [ ] Tool with optionsSource returns `approval_required_selector`
- [ ] Tool without optionsSource returns `approval_required`
- [ ] `available_options` included in approval state
- [ ] Options are correctly fetched from database
- [ ] User's selected value (not AI's) is saved on approval

### Frontend
- [ ] Card selector renders with all options
- [ ] AI's recommendation is highlighted with ⭐
- [ ] User can select different option
- [ ] Selected option is visually indicated (border + checkmark)
- [ ] Reasoning section is collapsible
- [ ] Accept button submits user's selected value
- [ ] Reject & Explain flow works
- [ ] Approved state shows selected option
- [ ] Fallback to standard ApprovalCard works for non-selector tools

---

## Example: update_complexity Tool

### 1. Configuration (Seed)
```typescript
{
  name: "update_complexity",
  toolType: "ax-generation",
  requiresApproval: true,
  optionsSource: {
    table: "workflow_paths",
    distinctField: "tags->'complexity'",
    filterBy: { "tags->'fieldType'->>'value'": "{{detected_field_type}}" },
    orderBy: "sequence_order",
    outputVariable: "complexity_options"
  },
  axSignature: {
    input: [
      { name: "complexity_options", type: "json", source: "variable", ... }
    ],
    output: [
      { name: "complexity_classification", type: "string", ... }
    ]
  }
}
```

### 2. Database Options
```sql
SELECT DISTINCT tags->'complexity' FROM workflow_paths
WHERE tags->'fieldType'->>'value' = 'greenfield';

Results:
[
  {
    "value": "simple",
    "name": "Quick Flow Track",
    "description": "Fast implementation track..."
  },
  {
    "value": "moderate",
    "name": "BMad Method Track",
    "description": "Full product planning track..."
  },
  {
    "value": "complex",
    "name": "Enterprise Method Track",
    "description": "Extended enterprise planning..."
  }
]
```

### 3. Tool Execution
```
AI receives 3 options + project description
   ↓
AI selects "simple" based on solo dev + 2-3 week timeline
   ↓
Returns:
{
  type: "approval_required_selector",
  generated_value: { complexity_classification: "simple" },
  available_options: [ { value: "simple", ... }, ... ],
  reasoning: "The project is a solo developer in 2-3 weeks..."
}
```

### 4. UI Rendering
```
┌─────────────────────────────────────────────────┐
│ Update Complexity                               │
├─────────────────────────────────────────────────┤
│ Athena recommends: Quick Flow Track ⭐          │
│                                                 │
│ ┌──────────────────────────────────────────┐   │
│ │ ● Quick Flow Track ⭐ AI Recommendation  │✓  │
│ │   Fast implementation track using tech-  │   │
│ │   spec planning only. Best for bug...    │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ ┌──────────────────────────────────────────┐   │
│ │ ○ BMad Method Track                       │   │
│ │   Full product planning track using PRD   │   │
│ │   + Architecture + UX. Best for...        │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ ┌──────────────────────────────────────────┐   │
│ │ ○ Enterprise Method Track                 │   │
│ │   Extended enterprise planning track...   │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ ▼ Reasoning                                    │
│                                                 │
│ [Accept] [Reject & Explain]                    │
└─────────────────────────────────────────────────┘
```

---

## Benefits

### UX Improvements
- ✅ **Visual Selection**: Users see all options at once (not just AI's choice)
- ✅ **Scannable**: Easy to compare options side-by-side
- ✅ **Guided Choice**: AI recommendation helps but doesn't force
- ✅ **Informed Decision**: Full descriptions visible
- ✅ **Flexible**: User can override AI if needed

### Technical Benefits
- ✅ **Type Safety**: Different approval types for different UIs
- ✅ **Reusable**: Any tool with optionsSource gets card selector automatically
- ✅ **Consistent**: Matches workflow initializer pattern
- ✅ **Extensible**: Easy to add new selector-based tools

### Business Benefits
- ✅ **Better Decisions**: Users see context before approving
- ✅ **Faster Workflow**: Visual selection is quicker than reading text
- ✅ **Learning Data**: Track when users override AI's recommendations
- ✅ **Reduced Errors**: Clear options prevent misunderstandings

---

## Next Steps

1. Test with `update_complexity` tool (has optionsSource already)
2. Convert `fetch_workflow_paths` → `select_workflow_path` with optionsSource
3. Verify card selector renders correctly
4. Test user selecting different option than AI recommended
5. Verify approval saves user's choice (not AI's)
6. Add analytics to track AI vs user selections

---

## Files Changed

### Backend
- ✅ `/packages/api/src/services/workflow-engine/tools/ax-generation-tool.ts`
- ✅ `/packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts`

### Frontend
- ✅ `/apps/web/src/components/workflows/approval-card-selector.tsx` (NEW)
- ✅ `/apps/web/src/components/workflows/steps/ask-user-chat-step-new.tsx`

### Documentation
- ✅ `/docs/sprint-artifacts/1-6-card-selector-approval.md` (this file)

---

## Verification

Run these checks to verify the implementation:

```bash
# 1. Check backend returns correct type
grep -n "approval_required_selector" packages/api/src/services/workflow-engine/tools/ax-generation-tool.ts

# 2. Check approval state includes options
grep -n "available_options" packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts

# 3. Check frontend component exists
ls apps/web/src/components/workflows/approval-card-selector.tsx

# 4. Check frontend renders selector
grep -n "ApprovalCardSelector" apps/web/src/components/workflows/steps/ask-user-chat-step-new.tsx
```

All checks should pass! ✅
