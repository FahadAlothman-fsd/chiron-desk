# Story 2-M11: Real-Time Agent Streaming

**Status:** drafted
**Story Key:** `2-M11-real-time-agent-streaming`
**Epic:** `epic-2`
**Created:** 2026-01-17

## Story Summary

Replace polling-based chat with real-time streaming using AI SDK UI (`useChat`) and tRPC subscriptions. Currently, `ask-user-chat-step.tsx` polls every 2 seconds for updates. This story implements proper streaming for instant text chunks, tool calls, and approval flow.

## Problem Statement

Current implementation uses polling which introduces:
- 2-second delay in message updates
- No real-time text chunk streaming
- Manual message state management
- Wasted resources from constant polling

## Proposed Solution

Add streaming endpoint that:
1. Calls `sandboxed-agent-handler` with streaming support
2. Emits `TextChunk` events in real-time via tRPC subscription
3. Handles tool approvals through the same stream
4. Frontend uses `useChat` or custom hook for real-time updates

## Technical Notes (from Research)

- AI SDK UI `useChat` expects streaming endpoints with SSE format
- Can use `createUIMessageStream` from AI SDK for server-side streaming
- tRPC subscriptions already exist (`onWorkflowEvent`) - leverage that pattern
- Effect services (`AIProviderService`, `WorkflowEventBus`) already support streaming

## Dependencies

- **Blocked by:** `2-M8-complete-sandboxed-agent` (must complete first)
- **Related:** `2-M9-effect-executor-wiring` (uses same Effect infrastructure)

## Estimated Effort

- Backend: 2-3 hours
- Frontend: 3-4 hours
- Testing: 1-2 hours

## Out of Scope

- Full `useChat` migration (can be incremental)
- Changing approval UI components (already work well)
- Backward compatibility with polling (may keep as fallback)

## References

- AI SDK UI Docs: https://ai-sdk.dev/docs/ai-sdk-ui/use-chat
- Current Implementation: `apps/web/src/components/workflows/steps/ask-user-chat-step.tsx`
- Handler: `packages/api/src/services/workflow-engine/step-handlers/sandboxed-agent-handler.ts`
- Existing tRPC Subscription: `workflows.onWorkflowEvent` in `routers/workflows.ts`

---

## Templates (fill in via create-story workflow)

### User Story
As a [user/persona],
I want [goal],
So that [benefit].

### Acceptance Criteria
1. [ ] Real-time text streaming (no polling delay)
2. [ ] Tool calls streamed to frontend
3. [ ] Approval flow works with streaming
4. [ ] Frontend uses streaming hook
5. [ ] Fallback/polling still works (optional)

### Tasks / Subtasks
- [ ] **Task 1: Backend Streaming Endpoint**
  - [ ] 1.1 Add `streamAgentMessage` subscription in workflows.ts
  - [ ] 1.2 Wire `sandboxed-agent-handler` to stream events
  - [ ] 1.3 Test streaming with curl/wget

- [ ] **Task 2: Frontend Streaming Hook**
  - [ ] 2.1 Create `useAgentChat` hook or adapt `useChat`
  - [ ] 2.2 Connect to streaming subscription
  - [ ] 2.3 Handle text chunks in real-time

- [ ] **Task 3: Approval Integration**
  - [ ] 3.1 Stream approval requests to frontend
  - [ ] 3.2 Handle approval responses via same stream
  - [ ] 3.3 Test full approval flow

- [ ] **Task 4: Testing**
  - [ ] 4.1 Unit tests for streaming hook
  - [ ] 4.2 Integration tests for endpoint
  - [ ] 4.3 Verify with workflow-init seed

### Dev Notes
<!-- Add technical implementation details here -->

### Related Stories
- Preceding: `2-M8-complete-sandboxed-agent`
- Following: `3-3-streaming-unification`

---

*This is a story stub. Use `/bmad-bmm-create-story` to fully elaborate.*
