# Workflow Engine Kickoff Checklist

## Context to Review
- packages/agent-runtime/AGENTS.md
- docs/architecture/chiron-module-structure.md
- _bmad-output/planning-artifacts/architecture/chiron-module-structure.md

## Locked Decisions
- Step types: form, agent, action, invoke, display, branch
- agentKind: chiron, opencode
- OpenCode tools generated on session start into .opencode/chiron-tools.ts
- Provider-registry: per-user (global across projects)

## Documentation Acceptance Criteria (Step Type Behavior)

form
- Collect structured fields
- Outputs: variables only
- No tools, no git, no artifacts by default

agent
- Stream reasoning + tool calls
- Outputs: planning artifacts
- Allowed: tools + variable updates
- No direct git execution

action
- Executes concrete actions from collected variables
- Allowed: git, project, artifact, workflow, variable
- No ax-generation (tool type only)

invoke
- Spawns child workflow
- Displays child status + results

display
- Read-only output render
- No actions

branch
- Evaluates variables
- Routes to next step
- No tools or actions

## Module Contract Acceptance Criteria

- workflow-engine executes each step end-to-end
- EventBus emits state transitions
- VariableService merges propagate to later steps
- Tooling-engine executes an action step
- Agent-runtime streams planning output

## Effect Utilization Checklist

- Use Effect Workflows for long-running step execution
- Use Effect.all and withConcurrency for parallel tasks
- Use Stream for agent/tool events
- Use Sink for batching event persistence
- Enforce Layer/Tag boundaries (no direct module imports)
