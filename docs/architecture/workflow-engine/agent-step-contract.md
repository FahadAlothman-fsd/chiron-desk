# Agent Step Contract

Defines the configuration and runtime expectations for agent-driven workflow steps. Agent steps run either Chiron's AI-SDK runtime or OpenCode, using a shared contract and consistent tool/approval handling.

## Contract Goals

- Single schema for both `chiron` and `opencode` agent kinds.
- Step config is the single source of truth for tools, completion, and output mapping.
- System prompt is a merge of agent identity instructions and step-specific context.
- Variable resolution is handled by VariableService (Handlebars).

## Core Types

### AgentStepConfig

```ts
type AgentStepConfig = {
  type?: "agent"
  agentKind: "chiron" | "opencode"
  agentId: string
  model?: { provider: "openrouter" | "opencode" | "anthropic" | "openai"; modelId: string }

  message?: string
  initialPrompt?: string

  systemPromptBlock?: string

  tools?: AgentToolConfig[]
  editableVariables?: EditableVariable[]

  completionConditions?: CompletionCondition[]
}
```

### AgentToolConfig

```ts
type AgentToolConfig = {
  name: string
  toolType: "ax-generation" | "database-query" | "custom" | "update-variable"
  description?: string
  usageGuidance?: string
  required?: boolean
  requiredVariables?: string[]
  requiresApproval?: boolean
  requireFeedbackOnOverride?: boolean

  targetVariable?: string
  valueSchema?: Record<string, unknown>

  optionsSource?: {
    table: string
    selectFields?: string[]
    distinctField?: string
    filterBy?: Record<string, string>
    orderBy?: string
    outputVariable: string
    requireFeedbackOnOverride?: boolean
    displayConfig?: {
      cardLayout: "simple" | "detailed"
      fields: {
        value: string
        title: string
        subtitle?: string
        description?: string
        sections?: Array<{
          label: string
          dataPath: string
          renderAs: string
          collapsible?: boolean
          defaultExpanded?: boolean
          itemFields?: Record<string, string>
          childFields?: Record<string, string>
        }>
      }
    }
  }

  axSignature?: {
    input: Array<{
      name: string
      type: string
      source: "variable" | "context" | "playbook"
      variableName?: string
      selectFields?: string[]
      description?: string
    }>
    output: Array<{
      name: string
      type: string
      classesFrom?: { source: string; field: string }
      extractFrom?: { source: string; matchField: string; matchValue: string; selectField: string }
      description?: string
      internal?: boolean
    }>
    strategy?: string
  }
}
```

### EditableVariable

```ts
type EditableVariable = {
  key: string
  label?: string
  description?: string
  placeholder?: string
}
```

### CompletionCondition

```ts
type CompletionCondition =
  | { type: "all-tools-approved"; requiredTools: string[] }
  | { type: "agent-done" }
  | { type: "all-variables-set"; requiredVariables: string[] }
  | { type: "manual" }
```

## Runtime Semantics

### Prompt Composition

1. Base system prompt is read from the agent identity (`agents.instructions`).
2. Step-specific context is injected via `systemPromptBlock`.
3. VariableService resolves `{{...}}` in system and initial prompt fields.
4. The final system prompt is inserted into the first message list and persisted to the session.

### Initial Message

- `message` is a UI banner only (never sent to the agent).
- `initialPrompt` is the first prompt sent to the agent if provided.
- `initialPrompt` supports `{{parent.variable}}` resolution.

### Tools and Approvals

- Tools are declared on the step config and surfaced to the agent runtime.
- `required` tools participate in completion conditions; optional tools do not block completion.
- `requiresApproval` gates execution via approval service.

### Completion

- Completion conditions are evaluated as an array; any condition satisfied completes the step.
- `all-tools-approved` waits for approvals for each tool in `requiredTools`.
- `agent-done` ends when the agent signals completion.
- `all-variables-set` completes when all required output variables are present.
- `manual` completes only when the user explicitly finishes the step.

### Output Variables

- Variables are written by tool execution and approvals; no separate output mapping is required.

## Example (Workflow Init Step 1)

```ts
const step1Config: AgentStepConfig = {
  agentKind: "chiron",
  agentId: pmAgent.id,
  message: "Project setup",
  message: "Project setup",
  initialPrompt:
    "Let's set up your new project! Ask what they're building and use tools to save description, complexity, workflow path, and project name.",
  tools: [
    {
      name: "update_description",
      toolType: "update-variable",
      targetVariable: "project_description",
      description: "Set the project description based on your analysis of the conversation",
      usageGuidance: "Call when you have enough detail about the problem, users, and key features.",
      required: true,
      requiresApproval: true,
      valueSchema: {
        type: "string",
        description: "A clear, comprehensive project description",
      },
    },
    {
      name: "update_complexity",
      toolType: "ax-generation",
      description: "Classify the project's complexity level",
      usageGuidance: "Run after project_description is approved. Select from complexity options.",
      required: true,
      requiresApproval: true,
      requiredVariables: ["project_description"],
      optionsSource: {
        table: "workflow_paths",
        distinctField: "tags->'complexity'",
        filterBy: {
          "tags->'fieldType'->>'value'": "greenfield",
        },
        orderBy: "sequence_order",
        outputVariable: "complexity_options",
      },
    },
  ],
  completionConditions: [
    {
      type: "all-tools-approved",
      requiredTools: ["update_description", "update_complexity"],
    },
  ],
}
```

## Notes

- Use `systemPromptBlock` for step-scoped instructions (keeps agent identity stable).
- For OpenCode, the handler still injects the system prompt into the message list; the adapter forwards it to OpenCode.
- Templates should be resolved through VariableService only.
- The `opencode` agent kind may add specific config keys in the future (to be decided).
- For cross-step conversation continuity (agent -> invoke -> agent), see `agent-continuation-contract.md`.
