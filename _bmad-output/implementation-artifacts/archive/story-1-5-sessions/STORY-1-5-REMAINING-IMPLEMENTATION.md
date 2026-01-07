# Story 1.5: Remaining Frontend Implementation Guide

**Status:** Backend complete, UI components complete, routing/integration pending  
**Last Updated:** 2025-11-10

## Completed Work ✅

- ✅ Database schema (project_status enum, updated projects table)
- ✅ ExecuteActionStepHandler + AskUserStepHandler (29 tests passing)
- ✅ workflow-init-new seed (Steps 1-2)
- ✅ tRPC endpoints (createMinimal, setInitializer, getInitializers)
- ✅ ExecuteActionStep component
- ✅ AskUserStep component
- ✅ Component tests

## Remaining Work 📋

### Task 7.2-7.3: Home Page "Create New Project" Button

**File:** `apps/web/src/routes/index.tsx`

**Implementation:**
```tsx
import { useNavigate } from "@tanstack/react-router";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function HomePage() {
  const navigate = useNavigate();
  const createProject = trpc.projects.createMinimal.useMutation({
    onSuccess: (data) => {
      navigate({
        to: "/projects/$projectId/select-initializer",
        params: { projectId: data.project.id },
      });
    },
    onError: (error) => {
      toast.error("Failed to create project", {
        description: error.message,
      });
    },
  });

  return (
    <div>
      {/* Existing home page content */}
      
      <Button
        onClick={() => createProject.mutate({ name: "Untitled Project" })}
        disabled={createProject.isPending}
      >
        <Plus className="mr-2 h-4 w-4" />
        {createProject.isPending ? "Creating..." : "Create New Project"}
      </Button>
    </div>
  );
}
```

**AC Coverage:** AC1-AC5

---

### Task 8.1: Install shadcn RadioGroup13

**Command:**
```bash
bunx --bun shadcn@latest add @ss-components/radio-group-13
```

**Verification:**
- Check `apps/web/src/components/ui/radio-group-13.tsx` exists
- Import and use in initializer selector

---

### Task 8.4-8.5: Workflow Initializer Selector Page

**File:** `apps/web/src/routes/projects/$projectId/select-initializer.tsx`

**Implementation:**
```tsx
import { useParams, useNavigate } from "@tanstack/react-router";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { RadioGroup13 } from "@/components/ui/radio-group-13";
import { Workflow } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function SelectInitializerPage() {
  const { projectId } = useParams({ from: "/projects/$projectId/select-initializer" });
  const navigate = useNavigate();
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);

  // Query available initializers
  const { data: initializers, isLoading } = trpc.workflows.getInitializers.useQuery({
    type: "new-project",
  });

  // Set initializer mutation
  const setInitializer = trpc.projects.setInitializer.useMutation({
    onSuccess: () => {
      navigate({
        to: "/projects/$projectId/initialize",
        params: { projectId },
      });
    },
    onError: (error) => {
      toast.error("Failed to set initializer", {
        description: error.message,
      });
    },
  });

  // Auto-select if only one option
  useEffect(() => {
    if (initializers?.workflows.length === 1 && !selectedWorkflowId) {
      setSelectedWorkflowId(initializers.workflows[0].id);
    }
  }, [initializers, selectedWorkflowId]);

  if (isLoading) {
    return <div>Loading initializers...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Choose Setup Approach</h1>
        <p className="text-muted-foreground">
          Select how you'd like to initialize your project
        </p>
      </div>

      <RadioGroup13
        value={selectedWorkflowId || ""}
        onValueChange={setSelectedWorkflowId}
      >
        {initializers?.workflows.map((workflow) => (
          <RadioGroup13.Card key={workflow.id} value={workflow.id}>
            <RadioGroup13.CardHeader>
              <Workflow className="h-5 w-5" />
              <RadioGroup13.CardTitle>{workflow.displayName}</RadioGroup13.CardTitle>
            </RadioGroup13.CardHeader>
            <RadioGroup13.CardDescription>
              {workflow.description}
            </RadioGroup13.CardDescription>
          </RadioGroup13.Card>
        ))}
      </RadioGroup13>

      {initializers?.workflows.length === 1 && (
        <p className="text-sm text-muted-foreground">
          This is currently the only setup option available
        </p>
      )}

      <Button
        onClick={() => {
          if (selectedWorkflowId) {
            setInitializer.mutate({
              projectId,
              initializerWorkflowId: selectedWorkflowId,
            });
          }
        }}
        disabled={!selectedWorkflowId || setInitializer.isPending}
        className="w-full"
      >
        {setInitializer.isPending ? "Setting up..." : "Continue"}
      </Button>
    </div>
  );
}
```

**AC Coverage:** AC6-AC16

**Tests:**
```tsx
// apps/web/src/routes/projects/$projectId/select-initializer.test.tsx
describe("SelectInitializerPage", () => {
  it("displays workflow cards correctly", () => {
    // Mock trpc query returning workflows
    // Render component
    // Assert cards are displayed with correct content
  });

  it("auto-selects card when only one option", () => {
    // Mock single workflow
    // Assert card is selected
  });

  it("enables continue button when selection made", () => {
    // Select a card
    // Assert button is enabled
  });

  it("navigates to initialize page on continue", async () => {
    // Click continue
    // Assert navigation occurred
  });
});
```

---

### Task 9: Workflow Initialize Page

**File:** `apps/web/src/routes/projects/$projectId/initialize.tsx`

**Key Integration Points:**
1. Load project and check if already initialized (status === "active" → redirect)
2. Get workflow execution for project
3. Get current step from execution
4. Render WorkflowStepperWizard from Story 1.4
5. Route step component based on step type:
   - "execute-action" → `<ExecuteActionStep>`
   - "ask-user" → `<AskUserStep>`
6. Handle step submission via `workflowExecutions.submitStep` mutation
7. Subscribe to workflow events for real-time updates

**Implementation Structure:**
```tsx
export function InitializePage() {
  const { projectId } = useParams();
  
  // Check project status
  const { data: project } = trpc.projects.get.useQuery({ id: projectId });
  
  // Get execution
  const { data: execution } = trpc.workflowExecutions.get.useQuery({
    projectId,
  });
  
  // Get current step
  const currentStep = execution?.currentStep;
  
  // Submit step mutation
  const submitStep = trpc.workflows.submitStep.useMutation({
    onSuccess: () => {
      // Refetch execution state
    },
  });
  
  // Subscribe to events
  trpc.workflows.onWorkflowEvent.useSubscription({
    executionId: execution?.id,
  });
  
  // Render stepper + step component
  return (
    <div>
      <WorkflowStepperWizard
        currentStep={currentStep?.stepNumber || 1}
        totalSteps={10}
        currentStepTitle={currentStep?.goal}
        workflowName="Initialize New Project"
      />
      
      <WizardStepContainer>
        {currentStep?.stepType === "execute-action" && (
          <ExecuteActionStep
            config={currentStep.config}
            // ... props
          />
        )}
        
        {currentStep?.stepType === "ask-user" && (
          <AskUserStep
            config={currentStep.config}
            onSubmit={(value) => {
              submitStep.mutate({
                executionId: execution.id,
                userInput: value,
              });
            }}
            // ... props
          />
        )}
      </WizardStepContainer>
    </div>
  );
}
```

**AC Coverage:** AC31-AC48

---

### Task 10: Variable Resolution Integration

This is handled automatically by the ExecuteActionStepHandler backend implementation using the variable resolver from Story 1.4. No additional frontend work needed.

**AC Coverage:** AC49-AC51

---

### Task 11: Error Handling

**Frontend Implementation:**
- Use `toast.error()` from sonner for validation errors
- Display inline errors in AskUserStep component (already implemented)
- Network error retry button (already implemented in ExecuteActionStep)
- Server validation errors passed through step submission

**AC Coverage:** AC52-AC56

---

### Task 12: Integration & Testing

**Integration Test Example:**
```tsx
// packages/api/src/routers/projects.integration.test.ts
describe("Project Creation Flow E2E", () => {
  it("completes workflow-init Steps 1-2", async () => {
    // 1. Create project
    const { project } = await caller.projects.createMinimal({
      name: "Test Project",
    });
    
    // 2. Set initializer
    const { execution } = await caller.projects.setInitializer({
      projectId: project.id,
      initializerWorkflowId: workflowId,
    });
    
    // 3. Execute Step 1 (auto-executes)
    // Verify: detected_field_type set
    
    // 4. Submit Step 2 (path selection)
    await caller.workflows.submitStep({
      executionId: execution.id,
      userInput: "/home/user/my-project",
    });
    
    // 5. Verify: project_path variable set
    // Verify: executedSteps tracks both steps
    // Verify: execution status is "paused"
  });
});
```

**Manual Testing Checklist:**
- [ ] Can create new project from home page
- [ ] Initializer selector shows workflow-init-new-guided card
- [ ] Card is auto-selected (only one option)
- [ ] Clicking Continue redirects to initialize page
- [ ] WorkflowStepper shows "Step 1 of 10"
- [ ] Step 1 auto-executes without flash
- [ ] Progress bar advances to "Step 2 of 10"
- [ ] Path selector opens native file dialog
- [ ] Manual path input works
- [ ] Path validation errors are clear
- [ ] Can complete Step 2 and workflow pauses
- [ ] Can reload page and resume from current step

**AC Coverage:** AC63-AC73

---

## File List Summary

### Backend Files Created:
- `packages/api/src/services/workflow-engine/step-handlers/execute-action-handler.ts`
- `packages/api/src/services/workflow-engine/step-handlers/execute-action-handler.test.ts`
- `packages/api/src/services/workflow-engine/step-handlers/ask-user-handler.ts`
- `packages/api/src/services/workflow-engine/step-handlers/ask-user-handler.test.ts`

### Backend Files Modified:
- `packages/db/src/schema/core.ts`
- `packages/db/src/schema/workflows.ts`
- `packages/api/src/services/workflow-engine/step-types.ts`
- `packages/scripts/src/seeds/workflow-init-new.ts`
- `packages/api/src/routers/projects.ts`
- `packages/api/src/routers/workflows.ts`

### Frontend Files Created:
- `apps/web/src/components/workflows/steps/execute-action-step.tsx`
- `apps/web/src/components/workflows/steps/execute-action-step.test.tsx`
- `apps/web/src/components/workflows/steps/ask-user-step.tsx`
- `apps/web/src/components/workflows/steps/ask-user-step.test.tsx`

### Frontend Files To Create:
- `apps/web/src/routes/projects/$projectId/select-initializer.tsx`
- `apps/web/src/routes/projects/$projectId/select-initializer.test.tsx`
- `apps/web/src/routes/projects/$projectId/initialize.tsx`
- `apps/web/src/routes/projects/$projectId/initialize.test.tsx`

### Frontend Files To Modify:
- `apps/web/src/routes/index.tsx` (add Create New Project button)

---

## Completion Criteria

Story 1.5 is complete when:
1. ✅ All 73 acceptance criteria are met (backend ACs are met)
2. ⏳ All 12 tasks and subtasks are checked
3. ⏳ All tests passing (backend: ✅, frontend: pending)
4. ⏳ Manual testing checklist completed
5. ⏳ Code review passed

## Next Steps

1. Install shadcn RadioGroup13 component
2. Create initializer selector page
3. Modify home page with Create button
4. Create initialize page with WorkflowStepper integration
5. Run integration tests
6. Complete manual testing
7. Mark story as "review" in sprint-status.yaml
