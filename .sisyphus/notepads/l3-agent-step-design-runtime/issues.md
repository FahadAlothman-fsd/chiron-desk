## 2026-04-10 — agent-step runtime UI exploration

- `packages/contracts/src/sse/envelope.ts` defines `tool_activity` SSE items with only `summary`; it omits `input`, `output`, and `error`, even though `AgentStepTimelineToolItem` includes them. This contract mismatch is likely relevant to the "tool calls show `{}` / miss actual inputs" bug during live streaming.
- `apps/web/src/components/elements/ai-tool-call.tsx` defaults to `defaultOpen = false`, but it auto-opens when state becomes `completed` or `error` (`useEffect` at lines 71-75). That behavior currently conflicts with the desired "collapsed by default but expandable" end state for finished tool calls.
- There is no built-in reasoning/thinking block implementation anywhere in the web app, so the feature will require a new UI primitive plus a corresponding timeline/data shape.

## 2026-04-10 — verification blockers during timeline hydration change

- `bun run check-types` and `apps/web`'s local `bun run check-types` still fail on broad pre-existing workspace type errors outside this task (server MCP typings, workflow-editor payload exact-optional issues, runtime-guidance typing drift, and several unrelated route/test errors). The agent-step timeline changes were verified with targeted route tests, fresh LSP diagnostics on the changed files, and a successful monorepo build instead.
