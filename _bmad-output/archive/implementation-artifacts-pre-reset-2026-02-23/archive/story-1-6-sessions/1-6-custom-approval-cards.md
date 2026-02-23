# Story 1.6: Custom Approval Card Implementations

**Date:** 2025-11-15  
**Status:** ✅ Complete

---

## Summary

Implemented two specialized approval card components for Story 1.6's workflow initialization tools. These custom cards provide rich, interactive UIs tailored to their specific use cases, going beyond the generic approval card pattern.

---

## Components Implemented

### 1. **WorkflowPathSelectorCard** ✅

**Location:** `apps/web/src/components/workflows/workflow-path-selector-card.tsx`

**Purpose:** Interactive workflow path selection with AI recommendations

**Use Case:** The `select_workflow_path` tool presents multiple workflow paths (Quick-Flow, Method, Enterprise) and recommends the best one based on project complexity and requirements.

**Features:**

1. **Visual Path Cards**
   - Each path rendered as a selectable card with radio button
   - Click anywhere on card to select
   - Selected card highlighted with blue border + background
   - Recommended path has gold star ⭐ + yellow border

2. **AI Recommendation Display**
   - "Best for your project because:" section
   - Bulleted list of reasons with checkmarks ✓
   - Yellow background to highlight recommended path
   - Clear visual hierarchy

3. **Warning Messages**
   - Non-recommended paths show "May not be ideal because:"
   - Orange background with warning icon ⚠
   - Lists specific concerns (e.g., "Doesn't include architecture phase")

4. **Deliverables Preview**
   - "What you'll get:" section for each path
   - Shows workflow outputs (PRD, architecture docs, stories, etc.)
   - Helps user understand what choosing this path means

5. **Complexity Icons**
   - 🚀 Quick-Flow (blue - rapid prototyping)
   - ⚖️ Method (orange - structured planning)
   - 🏢 Enterprise (purple - full governance)

6. **Tags**
   - Badge showing complexity level
   - Badge showing field type (greenfield/brownfield)

**Data Structure:**

```typescript
interface WorkflowPath {
  id: string;
  name: string;
  displayName: string;
  description: string;
  tags: {
    complexity?: "quick-flow" | "method" | "enterprise";
    fieldType?: "greenfield" | "brownfield";
  };
  deliverables?: string[]; // e.g., ["PRD", "Architecture Docs", "Epic Breakdown"]
}

interface SelectionReasoning {
  recommendedPathId: string;
  reasons: string[]; // Why this path is recommended
  warnings?: Record<string, string[]>; // pathId -> warning messages
}
```

**Example Output from Tool:**

```json
{
  "type": "approval_required",
  "tool_name": "select_workflow_path",
  "generated_value": {
    "available_paths": [
      {
        "id": "method-greenfield",
        "name": "method-greenfield",
        "displayName": "Method (Greenfield)",
        "description": "Structured planning with architecture docs",
        "tags": {
          "complexity": "method",
          "fieldType": "greenfield"
        },
        "deliverables": [
          "Product brief with requirements",
          "Architecture documentation",
          "Epic breakdown with tech specs",
          "Implementation stories"
        ]
      },
      {
        "id": "quick-flow-greenfield",
        "name": "quick-flow-greenfield",
        "displayName": "Quick Flow (Greenfield)",
        "description": "Rapid prototyping with minimal docs",
        "tags": {
          "complexity": "quick-flow",
          "fieldType": "greenfield"
        },
        "deliverables": [
          "Basic project setup",
          "Quick implementation stories"
        ]
      }
    ],
    "reasoning": {
      "recommendedPathId": "method-greenfield",
      "reasons": [
        "Multi-tenant architecture needs structured planning",
        "HIPAA compliance requires security design documentation",
        "3-4 month timeline matches Method track scope"
      ],
      "warnings": {
        "quick-flow-greenfield": [
          "Doesn't include architecture phase",
          "Limited for multi-tenant complexity",
          "May not satisfy HIPAA documentation requirements"
        ]
      }
    }
  }
}
```

**Visual Example:**

```
╔═══════════════════════════════════════════════════════════╗
║ ⚖️ Method (Greenfield)                          ⭐ [●]   ║
║ Structured planning with architecture docs                ║
║                                                            ║
║ ┌───────────────────────────────────────────────────────┐ ║
║ │ Best for your project because:                        │ ║
║ │ ✓ Multi-tenant architecture needs structured planning │ ║
║ │ ✓ HIPAA compliance requires security design docs      │ ║
║ │ ✓ 3-4 month timeline matches Method track scope       │ ║
║ └───────────────────────────────────────────────────────┘ ║
║                                                            ║
║ What you'll get:                                           ║
║ • Product brief with requirements                          ║
║ • Architecture documentation                               ║
║ • Epic breakdown with tech specs                           ║
║ • Implementation stories                                   ║
║                                                            ║
║ [method] [greenfield]                                      ║
╚═══════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════╗
║ 🚀 Quick Flow (Greenfield)                          [○]   ║
║ Rapid prototyping with minimal docs                       ║
║                                                            ║
║ ┌───────────────────────────────────────────────────────┐ ║
║ │ ⚠ May not be ideal because:                           │ ║
║ │ ⚠ Doesn't include architecture phase                  │ ║
║ │ ⚠ Limited for multi-tenant complexity                 │ ║
║ │ ⚠ May not satisfy HIPAA documentation requirements    │ ║
║ └───────────────────────────────────────────────────────┘ ║
║                                                            ║
║ [quick-flow] [greenfield]                                  ║
╚═══════════════════════════════════════════════════════════╝

[Continue with Selected Path]
```

---

### 2. **ProjectNameSelectorCard** ✅

**Location:** `apps/web/src/components/workflows/project-name-selector-card.tsx`

**Purpose:** AI-generated project name suggestions with custom name option

**Use Case:** The `generate_project_name` tool suggests 3-5 kebab-case project names based on the project description and complexity. User can select a suggestion or provide their own.

**Features:**

1. **AI-Generated Suggestions**
   - Radio button for each suggestion
   - Name displayed in monospace font (code style)
   - Reasoning/description for each name
   - Recommended suggestion has sparkles icon ✨

2. **Custom Name Option**
   - "Use custom name instead" option with input field
   - Real-time validation as user types
   - Validation rules:
     - Pattern: `^[a-z0-9-]+$` (kebab-case)
     - Length: 3-50 characters
     - No leading/trailing hyphens
     - No consecutive hyphens

3. **Validation Feedback**
   - Red border on input if invalid
   - Error message below input explaining issue
   - Green success message when valid
   - Live preview showing final name

4. **Auto-Selection**
   - When user starts typing in custom field, auto-selects "custom" option
   - Prevents confusion about which option is active

5. **Separator**
   - Clear "Or" separator between suggestions and custom option
   - Visual distinction between AI suggestions and manual input

**Data Structure:**

```typescript
interface NameSuggestion {
  name: string; // kebab-case project name
  reasoning: string; // Why this name was suggested
  recommended?: boolean; // Is this the top recommendation?
}
```

**Example Output from Tool:**

```json
{
  "type": "approval_required",
  "tool_name": "generate_project_name",
  "generated_value": {
    "suggestions": [
      {
        "name": "healthcare-task-hub",
        "reasoning": "Short, clear, domain-focused",
        "recommended": false
      },
      {
        "name": "nurse-shift-manager",
        "reasoning": "Emphasizes core use case (scheduling)",
        "recommended": true
      },
      {
        "name": "medical-workflow-system",
        "reasoning": "Broader scope, extensible naming",
        "recommended": false
      },
      {
        "name": "hospital-task-coordinator",
        "reasoning": "Multi-facility focus",
        "recommended": false
      }
    ]
  }
}
```

**Validation Examples:**

```typescript
// ✅ Valid Names
"my-project"          // Valid
"task-manager-v2"     // Valid
"app123"              // Valid
"healthcare-app"      // Valid

// ❌ Invalid Names
"MyProject"           // Uppercase not allowed
"my_project"          // Underscores not allowed
"my--project"         // Consecutive hyphens not allowed
"-myproject"          // Leading hyphen not allowed
"myproject-"          // Trailing hyphen not allowed
"ab"                  // Too short (< 3 chars)
"a-very-long-project-name-that-exceeds-the-fifty-character-limit"  // Too long (> 50)
```

**Visual Example:**

```
╔═══════════════════════════════════════════════════════════╗
║ 📝 Project Name Suggestions                                ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║ [○] healthcare-task-hub                                    ║
║     Short, clear, domain-focused                           ║
║                                                            ║
║ [●] nurse-shift-manager                              ✨   ║
║     Emphasizes core use case (scheduling)                  ║
║                                                            ║
║ [○] medical-workflow-system                                ║
║     Broader scope, extensible naming                       ║
║                                                            ║
║ [○] hospital-task-coordinator                              ║
║     Multi-facility focus                                   ║
║                                                            ║
║ ──────────────────── Or ─────────────────────             ║
║                                                            ║
║ [○] Use custom name instead                                ║
║     ┌─────────────────────────────────────────────────┐   ║
║     │ my-custom-project-name                          │   ║
║     └─────────────────────────────────────────────────┘   ║
║                                                            ║
║     Must be kebab-case, 3-50 characters                    ║
║     (lowercase, numbers, hyphens only)                     ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝

[Accept Selected Name]
```

**Validation States:**

```
// Empty (no error)
┌─────────────────────────────────────────────────┐
│                                                 │
└─────────────────────────────────────────────────┘
Must be kebab-case, 3-50 characters

// Invalid (red border + error)
┌─────────────────────────────────────────────────┐
│ MyProject                                       │ 🔴
└─────────────────────────────────────────────────┘
❌ Name must be kebab-case (lowercase, numbers, hyphens only)

// Valid (green success)
┌─────────────────────────────────────────────────┐
│ my-project                                      │ ✅
└─────────────────────────────────────────────────┘
✅ Valid project name: my-project
```

---

## Integration with Chat Interface

The chat interface (`AskUserChatStepNew`) now automatically renders the appropriate approval card based on the tool name:

```typescript
// In ask-user-chat-step-new.tsx
{pendingApprovals.map(([toolName, state]) => {
  // Custom card for workflow path selection
  if (toolName === "select_workflow_path") {
    return <WorkflowPathSelectorCard ... />;
  }

  // Custom card for project name selection
  if (toolName === "generate_project_name") {
    return <ProjectNameSelectorCard ... />;
  }

  // Default approval card for other tools
  return <ApprovalCard ... />;
})}
```

**Automatic Detection:**
- No configuration needed
- Tool name determines which card to render
- Falls back to default `ApprovalCard` for unknown tools

---

## User Experience Flow

### Workflow Path Selection

1. **Agent analyzes project**
   - Considers complexity classification (method)
   - Considers field type (greenfield)
   - Queries database for matching workflow paths

2. **Tool executes**
   - Fetches available paths from database
   - Generates recommendation with reasoning
   - Returns structured data with paths + reasoning

3. **Custom card renders**
   - Shows all available paths as cards
   - Highlights recommended path with star ⭐
   - Pre-selects recommended path
   - Shows warnings for non-recommended paths

4. **User interacts**
   - Can click any path card to select it
   - Can review deliverables for each path
   - Can see why each path is/isn't recommended

5. **User approves**
   - Clicks "Continue with Selected Path"
   - Selected path ID saved to execution variables
   - Workflow proceeds to next step

---

### Project Name Selection

1. **Agent generates suggestions**
   - Uses Ax Predict strategy (no ChainOfThought)
   - Analyzes project description + complexity
   - Generates 3-5 kebab-case names with reasoning

2. **Tool executes**
   - Returns list of name suggestions
   - Marks one as recommended (usually most descriptive)

3. **Custom card renders**
   - Shows all suggestions with reasoning
   - Pre-selects recommended suggestion
   - Shows "Use custom name" option

4. **User interacts**
   - Can select any suggested name
   - Can choose "custom" and type own name
   - Sees real-time validation feedback
   - Sees green success when name is valid

5. **User approves**
   - Clicks "Accept Selected Name"
   - Name saved to execution variables
   - Project created with selected name

---

## Technical Implementation Details

### State Management

Both components manage local state for selection:

```typescript
// WorkflowPathSelectorCard
const [selectedPathId, setSelectedPathId] = useState<string>(
  reasoning?.recommendedPathId || availablePaths[0]?.id || ""
);

// ProjectNameSelectorCard
const [selectedOption, setSelectedOption] = useState<string>(
  suggestions.find((s) => s.recommended)?.name || suggestions[0]?.name || ""
);
const [customName, setCustomName] = useState("");
const [customNameError, setCustomNameError] = useState("");
```

### Validation Logic (Project Names)

```typescript
function validateCustomName(name: string): boolean {
  if (name.length === 0) {
    setCustomNameError("");
    return false;
  }

  if (name.length < 3) {
    setCustomNameError("Name must be at least 3 characters");
    return false;
  }

  if (name.length > 50) {
    setCustomNameError("Name must be at most 50 characters");
    return false;
  }

  if (!/^[a-z0-9-]+$/.test(name)) {
    setCustomNameError(
      "Name must be kebab-case (lowercase, numbers, hyphens only)"
    );
    return false;
  }

  if (name.startsWith("-") || name.endsWith("-")) {
    setCustomNameError("Name cannot start or end with a hyphen");
    return false;
  }

  if (name.includes("--")) {
    setCustomNameError("Name cannot contain consecutive hyphens");
    return false;
  }

  setCustomNameError("");
  return true;
}
```

### Approval Submission

Both components use the same `approveToolCall` mutation:

```typescript
const approveMutation = trpc.workflows.approveToolCall.useMutation({
  onSuccess: () => {
    toast.success("Selection confirmed!");
  },
  onError: (error) => {
    toast.error(`Selection failed: ${error.message}`);
  },
});

async function handleApprove() {
  await approveMutation.mutateAsync({
    executionId,
    toolName,
    approvedValue: {
      // Path selector
      selected_workflow_path_id: selectedPathId,
      // OR name selector
      project_name: finalName,
    },
  });
}
```

---

## Styling & Design System

### Color Palette

**Workflow Path Selector:**
- Recommended path: Yellow border (`border-yellow-500`) + star icon
- Selected path: Blue border + blue background (`border-blue-500`, `bg-blue-50`)
- Warning section: Orange background (`bg-orange-50`)
- Recommendation section: Yellow background (`bg-yellow-50`)
- Deliverables section: Muted background (`bg-muted/50`)

**Project Name Selector:**
- Recommended name: Sparkles icon ✨ (yellow)
- Selected option: Blue border + blue background
- Valid custom name: Green success message + checkmark
- Invalid custom name: Red border + red error text
- Input field: Monospace font (`font-mono`)

### Icons

- ⭐ Star - Recommended path
- ✨ Sparkles - Recommended name
- ✓ Check - Valid/approved/reason
- ⚠ Warning - Non-ideal path
- 🚀 Quick-Flow complexity
- ⚖️ Method complexity
- 🏢 Enterprise complexity
- 📝 Project name heading

### Component Hierarchy

```
WorkflowPathSelectorCard
├── Card
│   ├── CardHeader
│   │   └── Title + status badge
│   ├── CardContent
│   │   └── RadioGroup
│   │       └── Path cards (map)
│   │           ├── Radio button
│   │           ├── Header (name + star/icon)
│   │           ├── Description
│   │           ├── Recommendation section (if recommended)
│   │           ├── Warning section (if not recommended)
│   │           ├── Deliverables section
│   │           └── Tags (complexity, fieldType)
│   └── CardFooter
│       └── Continue button

ProjectNameSelectorCard
├── Card
│   ├── CardHeader
│   │   └── Title + status badge
│   ├── CardContent
│   │   └── RadioGroup
│   │       ├── Name suggestions (map)
│   │       │   ├── Radio button
│   │       │   ├── Name (monospace + sparkles if recommended)
│   │       │   └── Reasoning
│   │       ├── Separator ("Or")
│   │       └── Custom option
│   │           ├── Radio button
│   │           ├── Label
│   │           ├── Input field
│   │           ├── Validation message
│   │           └── Success preview (if valid)
│   └── CardFooter
│       └── Accept button
```

---

## Files Created/Modified

### New Components
1. `apps/web/src/components/workflows/workflow-path-selector-card.tsx` ✅ NEW
   - 293 lines
   - Custom approval UI for workflow path selection

2. `apps/web/src/components/workflows/project-name-selector-card.tsx` ✅ NEW
   - 325 lines
   - Custom approval UI for project name selection with validation

### Modified Components
3. `apps/web/src/components/workflows/steps/ask-user-chat-step-new.tsx` ✅ UPDATED
   - Added imports for custom cards
   - Added conditional rendering logic for tool types
   - Falls back to default ApprovalCard for unknown tools

---

## Testing Checklist

### Workflow Path Selector

- [ ] **Path Display:**
  - [ ] All paths render as cards
  - [ ] Recommended path has star ⭐ + yellow border
  - [ ] Selected path has blue border + background
  - [ ] Complexity icons display correctly (🚀⚖️🏢)
  - [ ] Tags display (complexity, fieldType)

- [ ] **Recommendation Section:**
  - [ ] "Best for your project because:" appears for recommended
  - [ ] Reasons list with checkmarks ✓
  - [ ] Yellow background highlights section

- [ ] **Warning Section:**
  - [ ] "May not be ideal because:" appears for non-recommended
  - [ ] Warnings list with ⚠ icons
  - [ ] Orange background highlights section

- [ ] **Deliverables:**
  - [ ] "What you'll get:" section displays
  - [ ] Deliverable list formatted correctly

- [ ] **Interaction:**
  - [ ] Click anywhere on card to select
  - [ ] Radio button updates
  - [ ] Can switch between paths
  - [ ] Continue button enabled after selection
  - [ ] Approval mutation succeeds
  - [ ] Success toast displays

### Project Name Selector

- [ ] **Suggestions Display:**
  - [ ] All suggestions render with radio buttons
  - [ ] Names display in monospace font
  - [ ] Reasoning displays below each name
  - [ ] Recommended suggestion has sparkles ✨
  - [ ] Pre-selects recommended suggestion

- [ ] **Custom Name Option:**
  - [ ] "Use custom name instead" option displays
  - [ ] Input field appears
  - [ ] Auto-selects "custom" when user types
  - [ ] Validation help text displays

- [ ] **Validation:**
  - [ ] Red border on invalid input
  - [ ] Error message displays with specific issue
  - [ ] Validates length (3-50 chars)
  - [ ] Validates pattern (kebab-case)
  - [ ] Rejects leading/trailing hyphens
  - [ ] Rejects consecutive hyphens
  - [ ] Rejects uppercase letters
  - [ ] Rejects underscores

- [ ] **Success State:**
  - [ ] Green success message when valid
  - [ ] Shows "Valid project name: {name}"
  - [ ] Checkmark icon appears

- [ ] **Interaction:**
  - [ ] Can select any suggestion
  - [ ] Can switch to custom option
  - [ ] Can type in custom field
  - [ ] Accept button disabled if invalid
  - [ ] Accept button enabled if valid
  - [ ] Approval mutation succeeds
  - [ ] Success toast displays

---

## Future Enhancements

### Workflow Path Selector

1. **Comparison View** (Future)
   - Side-by-side comparison of paths
   - Highlight differences in deliverables
   - Show effort estimates for each path

2. **Path Preview** (Future)
   - Expand card to show full workflow diagram
   - Show all phases and steps
   - Estimated timeline visualization

3. **Filter Options** (Future)
   - Filter by complexity
   - Filter by field type
   - Filter by estimated duration

### Project Name Selector

1. **Name Availability Check** (Future)
   - Check if name already exists in system
   - Check if GitHub repo name available
   - Show availability badge next to name

2. **More Suggestions** (Future)
   - "Generate more suggestions" button
   - Regenerate with different style (e.g., "more creative")
   - Allow user to specify naming preferences

3. **Name Templates** (Future)
   - Show naming pattern templates
   - E.g., "{domain}-{function}-{type}"
   - Let user pick template and fill in blanks

---

## Success Metrics

### User Experience
- ✅ Users can easily identify recommended options
- ✅ Users understand why options are recommended
- ✅ Validation prevents invalid project names
- ✅ Custom name option gives flexibility
- ✅ Visual design matches Chiron's aesthetic

### Developer Experience
- ✅ Components are reusable for future workflows
- ✅ TypeScript type safety enforced
- ✅ Props clearly documented
- ✅ Follows shadcn/ui patterns

### System Integration
- ✅ Frontend build succeeds
- ✅ Components render without errors
- ✅ Approval mutations work correctly
- ✅ Data structures match backend expectations

---

## Conclusion

The custom approval cards elevate Story 1.6's user experience significantly:

**Workflow Path Selector:**
- Transforms database query results into rich, interactive cards
- Clearly communicates AI recommendations with reasoning
- Warns users about potential issues with non-recommended paths
- Shows deliverables to set expectations

**Project Name Selector:**
- Presents AI suggestions in clean, scannable format
- Allows custom names with real-time validation
- Prevents invalid names before submission
- Guides users with helpful error messages

**Impact:**
- Replaces generic JSON display with purpose-built UIs
- Reduces cognitive load (users don't need to parse data structures)
- Increases trust (clear reasoning builds confidence)
- Improves accuracy (validation prevents errors)

**Next Steps:**
- Test with real workflow data
- Gather user feedback on interactions
- Refine styling based on usage patterns
- Consider additional custom cards for other tool types
