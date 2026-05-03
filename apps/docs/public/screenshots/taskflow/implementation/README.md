# Taskflow Implementation Screenshots

Place the screenshots for `apps/docs/src/content/docs/taskflow/implementation.md` in this folder.

Use these exact filenames:

1. `01-implementation-planning-agent.png`
2. `02-implementation-execution-agent.png`
3. `03-implementation-validation-agent.png`
4. `04-propagate-implementation-outputs.png`
5. `05-implementation-plan-artifact.png`
6. `06-implemented-code-changes-artifact.png`
7. `07-implementation-test-report-artifact.png`

## What each screenshot should capture

### 01 — Implementation Planning Agent
- `Implementation` work unit detail page open
- active workflow is `Implementation`
- active step is **Implementation Planning Agent**
- show planning outputs if possible, especially likely file changes or scope

### 02 — Implementation Execution Agent
- active step is **Implementation Execution Agent**
- show execution state or code-change summary if visible

### 03 — Implementation Validation Agent
- active step is **Implementation Validation Agent**
- show validation results or test-related output if visible

### 04 — Propagate Implementation Outputs
- active step is **Propagate Implementation Outputs**
- show execution results becoming durable outputs and artifacts

### 05 — Implementation Plan artifact
- show the `IMPLEMENTATION_PLAN` artifact in the runtime UI

### 06 — Implemented Code Changes artifact
- show the `IMPLEMENTED_CODE_CHANGES` artifact in the runtime UI

### 07 — Implementation Test Report artifact
- show the `IMPLEMENTATION_TEST_REPORT` artifact in the runtime UI

## UI improvements worth making before capture

- The step detail should clearly separate planning, execution, and validation outputs.
- The artifact panel should make the three implementation artifacts easy to compare and capture.
