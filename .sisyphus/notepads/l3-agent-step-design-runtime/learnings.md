## 2026-04-10 — agent-step runtime UI exploration

- `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx` is the main runtime agent-step detail surface. It owns timeline state (`timelineItems`), SSE reconciliation (`useSSE` + `upsertTimelineItem`), display shaping (`buildTimelineDisplayEntries`), and the actual render loop for both messages and tool calls.
- Tool calls are rendered inline in the timeline list in that route, not in a separate message renderer. The route maps `TimelineDisplayEntry[]` and branches between `entryType === "message"` and tool-call UI.
- `apps/web/src/components/elements/ai-tool-call.tsx` is the reusable tool-call primitive. It provides the collapsible shell (`AiToolCall`, `AiToolCallHeader`, `AiToolCallContent`, `AiToolCallInput`, `AiToolCallOutput`, `AiToolCallError`).
- Current message rendering is minimal and local to the route: each message timeline item renders as an `<article>` with `ExecutionBadge` metadata and a `<pre>` for `entry.item.content`.
- There is no existing thinking/reasoning component in `apps/web/src`. A reasoning block would need to be added as a new timeline entry type or inserted into the existing timeline render branch in `projects.$projectId.step-executions.$stepExecutionId.tsx`.
- Tool input/output payloads arrive as strings in contracts (`packages/contracts/src/agent-step/runtime.ts`) and are parsed in the route with `parseToolPayload()`. Non-JSON payloads fall back to `{ value }`.
- Initial timeline data comes from `detail.body.timelinePreview`, which is populated by `packages/workflow-engine/src/services/runtime/agent-step-execution-detail-service.ts` via `AgentStepTimelineService.getTimelinePage()`.
- Live streaming updates come from `AgentStepSseEnvelope` (`packages/contracts/src/sse/envelope.ts`) and are merged into local route state. `tool_activity` events are handled in the same effect branch as `timeline` events.
- OpenCode tool activity is normalized in `packages/agent-runtime/src/opencode-harness-service.ts` (`buildToolItems`). This is where raw tool parts become `tool_activity` timeline items with `input`, `output`, `error`, and `summary`.

## 2026-04-10 — thinking + tool-call runtime fixes

- Added `itemType: "thinking"` to `AgentStepTimelineItem` in `packages/contracts/src/agent-step/runtime.ts`. Timeline/SSE consumers can now transport assistant reasoning blocks as first-class timeline entries instead of hiding them inside message text.
- `packages/agent-runtime/src/opencode-harness-service.ts` now extracts OpenCode `parts` with `type: "thinking"` into timeline items (`thinking:${messageId}:${index}`), inserted after started tool items and before the assistant text message for the same turn.
- `packages/contracts/src/sse/envelope.ts` now reuses `AgentStepTimelineToolItem` for `tool_activity` events, which keeps `summary`, `input`, `output`, and `error` aligned with the main runtime contract instead of maintaining a narrower duplicate schema.
- `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx` now treats tool inputs as `unknown` payloads instead of forcing `Record<string, unknown>`. This lets parsed bash input objects, plain strings, and future structured payloads render without losing fidelity.
- Bash tool inputs render best when the UI special-cases a `command` field: showing `$ {command}` plus metadata like `cwd`/`timeout` is much clearer than dumping the raw JSON object.
- The current runtime timeline still keeps tool activities as paired started/completed items and merges them in `buildTimelineDisplayEntries`; thinking items can be slotted into that same shaping pass without changing SSE event names or the broader timeline reconciliation flow.

## 2026-04-10 — full timeline hydration on mount

- The agent-step detail route now needs two timeline sources with different jobs: `detail.body.timelinePreview` for immediate paint and `project.getAgentStepTimelinePage` for full history hydration after mount.
- `getAgentStepTimelinePage` should only run when a real session exists and the preview is non-empty; otherwise the preview already proves there is no persisted timeline to backfill.
- Full-history hydration must merge into local `timelineItems` state instead of replacing it blindly, otherwise SSE events that land during the initial fetch can be lost.
