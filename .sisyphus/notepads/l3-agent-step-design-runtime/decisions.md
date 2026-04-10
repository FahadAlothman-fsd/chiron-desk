## 2026-04-10 — thinking + tool-call runtime fixes

- Kept SSE event taxonomy unchanged (`bootstrap | session_state | timeline | tool_activity | error | done`) and extended the existing `tool_activity` payload instead of introducing a new event family. This preserves existing stream handling while fixing the missing payload fields.
- Modeled reasoning as a new timeline item type (`thinking`) rather than folding it into assistant message content. This keeps the UI capable of rendering reasoning blocks with distinct muted styling and preserves ordering relative to tool calls.
- Left finished tool calls collapsed by default by removing the auto-open effect in `AiToolCall`; users now opt into expansion, which matches the requested OpenCode-like interaction model.

## 2026-04-10 — timeline history fetch behavior

- Added a dedicated `agentStepTimelineQueryKey(projectId, stepExecutionId, cursor?)` and hydrated the runtime timeline from `project.getAgentStepTimelinePage` with `limit: 1000`, while still keeping `timelinePreview` as the fast initial fallback.
- Kept SSE merge behavior unchanged by routing both history hydration and live events through the same `mergeTimelineItems`/`upsertTimelineItem` path.
- Scoped loading and failure UI to the timeline card only, so a history fetch problem does not block the rest of the agent-step runtime surface.
