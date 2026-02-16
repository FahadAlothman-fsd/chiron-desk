# BMAD E2E Workflow Notes (Session Reference)

**Last Updated:** 2026-02-09  
**Status:** Working reference (not final spec)

This note captures corrections and preferences from the latest architecture discussion for an end-to-end BMAD-inspired path in Chiron.

## Core Corrections Integrated

1. **Form steps should be used sparingly.**
   - Prefer `agent` + tools for conversational capture of simple values (project name/description, vision, users, metrics).
   - Use `form` primarily for complex references/selection (snapshot refs, artifact refs, non-trivial structured inputs).

2. **Artifacts must be concrete files + records.**
   - Artifact generation should write files in project workspace (through tooling/sandbox path), then persist artifact metadata in DB.
   - Artifact records should include: file path, type/role, execution/step linkage, optional git hash.

3. **Complexity/path selection belongs to AX tools.**
   - Use `ax-generation` tools for complexity classification and workflow path recommendation.
   - Avoid vague ad-hoc tool semantics for those decisions.

4. **Action configs must be explicit and contract-shaped.**
   - Avoid placeholder pseudo-actions like vague `upsert-project` under wrong kind.
   - Use well-defined action kinds/operations and explicit template references.

5. **Template usage should be explicit in more places.**
   - `systemPromptBlock`, `initialPrompt`, display messages, and file content generation should consistently use template-engine rendering where applicable.

6. **Invoke input mapping must be generic and deterministic.**
   - Since workflows do not enforce top-level I/O contracts yet, invoke must map variables into child execution context explicitly.
   - Child context should be namespaced and traceable to avoid collisions.

7. **Agent continuation via `contextAttachments` is promising but unproven.**
   - Keep as draft contract.
   - Add explicit tests before relying on it in production workflows.

8. **Product brief can be agent-driven, not form-heavy.**
   - Use conversational agent steps with tool writes for most fields.
   - Restrict non-Chiron agents until project workspace is initialized (directory + git initialized).

9. **Initializer should include branch-based optional brief generation.**
   - Agent tool sets boolean variable (for example `project.requiresBrief`).
   - `branch` step routes:
     - yes -> generate product brief + commit
     - no -> generate README + commit

10. **Architecture workflow should reduce form overuse and leverage branch more.**
   - Branching is a good fit for architecture validation loops and scope-dependent routes.

11. **Create-epics-and-stories should support iterative persistent tooling.**
   - Prefer incremental epic/story creation over one-shot bulk generation.
   - Keep tool availability persistent until user signals completion or explicit termination trigger.

## Additional Direction Locked In This Session

- Workflow paths/packs are guidance, not hard policy constraints.
- Keep Chiron configurable and artifact-first while improving traceability.
- PM/workflow/artifact bridge remains an active consideration item (see `pm-workflow-artifact-bridge-consideration.md`).

## Next Session Focus

1. Module coupling/dependency pass (circular dependency risk review).
2. Effectful design pass across modules.
3. Refined E2E config example using the corrections above.
