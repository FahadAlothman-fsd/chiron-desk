# Step Execution Components Specification

**Implementation Guide for Component Hierarchy**

---

## Quick Reference: What Goes Where

```
When building a new step:        → steps/<step-type>-step.tsx
When building step internals:    → step-atoms/<atom-name>.tsx
When modifying shell behavior:   → shells/<shell-name>-shell.tsx
When modifying shared regions:   → zones/<zone-name>.tsx
When adding step type support:   → step-renderer.tsx (add case)
When adding layout type:         → shell-renderer.tsx (add case)
```

---

## Component Contracts

### 1. Shell Components

Shells provide the layout frame. They receive step content as children.

#### WizardShell

```typescript
// shells/wizard-shell.tsx

export interface WizardShellProps {
  /** Workflow definition for display */
  workflow: {
    id: string;
    displayName: string;
    description?: string;
  };
  /** All steps for stepper */
  steps: Array<{
    id: string;
    stepNumber: number;
    goal: string;
    name?: string;
  }>;
  /** Current execution state */
  execution: {
    id: string;
    status: "idle" | "active" | "paused" | "completed" | "failed";
    currentStepId?: string;
    executedSteps: Record<number, ExecutedStepInfo>;
  };
  /** Step content rendered by StepRenderer */
  children: React.ReactNode;
}

export function WizardShell({
  workflow,
  steps,
  execution,
  children,
}: WizardShellProps) {
  const currentStepNumber = steps.find(
    (s) => s.id === execution.currentStepId
  )?.stepNumber ?? 1;

  return (
    <div className="flex h-full flex-col">
      {/* Horizontal Stepper */}
      <HorizontalStepper
        steps={steps}
        currentStep={currentStepNumber}
        executedSteps={execution.executedSteps}
      />

      {/* Centered Step Content */}
      <div className="flex flex-1 items-center justify-center overflow-auto p-8">
        <div className="w-full max-w-2xl">{children}</div>
      </div>
    </div>
  );
}
```

#### WorkbenchShell

```typescript
// shells/workbench-shell.tsx

export interface WorkbenchShellProps {
  workflow: {
    id: string;
    displayName: string;
    description?: string;
    outputArtifactType?: string;
  };
  steps: WorkflowStep[];
  execution: WorkflowExecution;
  projectId: string;
  /** Default panel sizes */
  defaultTimelineSize?: number; // 0-100, default 60
  defaultContextCollapsed?: boolean;
  /** Handlers */
  onExecuteWorkflow?: (workflowId: string) => void;
  onViewExecution?: (executionId: string) => void;
  children: React.ReactNode;
}

export function WorkbenchShell({
  workflow,
  steps,
  execution,
  projectId,
  defaultTimelineSize = 60,
  defaultContextCollapsed = false,
  onExecuteWorkflow,
  onViewExecution,
  children,
}: WorkbenchShellProps) {
  const [timelineMode, setTimelineMode] = useState<"focused" | "browse">("focused");
  const [contextCollapsed, setContextCollapsed] = useState(defaultContextCollapsed);
  const [focusedStep, setFocusedStep] = useState(getCurrentStepNumber(steps, execution));

  return (
    <div className="flex h-full flex-col">
      {/* Meta Bar */}
      <MetaBar
        breadcrumbs={[
          { label: "Project", href: `/projects/${projectId}` },
          { label: workflow.displayName },
          { label: `Step ${focusedStep}/${steps.length}` },
        ]}
        executionStatus={execution.status}
        onToggleMode={() => setTimelineMode((m) => (m === "focused" ? "browse" : "focused"))}
        timelineMode={timelineMode}
      />

      {/* Split Pane */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Timeline / Primary Zone */}
        <ResizablePanel defaultSize={defaultTimelineSize} minSize={30} maxSize={70}>
          <TimelineContainer
            mode={timelineMode}
            steps={steps}
            currentStep={getCurrentStepNumber(steps, execution)}
            focusedStep={focusedStep}
            executedSteps={execution.executedSteps}
            onModeChange={setTimelineMode}
            onStepFocus={setFocusedStep}
          >
            {children}
          </TimelineContainer>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Context Zone */}
        <ResizablePanel
          defaultSize={100 - defaultTimelineSize}
          minSize={contextCollapsed ? 3 : 30}
          collapsible
          collapsedSize={3}
          onCollapse={() => setContextCollapsed(true)}
          onExpand={() => setContextCollapsed(false)}
        >
          <ContextPanel
            execution={execution}
            workflow={workflow}
            collapsed={contextCollapsed}
            onToggleCollapse={() => setContextCollapsed((c) => !c)}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
```

#### DialogShell

```typescript
// shells/dialog-shell.tsx

export interface DialogShellProps {
  workflow: {
    id: string;
    displayName: string;
    description?: string;
  };
  steps: WorkflowStep[];
  execution: WorkflowExecution;
  currentStep?: WorkflowStep;
  /** Dialog control */
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function DialogShell({
  workflow,
  steps,
  execution,
  currentStep,
  open,
  onClose,
  children,
}: DialogShellProps) {
  const currentStepNumber = currentStep?.stepNumber ?? 1;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="!w-[95vw] !max-w-[95vw] flex h-[95vh] flex-col p-0"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="border-b p-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2 text-xl">
                {workflow.displayName}
                <Badge variant="outline" className="ml-2 text-xs">
                  Child Workflow
                </Badge>
              </DialogTitle>
              {workflow.description && (
                <DialogDescription className="mt-1 text-sm">
                  {workflow.description}
                </DialogDescription>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Stepper */}
          {steps.length > 1 && (
            <div className="mt-6">
              <HorizontalStepper
                steps={steps}
                currentStep={currentStepNumber}
                executedSteps={execution.executedSteps}
                compact
              />
            </div>
          )}
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">{children}</div>

        {/* Footer */}
        <div className="border-t p-4">
          <Button onClick={onClose} variant="outline" className="w-full" size="lg">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Parent Workflow
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

### 2. Zone Components

Reusable regions that appear in multiple shells.

#### MetaBar

```typescript
// zones/meta-bar.tsx

export interface MetaBarProps {
  breadcrumbs: Array<{
    label: string;
    href?: string;
  }>;
  executionStatus: "idle" | "active" | "paused" | "completed" | "failed";
  timelineMode?: "focused" | "browse";
  onToggleMode?: () => void;
  actions?: Array<{
    icon: LucideIcon;
    label: string;
    onClick: () => void;
  }>;
}

export function MetaBar({
  breadcrumbs,
  executionStatus,
  timelineMode,
  onToggleMode,
  actions,
}: MetaBarProps) {
  return (
    <div className="flex h-12 items-center justify-between border-b bg-card px-4">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, i) => (
            <Fragment key={i}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {crumb.href ? (
                  <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Status Badge */}
        <StatusBadge status={executionStatus} />

        {/* Mode Toggle (Workbench only) */}
        {onToggleMode && (
          <Button variant="ghost" size="sm" onClick={onToggleMode}>
            {timelineMode === "focused" ? (
              <>
                <List className="mr-2 h-4 w-4" />
                Browse History
              </>
            ) : (
              <>
                <Focus className="mr-2 h-4 w-4" />
                Focused Mode
              </>
            )}
          </Button>
        )}

        {/* Custom Actions */}
        {actions?.map((action, i) => (
          <Button key={i} variant="ghost" size="icon" onClick={action.onClick}>
            <action.icon className="h-4 w-4" />
          </Button>
        ))}
      </div>
    </div>
  );
}
```

#### StepHeader

```typescript
// zones/step-header.tsx

export interface StepHeaderProps {
  stepNumber: number;
  goal: string;
  stepType: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  estimatedDuration?: string;
  className?: string;
}

export function StepHeader({
  stepNumber,
  goal,
  stepType,
  status,
  estimatedDuration,
  className,
}: StepHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between border-b pb-4", className)}>
      <div className="flex items-start gap-4">
        {/* Step Number */}
        <span className="font-bold text-2xl text-muted-foreground">
          {String(stepNumber).padStart(2, "0")}
        </span>

        <div>
          {/* Goal */}
          <h2 className="font-semibold text-lg">{goal}</h2>

          {/* Type + Duration */}
          <div className="mt-1 flex items-center gap-2 text-muted-foreground text-xs">
            <Badge variant="secondary" className="text-[10px] uppercase">
              {stepType.replace("-", " ")}
            </Badge>
            {estimatedDuration && <span>~{estimatedDuration}</span>}
          </div>
        </div>
      </div>

      {/* Status */}
      <StatusIndicator status={status} />
    </div>
  );
}
```

#### TimelineContainer

```typescript
// zones/timeline-container.tsx

export interface TimelineContainerProps {
  mode: "focused" | "browse";
  steps: WorkflowStep[];
  currentStep: number;
  focusedStep: number;
  executedSteps: Record<number, ExecutedStepInfo>;
  onModeChange: (mode: "focused" | "browse") => void;
  onStepFocus: (stepNumber: number) => void;
  children: React.ReactNode; // Step content
}

export function TimelineContainer({
  mode,
  steps,
  currentStep,
  focusedStep,
  executedSteps,
  onModeChange,
  onStepFocus,
  children,
}: TimelineContainerProps) {
  if (mode === "browse") {
    return (
      <TimelineBrowseView
        steps={steps}
        executedSteps={executedSteps}
        currentStep={currentStep}
        focusedStep={focusedStep}
        onStepClick={(n) => {
          onStepFocus(n);
          onModeChange("focused");
        }}
        onReturnToFocused={() => onModeChange("focused")}
      />
    );
  }

  // Focused mode
  const focusedStepData = steps.find((s) => s.stepNumber === focusedStep);

  return (
    <div className="flex h-full flex-col">
      {/* Focused Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <span className="font-medium text-sm">
            Step {focusedStep} of {steps.length}
          </span>
          {focusedStepData && (
            <p className="text-muted-foreground text-xs">{focusedStepData.goal}</p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => onModeChange("browse")}>
          <List className="mr-2 h-4 w-4" />
          Browse All
        </Button>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-auto p-4">{children}</div>
    </div>
  );
}
```

#### ContextPanel

```typescript
// zones/context-panel.tsx

export interface ContextPanelProps {
  execution: WorkflowExecution;
  workflow: {
    id: string;
    displayName: string;
    outputArtifactType?: string;
  };
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function ContextPanel({
  execution,
  workflow,
  collapsed,
  onToggleCollapse,
}: ContextPanelProps) {
  const [activeTab, setActiveTab] = useState<"artifact" | "variables" | "logs">("artifact");

  if (collapsed) {
    return (
      <div className="flex h-full w-12 flex-col items-center border-l bg-card py-4">
        <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="mt-4 flex flex-col gap-2">
          {["artifact", "variables", "logs"].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "secondary" : "ghost"}
              size="icon"
              onClick={() => {
                setActiveTab(tab as typeof activeTab);
                onToggleCollapse();
              }}
            >
              {tab === "artifact" && <FileText className="h-4 w-4" />}
              {tab === "variables" && <Braces className="h-4 w-4" />}
              {tab === "logs" && <ScrollText className="h-4 w-4" />}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col border-l bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList>
            <TabsTrigger value="artifact">Artifact</TabsTrigger>
            <TabsTrigger value="variables">Variables</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === "artifact" && (
          <ArtifactPreview execution={execution} workflow={workflow} />
        )}
        {activeTab === "variables" && (
          <VariableInspector variables={execution.variables} />
        )}
        {activeTab === "logs" && <LogViewer executionId={execution.id} />}
      </div>
    </div>
  );
}
```

---

### 3. Step Atom Components

Small, reusable components used within steps.

#### ApprovalCard

```typescript
// step-atoms/approval-card.tsx

export interface ApprovalCardProps {
  executionId: string;
  agentId: string;
  toolName: string;
  generatedValue: Record<string, unknown>;
  reasoning?: string;
  isApproved: boolean;
  isRejected: boolean;
  createdAt?: string;
  onApprove?: () => void;
  onReject?: (feedback: string) => void;
  onEdit?: (value: Record<string, unknown>) => void;
}

export function ApprovalCard({
  executionId,
  agentId,
  toolName,
  generatedValue,
  reasoning,
  isApproved,
  isRejected,
  createdAt,
}: ApprovalCardProps) {
  const approveMutation = trpc.agents.approveToolResult.useMutation();
  const rejectMutation = trpc.agents.rejectToolResult.useMutation();

  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleApprove = async () => {
    await approveMutation.mutateAsync({
      executionId,
      toolName,
      selectedValue: generatedValue,
    });
  };

  const handleReject = async () => {
    await rejectMutation.mutateAsync({
      executionId,
      agentId,
      toolName,
      feedback,
    });
    setShowFeedback(false);
    setFeedback("");
  };

  const status = isApproved ? "approved" : isRejected ? "rejected" : "pending";

  return (
    <Card className={cn(
      "transition-colors",
      status === "approved" && "border-green-500/50 bg-green-500/5",
      status === "rejected" && "border-red-500/50 bg-red-500/5",
    )}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-4 w-4" />
            {formatToolName(toolName)}
          </CardTitle>
          <StatusBadge status={status} />
        </div>
      </CardHeader>

      <CardContent>
        {/* Value Preview */}
        <div className="rounded border bg-muted/50 p-3 font-mono text-sm">
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(generatedValue, null, 2)}
          </pre>
        </div>

        {/* Reasoning */}
        {reasoning && (
          <div className="mt-3 text-muted-foreground text-sm">
            <span className="font-medium">Agent reasoning:</span> {reasoning}
          </div>
        )}
      </CardContent>

      {/* Actions (only for pending) */}
      {status === "pending" && (
        <CardFooter className="flex gap-2">
          <Button onClick={handleApprove} disabled={approveMutation.isPending}>
            <Check className="mr-2 h-4 w-4" />
            Approve
          </Button>
          <Button variant="outline" onClick={() => setShowFeedback(true)}>
            <X className="mr-2 h-4 w-4" />
            Reject
          </Button>
          <Button variant="ghost">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </CardFooter>
      )}

      {/* Feedback Input */}
      {showFeedback && (
        <CardFooter className="flex-col gap-2">
          <Textarea
            placeholder="Explain why you're rejecting this..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <div className="flex w-full gap-2">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!feedback.trim() || rejectMutation.isPending}
            >
              Submit Rejection
            </Button>
            <Button variant="ghost" onClick={() => setShowFeedback(false)}>
              Cancel
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
```

#### ToolStatusItem

```typescript
// step-atoms/tool-status-item.tsx

export type ToolStatus =
  | "not_started"
  | "executing"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "blocked";

export interface ToolStatusItemProps {
  name: string;
  description?: string;
  status: ToolStatus;
  approvedValue?: unknown;
  blockedReason?: string;
  onClick?: () => void;
}

export function ToolStatusItem({
  name,
  description,
  status,
  approvedValue,
  blockedReason,
  onClick,
}: ToolStatusItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "w-full rounded border p-3 text-left transition-colors",
        onClick && "hover:bg-muted/50",
        status === "approved" && "border-green-500/30",
        status === "rejected" && "border-red-500/30",
        status === "awaiting_approval" && "border-amber-500/30",
        status === "blocked" && "border-orange-500/30 opacity-60",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{formatToolName(name)}</span>
        <ToolStatusIcon status={status} />
      </div>

      {description && (
        <p className="mt-1 text-muted-foreground text-xs">{description}</p>
      )}

      {status === "approved" && approvedValue && (
        <div className="mt-2 truncate rounded bg-green-500/10 px-2 py-1 font-mono text-green-500 text-xs">
          {typeof approvedValue === "string"
            ? approvedValue
            : JSON.stringify(approvedValue)}
        </div>
      )}

      {status === "blocked" && blockedReason && (
        <div className="mt-2 text-orange-500 text-xs">
          Blocked: {blockedReason}
        </div>
      )}
    </button>
  );
}

function ToolStatusIcon({ status }: { status: ToolStatus }) {
  switch (status) {
    case "not_started":
      return <Circle className="h-4 w-4 text-muted-foreground" />;
    case "executing":
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case "awaiting_approval":
      return <Clock className="h-4 w-4 text-amber-500" />;
    case "approved":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "rejected":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "blocked":
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
  }
}
```

#### StreamOutput

```typescript
// step-atoms/stream-output.tsx

export interface StreamOutputProps {
  content: string;
  isStreaming: boolean;
  className?: string;
}

export function StreamOutput({ content, isStreaming, className }: StreamOutputProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom during streaming
  useEffect(() => {
    if (isStreaming && endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [content, isStreaming]);

  return (
    <div className={cn("rounded border bg-muted/30 p-4 font-mono text-sm", className)}>
      <div className="whitespace-pre-wrap">{content}</div>
      {isStreaming && (
        <span className="inline-block h-4 w-2 animate-pulse bg-primary" />
      )}
      <div ref={endRef} />
    </div>
  );
}
```

#### VariableInspector

```typescript
// step-atoms/variable-inspector.tsx

export interface VariableInspectorProps {
  variables: Record<string, unknown>;
  className?: string;
}

export function VariableInspector({ variables, className }: VariableInspectorProps) {
  // Filter out internal variables (starting with _)
  const publicVariables = Object.entries(variables).filter(
    ([key]) => !key.startsWith("_")
  );

  if (publicVariables.length === 0) {
    return (
      <div className={cn("text-center text-muted-foreground text-sm", className)}>
        No variables set yet
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {publicVariables.map(([key, value]) => (
        <div key={key} className="rounded border p-2">
          <div className="font-medium text-xs text-muted-foreground">{key}</div>
          <div className="mt-1 font-mono text-sm">
            {typeof value === "string" ? (
              value
            ) : (
              <pre className="whitespace-pre-wrap text-xs">
                {JSON.stringify(value, null, 2)}
              </pre>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

### 4. Renderer Components

Orchestration layer mapping types to components.

#### ShellRenderer

```typescript
// shell-renderer.tsx

export interface ShellRendererProps {
  layoutType: "wizard" | "artifact-workbench" | "dialog";
  workflow: Workflow;
  execution: WorkflowExecution;
  steps: WorkflowStep[];
  projectId?: string;
  /** Dialog-specific */
  dialogProps?: {
    open: boolean;
    onClose: () => void;
  };
  /** Handlers */
  onExecuteWorkflow?: (workflowId: string) => void;
  onViewExecution?: (executionId: string) => void;
  children: React.ReactNode;
}

export function ShellRenderer({
  layoutType,
  workflow,
  execution,
  steps,
  projectId,
  dialogProps,
  onExecuteWorkflow,
  onViewExecution,
  children,
}: ShellRendererProps) {
  switch (layoutType) {
    case "wizard":
      return (
        <WizardShell workflow={workflow} steps={steps} execution={execution}>
          {children}
        </WizardShell>
      );

    case "artifact-workbench":
      return (
        <WorkbenchShell
          workflow={workflow}
          steps={steps}
          execution={execution}
          projectId={projectId!}
          onExecuteWorkflow={onExecuteWorkflow}
          onViewExecution={onViewExecution}
        >
          {children}
        </WorkbenchShell>
      );

    case "dialog":
      if (!dialogProps) {
        console.warn("[ShellRenderer] Dialog layout requires dialogProps");
        return <>{children}</>;
      }
      return (
        <DialogShell
          workflow={workflow}
          steps={steps}
          execution={execution}
          open={dialogProps.open}
          onClose={dialogProps.onClose}
        >
          {children}
        </DialogShell>
      );

    default:
      console.warn(`[ShellRenderer] Unknown layout type: ${layoutType}`);
      return <>{children}</>;
  }
}
```

#### StepRenderer (Updated)

```typescript
// step-renderer.tsx

export interface StepRendererProps {
  step: WorkflowStep;
  execution: WorkflowExecution;
  projectId: string;
  onExecuteWorkflow?: (workflowId: string) => void;
  onViewExecution?: (executionId: string) => void;
}

export function StepRenderer({
  step,
  execution,
  projectId,
  onExecuteWorkflow,
  onViewExecution,
}: StepRendererProps) {
  const commonProps = {
    stepConfig: step.config,
    executionId: execution.id,
    stepId: step.id,
    stepNumber: step.stepNumber,
    stepGoal: step.goal,
    projectId,
  };

  switch (step.stepType) {
    case "agent":
      return (
        <AgentStep
          {...commonProps}
          agentKind={step.config?.agentKind}
          isStepComplete={isStepComplete(step, execution)}
        />
      );

    case "form":
      return <FormStep {...commonProps} />;

    case "action":
      return <ActionStep {...commonProps} />;

    case "display":
      return <DisplayStep stepConfig={step.config} variables={execution.variables} />;

    case "invoke":
      return (
        <InvokeStep
          config={step.config}
          variables={execution.variables}
          onExecuteWorkflow={onExecuteWorkflow}
          onViewExecution={onViewExecution}
        />
      );

    case "branch":
      return <BranchStep {...commonProps} />;

    default:
      return (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p className="font-medium text-lg">
              Step type "{step.stepType}" not implemented
            </p>
            <p className="mt-2 text-sm">
              Create a handler in steps/{step.stepType}-step.tsx
            </p>
          </div>
        </div>
      );
  }
}
```

---

## File Structure Summary

```
apps/web/src/components/workflows/
├── shells/
│   ├── wizard-shell.tsx
│   ├── workbench-shell.tsx
│   ├── dialog-shell.tsx
│   └── index.ts
│
├── zones/
│   ├── meta-bar.tsx
│   ├── step-header.tsx
│   ├── timeline-container.tsx
│   ├── timeline-browse-view.tsx
│   ├── timeline-focused-view.tsx
│   ├── context-panel.tsx
│   ├── horizontal-stepper.tsx
│   └── index.ts
│
├── steps/
│   ├── agent-step.tsx              # Agent step (agentKind: chiron/opencode)
│   ├── form-step.tsx               # Form input step
│   ├── action-step.tsx             # Action execution step
│   ├── display-step.tsx            # Display output step
│   ├── invoke-step.tsx             # Invoke child workflow step
│   ├── branch-step.tsx             # Branching step
│   └── index.ts
│
├── step-atoms/
│   ├── approval-card.tsx           # Extract from agent step
│   ├── approval-selector.tsx       # Extract from agent step
│   ├── tool-status-item.tsx        # Extract from tool-status-sidebar
│   ├── stream-output.tsx           # New
│   ├── variable-inspector.tsx      # New
│   ├── log-viewer.tsx              # New
│   ├── status-badge.tsx            # New
│   ├── status-indicator.tsx        # New
│   └── index.ts
│
├── step-renderer.tsx               # Existing - update
├── shell-renderer.tsx              # New
├── workflow-layout-renderer.tsx    # Existing - orchestrator
└── types.ts                        # Shared types
```

---

## Migration Path

### Phase 1: Extract Atoms
1. Extract `ApprovalCard` from `agent-step.tsx`
2. Extract `ToolStatusItem` from `tool-status-sidebar.tsx`
3. Create `StatusBadge` and `StatusIndicator` utilities

### Phase 2: Create Zones
1. Create `MetaBar` from scratch
2. Create `StepHeader` from scratch
3. Refactor `Timeline` → `TimelineContainer` + views
4. Create `ContextPanel` from `ArtifactWorkbenchLayout` extraction

### Phase 3: Create Shells
1. Create `WizardShell` (refactor existing `WizardLayout`)
2. Create `WorkbenchShell` (refactor existing `ArtifactWorkbenchLayout`)
3. Update `DialogLayout` → `DialogShell`

### Phase 4: Wire Up Renderers
1. Create `ShellRenderer` orchestrator
2. Update `WorkflowLayoutRenderer` to use new shells
3. Update `StepRenderer` with new atoms

---

This component specification provides the contracts and structure needed for implementation.
