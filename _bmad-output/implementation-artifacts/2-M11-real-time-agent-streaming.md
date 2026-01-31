# Story 2-M11: Real-Time Agent Streaming

Status: ready-for-dev

## Story

As a workflow user,
I want sandboxed-agent chat to stream responses and approvals in real time,
so that I see immediate progress and can approve tool calls without polling delays.

## Acceptance Criteria

1. Text chunks stream from the backend in real time (no 2-second polling delay).
2. Tool call and tool result events stream to the UI as they happen.
3. Approval requests pause chat input and resume after approval, matching approval-gate UX.
4. Frontend consumes a streaming subscription via custom hook (no AI SDK UI `useChat`).
5. Streaming preserves chunk order and reconstructs the final assistant message.
6. Errors and end-of-stream events are surfaced to the UI with clear status.
7. Optional fallback to polling remains possible if streaming cannot connect.
8. Workflow LLM calls use the active user’s `app_config` API key before environment fallback.

## Tasks / Subtasks

- [ ] **Task 1: Backend Streaming Subscription (AC: 1, 2, 5, 6)**
  - [ ] 1.1 Add/extend a tRPC subscription in `packages/api/src/routers/workflows.ts` to stream events by executionId/stepId.
  - [ ] 1.2 Expose Effect `WorkflowEventBus` stream as AsyncIterable (TextChunk, ToolCall, ToolResult, ApprovalRequested, StepCompleted, StreamError).
  - [ ] 1.3 Filter events to sandboxed-agent step scope and emit ordered chunks.
  - [ ] 1.4 Ensure stream ends on step completion or workflow completion.
  - [ ] 1.5 Define the subscription input/output contract and auth scope (session user must own execution).

- [ ] **Task 2: Sandboxed Agent Event Emission (AC: 1, 2, 3, 5)**
  - [ ] 2.1 Confirm `sandboxed-agent-handler.ts` publishes `TextChunk`, `ToolCallCompleted`, `ApprovalRequested`.
  - [ ] 2.2 Add missing event tags if needed (ToolResult/Done).
  - [ ] 2.3 Include executionId/stepId context in event payloads for filtering.

- [ ] **Task 3: Frontend Streaming Hook (AC: 1, 2, 4, 5, 6)**
  - [ ] 3.1 Replace polling in `apps/web/src/components/workflows/steps/sandboxed-agent-step.tsx`.
  - [ ] 3.2 Implement `useAgentStream` hook (tRPC subscription + reducer for chunks, tool calls, approvals).
  - [ ] 3.3 Aggregate chunks into streaming message while preserving final assistant message.
  - [ ] 3.4 Update UI state transitions (idle → streaming → awaiting approval → complete).

- [ ] **Task 4: Approval Integration (AC: 3)**
  - [ ] 4.1 When `ApprovalRequested` arrives, disable chat input and show approval modal.
  - [ ] 4.2 Send approval response via existing mutation and resume streaming.
  - [ ] 4.3 Maintain progress indicator (approved/remaining) per UX wireframes.

- [ ] **Task 5: User Config Resolution (AC: 8)**
  - [ ] 5.1 Introduce a Request/Session context (userId + appConfig) available to Effect services.
  - [ ] 5.2 Update ConfigService to resolve API keys from app_config first, then env fallback.
  - [ ] 5.3 Ensure workflow execution passes userId into Effect layers consistently.

- [ ] **Task 6: Testing (AC: 1-8)**
  - [ ] 6.1 Unit test the stream reducer/hook behavior.
  - [ ] 6.2 Integration test subscription end-to-end (mock event bus stream).
  - [ ] 6.3 Verify fallback polling path still functions if subscription fails.
  - [ ] 6.4 Verify OpenRouter key resolution uses app_config when set.

## Dev Notes

### Developer Context
- The current chat UI polls every 2 seconds in `apps/web/src/components/workflows/steps/sandboxed-agent-step.tsx`.
- The backend already emits `TextChunk` events and uses `WorkflowEventBus` (Effect PubSub) in `packages/api/src/services/workflow-engine/step-handlers/sandboxed-agent-handler.ts`.
- There is an existing tRPC subscription pattern in `workflows.onWorkflowEvent` (or `streamExecution`) to reuse.
- The tech spec defines a StepStream event model and Effect Stream → tRPC subscription pattern.
- Use Effect-first streaming with a dedicated streaming hook (no AI SDK UI `useChat`).

### Technical Requirements
- Prefer Effect Stream + WorkflowEventBus as the source of truth (avoid UI-only streaming).
- Do not reintroduce polling when the stream is active.
- Ensure streaming includes approval events and tool call events, not just text.
- Preserve ordering and message reconstruction across chunked streaming.
- Keep streaming compatible with existing approval-gate flow (input disabled, modal shown, feedback captured).
- Subscription contract:
  - Input: `{ executionId, stepId }` (stepId required for sandboxed-agent scoping).
  - Output: union of `TextChunk`, `ToolCall`, `ToolResult`, `ApprovalRequested`, `StepCompleted`, `StreamError`.
  - Ordering: chunks must be emitted in the order received from Effect Stream.
  - Completion: stream ends on `StepCompleted` or explicit `StreamError`.
- Security: subscription must scope to `ctx.session.user.id` and deny non-owner executionIds.

### Architecture Compliance
- Real-time updates are SSE/tRPC subscription based (Architecture Decision #3).
- Use Effect services and EventBus publish/subscribe patterns (tech spec section 7).
- Avoid new frameworks; follow existing Effect + tRPC stack.

### Library / Framework Requirements
- **Effect:** Event bus + Stream usage must remain in Effect domain.
- **AI SDK:** `streamText` already in handler; do not depend on AI SDK UI if it conflicts with Effect stream architecture.
- **tRPC:** Use subscription API; follow existing `workflows` router patterns.
- **Frontend:** React Query + Zustand for state, with hook-based streaming reducer.

### File Structure Requirements
- Backend subscription: `packages/api/src/routers/workflows.ts`.
- Event bus: `packages/api/src/services/workflow-engine/effect/event-bus.ts`.
- Handler: `packages/api/src/services/workflow-engine/step-handlers/sandboxed-agent-handler.ts`.
- Frontend step: `apps/web/src/components/workflows/steps/sandboxed-agent-step.tsx`.
- New hook (if created): `apps/web/src/hooks/use-agent-stream.ts`.

### Testing Requirements
- Add unit tests for stream reducer/hook logic.
- Add integration test or manual verification with a seeded workflow execution.
- Ensure approval modal accessibility (keyboard navigation, ARIA labels) per wireframe spec.

### Project Structure Notes
- Keep step renderer layout-agnostic; do not couple to layout routing system.
- Maintain Bloomberg-terminal aesthetic and chat patterns from UX spec.

### Prior Story Learnings
- Reuse the Effect executor wiring patterns from `2-M9-effect-executor-wiring` for effect layers and event bus streaming.
- Use the same workflow execution seed data patterns validated in `2-M10-seed-verification` for integration testing.

### Database Considerations
- No schema changes required; streaming consumes existing execution/event data.
- If persisting chat transcripts, reuse existing message storage (do not introduce new tables).

### Performance & Reliability
- Add a subscription timeout and close stream when idle or on workflow completion.
- Keep chunk payloads small (emit as received; avoid buffering large chunks).
- Avoid fan-out leaks: unsubscribe when the step completes or the UI unmounts.

### Regression Guardrails
- Only replace polling within `sandboxed-agent-step.tsx`; other workflow steps remain unchanged.
- If streaming fails, fall back to existing polling without breaking approval flow.

### Verification Steps
- Stream text live while the agent runs (no 2-second delay).
- Trigger a tool call approval and confirm the modal pauses input and resumes streaming.
- Confirm executionId scoping: a user cannot subscribe to another user’s execution.
- Validate that app_config OpenRouter key overrides env on an active session.

### Git History Notes
- Recent streaming-related changes should reference `packages/api/src/routers/workflows.ts` subscription patterns and `sandboxed-agent-handler.ts` event emission updates; follow existing change patterns in these files.

### Version / Compatibility Notes
- Effect, tRPC, and AI SDK versions are pinned in the repo; confirm any API signatures before refactors.
- AI SDK UI `useChat` requires Fetch/SSE transport and is not compatible with Effect Stream directly; use the custom hook approach.

### References
- `_bmad-output/planning-artifacts/tech-spec-effect-workflow-engine.md` (Streaming Architecture, Section 7)
- `_bmad-output/planning-artifacts/architecture/architecture-decisions.md` (Decision #3: Real-Time Updates)
- `_bmad-output/planning-artifacts/design/ux-design-specification.md` (Chat patterns + accessibility)
- `_bmad-output/planning-artifacts/design/wireframe-approval-gate-chat.md` (Approval modal flow)
- `_bmad-output/planning-artifacts/epics/epic-2-artifact-workbench.md` (Story 2-M11 context)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4 (claude-sonnet-4-20250514)

### Debug Log References

N/A

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- `packages/api/src/routers/workflows.ts`
- `packages/api/src/services/workflow-engine/step-handlers/sandboxed-agent-handler.ts`
- `packages/api/src/services/workflow-engine/effect/event-bus.ts`
- `apps/web/src/components/workflows/steps/sandboxed-agent-step.tsx`
- `apps/web/src/hooks/use-agent-stream.ts`
