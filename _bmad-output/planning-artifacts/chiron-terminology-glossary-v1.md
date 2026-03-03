# Chiron Terminology Glossary v1

Date: 2026-03-02
Status: Draft for team alignment (single-repo scope)

## Purpose

This glossary locks shared terminology for Chiron methodology design and project execution so architecture, implementation, and UX conversations remain unambiguous.

## Scope Lock (v1)

- Single-repo execution model for each project.
- No design-time multi-repo slot routing in v1.
- Repo context is provided by project-scoped facts/config and reused during execution.
- Multi-repo targeting remains deferred and can be introduced later without changing these core definitions.

## Thesis-Aligned Primitive Terms

- Methodology: A versioned delivery model composed of fact definitions, work-unit definitions, transitions, workflows, and step contracts that provides the shared mental model for project execution.
- Methodology Version: A concrete immutable publishable revision of a methodology (`draft` before publish, `active` after publish).
- Methodology Fact: Method-defined project-scope fact schema used across project execution.
- Work Unit: Method-defined unit type instantiated in a project (for example, a Story).
- Work Unit Fact: Method-defined fact schema scoped to a work-unit instance.
- Transition: Method-defined lifecycle edge between work-unit states.
- Workflow: Method-defined executable graph for accomplishing a transition or operation.
- Step: Method-defined executable node in a workflow (`form`, `action`, `agent`, `branch`, `display`, `invoke`).

## Contract vs Value Terms

- Method Contract: The published methodology definition surface (facts/work units/transitions/workflows/steps and their rules).
- Fact Definition: The schema-level definition of a fact (`key`, type, required, validation).
- Fact Value: The runtime value written for a fact in a project or work-unit instance.
- Project State: Persisted project-level values and execution history.
- Run State: Runtime state and evidence for one workflow execution.

## Runtime Layer Terms

- Design Time: Methodology authoring phase before publish.
- Publish Time: Validation and publication event that promotes a methodology version to active.
- Project Runtime: Operational runtime for a project pinned to a methodology version.
- Execution Runtime: One workflow run in project runtime.
- Step Runtime: One step attempt within execution runtime.
- Agent Runtime: Sub-runtime of an `agent` step while an agent/SDK is executing.
- Tool Runtime: Sub-runtime for command/tool operations invoked by `action` or agent tool calls.
- Git Runtime: Sub-runtime where repository git state is inspected or mutated.
- Artifact Runtime: Sub-runtime where artifacts are produced, updated, or snapshotted.

Containment rule:

`Project Runtime > Execution Runtime > Step Runtime > (Agent Runtime | Tool Runtime | Git Runtime | Artifact Runtime)`

## Execution Orchestration Terms (Non-AX)

- Workflow Definition: Design-time workflow graph contract (steps, edges, mappings, policies).
- Workflow Execution (Run): One runtime instance of a workflow definition in project runtime.
- Run Identifier: Stable identifier for a workflow execution instance.
- Execution Plan: Resolved step dependency/routing plan derived from the workflow definition and current run context.
- Ready Step: Step whose prerequisites and route conditions are satisfied and can execute.
- Step Dispatch: Runtime action that starts execution of a ready step.
- Step Attempt: One concrete attempt for a dispatched step (see Step Execution Terms).
- Branch Resolution: Runtime evaluation of a `branch` step condition set to choose downstream route(s).
- Lifecycle Transition Resolution: Runtime evaluation of transition guards to allow or block a lifecycle state change.
- Orchestration Checkpoint: Persisted run-progress boundary used for resume/recovery.
- Resume: Continue a run from the last valid orchestration checkpoint.
- Cancellation: Intentional termination request for an active run or step attempt.
- Timeout: Policy-triggered termination or failure state when execution exceeds configured limits.
- Compensation: Optional remediation action for side-effecting failures.
- Event History: Append-only record of orchestration events (dispatches, outcomes, transitions, cancellations).

Clarification:

- Orchestration terms describe workflow/run/step coordination semantics.
- AX terms describe DSPy optimization and inference semantics.

## AX Engine Terms

- AX Engine: DSPy-based optimization and inference component used by `agent` steps for declarative, structured prompt/program execution.
- AX Signature: Declarative input/output contract for an AX program (what goes in, what structured fields must come out).
- AX Program: Composed DSPy module graph implementing a task using one or more signatures.
- AX Module: Reusable DSPy unit inside a program (for example, predict/chain/module composition).
- AX Optimizer: DSPy optimizer that compiles a program against examples and a metric.
- AX Metric: Scoring function used during optimization/evaluation to rank candidate prompt/program variants.
- AX Example Set: Input/output examples used for compile/eval cycles.
- AX Compile Run: One optimizer execution producing an optimized program revision.
- AX Revision: Versioned optimized prompt/program artifact selected from compile runs.
- AX Structured Output Contract: Schema-enforced output shape returned by AX execution.
- AX Trace: Per-call reasoning/decision trace metadata used for analysis and debugging.
- AX Inference Run: One runtime invocation of an AX program within an `agent` step.

Clarification:

- AX Engine terms describe DSPy prompt/program optimization and structured inference behavior, not workflow orchestration internals.

## Lifecycle and Condition Terms

- Transition Definition: Formal transition edge (`fromState -> toState`) with transition metadata.
- Transition Guard: Deterministic rule set evaluated for transition eligibility.
- Guard Condition: One atomic predicate within a transition guard.
- Transition Attempt: Runtime request to apply a transition.
- Transition Outcome: Result of an attempt (`allowed`, `blocked`, `failed`) with diagnostics.
- Gate Class: Transition class (`start_gate`, `completion_gate`).
- Branch Condition: Workflow-level route condition used by `branch` steps (not a lifecycle transition).
- Blocking Diagnostic: Diagnostic that prevents progression.
- Non-Blocking Diagnostic: Diagnostic that warns but does not block progression under policy.

## Step Execution Terms

- Step Definition: Design-time step contract (`type`, config, inputs, outputs, policies).
- Step Execution: One concrete runtime execution record for a step.
- Step Attempt: One attempt number within a step execution lineage.
- Step Lineage: Ordered sequence of attempts for the same logical step.
- Retry: New attempt after `failed` or `blocked` outcome.
- Redo: New attempt after `completed` outcome.
- Active Attempt: The currently authoritative attempt for downstream progression.
- Superseded Attempt: A prior attempt replaced by a newer authoritative attempt.
- Step State: `pending`, `in_progress`, `completed`, `blocked`, `failed`, `skipped`, `superseded`, `cancelled`.

Implementation note:

- Retry and redo can share the same core attempt-creation mechanism; they remain separate terms for intent/policy/analytics.

## Input and Context Terms

- Initial Input Snapshot: Immutable capture of resolved step inputs at step-start.
- Live Read Event: Runtime context/tool/MCP read performed during step runtime (with timestamp and evidence).
- Effective Step Input: Initial input snapshot plus ordered live read events.
- Input Mode: Step policy for input behavior:
  - `frozen`: no live reads, only initial input snapshot.
  - `live-with-evidence`: live reads allowed, each read logged as evidence.

Timing rule:

- Input/condition evaluation is step-runtime scoped, not workflow-start scoped (unless an explicit preflight step is defined).

## Single-Repo Terms (v1)

- Project Repo Context: The single repository context used by project execution.
- Step Working Directory: The resolved directory used by the running step.
- Code Change Set: File-level delta produced by step execution.
- Commit Event: Git mutation milestone captured during execution.
- Git Ref Snapshot: Git checkpoint metadata (`headBefore`, `headAfter`, branch, dirty state).

## Artifact and Evidence Terms

- Artifact Slot: Named channel/location for work-unit or workflow artifacts.
- Artifact Snapshot: Immutable capture of artifact slot values/files at a checkpoint.
- Step Evidence: Append-only evidence package for one step attempt.
- Execution Evidence: Aggregated run-level evidence linking attempts, diagnostics, artifacts, and git checkpoints.
- Snapshot Consistency: Artifact snapshot and git ref snapshot must reference the same attempt/run context.

## Determinism and Policy Terms

- Deterministic Diagnostic: Structured diagnostic that is reproducible for the same inputs.
- Deterministic Evaluation: Guard/validation outcomes are stable for equivalent input contexts.
- Attempt Promotion Rule: Policy that chooses which attempt becomes authoritative.
- Idempotency Policy: Rule describing safe re-execution behavior for side-effecting steps.
- Retry Policy: Rule describing when/how failed or blocked steps can be retried.

## Naming Guidance (Collision Avoidance)

- Keep `Artifact Slot` reserved for artifact channels.
- For repository-routing concepts in future multi-repo work, avoid reusing `slot` alone without qualifier; use explicit names (`repo target`, `repo binding`) to avoid ambiguity.
- Always qualify `workflow` as either `Workflow Definition` (design-time) or `Workflow Execution (Run)` (runtime).
- Always qualify `runtime` with layer (`Project Runtime`, `Execution Runtime`, `Step Runtime`, or sub-runtime).
- Distinguish `Branch Resolution` (workflow routing) from `Lifecycle Transition Resolution` (state progression).
- Distinguish `Step State` from lifecycle/work-unit state by always including the noun (`step`, `work-unit`, `methodology version`).

## Deferred for Future Revision

- Multi-repo target modeling and resolution semantics.
- First-class target tables and per-target execution evidence records.
- Cross-repo orchestration/consistency semantics.
