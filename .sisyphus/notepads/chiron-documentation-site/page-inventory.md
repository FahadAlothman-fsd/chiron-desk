# Chiron Public Page Inventory

## Inventory Rules

- Public navigation uses `Methodology Layer`, `Work Unit Layer`, `Workflow Layer`, and `Step Layer`.
- `L1/L2/L3` are banned from primary public page titles and nav labels.
- **Taskflow** is the running example throughout the site.
- Internal docs may be linked as advanced resources, but they are not mirrored as first-class public pages.

## Claim Policy Defaults

- `conceptual`: mental model, vocabulary, why the layer exists.
- `current behavior`: observable product/runtime/design-time behavior backed by code/contracts.
- `planned/not fully implemented`: explicitly labeled partial/deferred capability.

## Shared Intro And Orientation

| Slug | Page purpose | Target audience | Authority sources | Claim policy |
| --- | --- | --- | --- | --- |
| `/` | Land users on the Chiron mental model, value proposition, and the two-track docs split. | New visitors, evaluators, contributors | `README.md`; `docs/README.md`; `docs/architecture/chiron-module-structure.md` | `conceptual` + selective `current behavior` |
| `/getting-started` | Explain what Chiron is, who it is for, local setup expectations, and where to go next. | New users, contributors | `README.md`; `docs/README.md` | `current behavior` |
| `/mental-model` | Teach the four-layer public model and how design time and project runtime relate. | New users, methodology builders, operators | `README.md`; `docs/architecture/chiron-module-structure.md`; `docs/architecture/methodology-canonical-authority.md` | `conceptual` |
| `/taskflow` | Introduce Taskflow as the single running example used across all docs. | All public audiences | Plan context; `README.md`; promoted methodology docs for terminology alignment | `conceptual` |
| `/taskflow/setup-onboarding` | Show how Taskflow is set up and onboarded through Chiron’s layer model. | Methodology builders, operators | `README.md`; `docs/architecture/methodology-bmad-setup-mapping.md`; promoted methodology docs | `conceptual` + selective `current behavior` |
| `/taskflow/fan-out-delegation` | Show how Taskflow fans out work and delegates through workflows and child work units. | Operators, methodology builders | `README.md`; `packages/contracts/src/runtime/executions.ts`; `docs/architecture/method-workitem-execution-contract.md` | `conceptual` + `planned/not fully implemented` where step/runtime depth is unfinished |
| `/taskflow/review-rework` | Show review/rework loops, evidence, and human checkpoints in the Taskflow example. | Operators, reviewers | `README.md`; runtime contracts; `docs/architecture/pm-workflow-artifact-bridge-consideration.md` | `conceptual` + selective `current behavior` + explicit `planned/not fully implemented` |
| `/reference/claim-policy` | Explain how the docs distinguish conceptual, current, and planned claims. | All public audiences | This authority matrix; `README.md`; internal authority docs | `current behavior` |

## Design Time Track

| Slug | Page purpose | Target audience | Authority sources | Claim policy |
| --- | --- | --- | --- | --- |
| `/design-time/` | Entry page for methodology authoring, scope, and layer map. | Methodology builders, contributors | `README.md`; `docs/architecture/chiron-module-structure.md`; `docs/architecture/epic-3-authority.md` | `conceptual` + selective `current behavior` |
| `/design-time/methodology-layer` | Explain what the Methodology Layer owns: methodology-wide facts, dependency definitions, and work-unit catalog boundaries. | Methodology builders | `docs/architecture/chiron-module-structure.md`; `docs/architecture/methodology-canonical-authority.md`; `docs/architecture/methodology-pages/versions.md`; `docs/architecture/methodology-pages/methodology-facts.md`; `docs/architecture/methodology-pages/dependency-definitions.md`; `packages/contracts/src/methodology/**` | `conceptual` + `current behavior` |
| `/design-time/work-unit-layer` | Explain what the Work Unit Layer owns and how a work unit becomes the durable contract boundary. | Methodology builders | `docs/architecture/chiron-module-structure.md`; `docs/architecture/methodology-pages/work-units/overview.md`; `docs/architecture/methodology-pages/work-units/detail-tabs.md`; `packages/contracts/src/methodology/**` | `conceptual` + `current behavior` |
| `/design-time/work-unit-layer/facts` | Explain work-unit facts and how they differ from methodology-wide facts. | Methodology builders | `docs/architecture/methodology-pages/work-units/detail-tabs.md`; `docs/architecture/methodology-pages/methodology-facts.md`; `packages/contracts/src/methodology/fact.ts` | `current behavior` |
| `/design-time/work-unit-layer/artifact-slots` | Explain artifact slots as durable output contracts for a work unit. | Methodology builders | `docs/architecture/methodology-pages/artifact-slots-design-time.md`; `packages/contracts/src/methodology/artifact-slot.ts` | `current behavior` |
| `/design-time/work-unit-layer/workflows` | Explain how workflows are attached to work units and bound to transitions. | Methodology builders | `docs/architecture/methodology-pages/work-units/detail-tabs.md`; `docs/architecture/methodology-canonical-authority.md`; `packages/contracts/src/methodology/workflow.ts` | `current behavior` |
| `/design-time/work-unit-layer/transitions-and-state-machine` | Explain states, transitions, and workflow bindings without collapsing them into generic automation. | Methodology builders | `docs/architecture/methodology-pages/state-machine-tab.md`; `docs/architecture/methodology-pages/work-units/detail-tabs.md`; `packages/contracts/src/methodology/lifecycle.ts` | `current behavior` |
| `/design-time/workflow-layer` | Explain workflow ownership, workflow context facts, and why workflows live inside work-unit scope. | Methodology builders | `docs/architecture/chiron-module-structure.md`; `docs/architecture/methodology-pages/workflow-editor/shell.md`; `packages/contracts/src/methodology/workflow.ts` | `conceptual` + `current behavior` |
| `/design-time/workflow-layer/context-facts` | Explain workflow context facts as execution-scoped context rather than methodology or work-unit definition data. | Methodology builders | `docs/architecture/methodology-pages/workflow-editor/variable-target-model.md`; `packages/contracts/src/methodology/workflow.ts`; `packages/contracts/src/runtime/executions.ts` | `current behavior` |
| `/design-time/step-layer` | Introduce the Step Layer and the six step types with maturity framing. | Methodology builders, contributors | `README.md`; `docs/architecture/epic-3-authority.md`; `docs/architecture/chiron-module-structure.md`; `packages/contracts/src/runtime/executions.ts` | `conceptual` + explicit `planned/not fully implemented` |
| `/design-time/step-layer/form` | Explain form steps and captured structured input. | Methodology builders | `docs/architecture/methodology-pages/workflow-editor/form-step.md`; `packages/contracts/src/runtime/executions.ts` | `current behavior` |
| `/design-time/step-layer/agent` | Explain agent steps, bounded context, and current readiness caveats. | Methodology builders, contributors | `docs/architecture/methodology-pages/workflow-editor/agent-step.md`; `docs/architecture/system-pages/harnesses/index.md`; `docs/architecture/modules/provider-registry.md`; `packages/contracts/src/agent-step/**`; `packages/contracts/src/runtime/executions.ts` | `current behavior` + explicit `planned/not fully implemented` |
| `/design-time/step-layer/action` | Explain deterministic external-effect steps and the implementation caveat around deeper AX/runtime readiness. | Methodology builders, contributors | `docs/architecture/methodology-pages/workflow-editor/action-step.md`; `docs/architecture/modules/ax-engine.md`; `packages/contracts/src/runtime/executions.ts` | `current behavior` + explicit `planned/not fully implemented` |
| `/design-time/step-layer/invoke` | Explain invoking other workflows and child work units from a parent workflow. | Methodology builders | `docs/architecture/methodology-pages/workflow-editor/invoke-step.md`; `packages/contracts/src/runtime/executions.ts` | `current behavior` + selective `planned/not fully implemented` |
| `/design-time/step-layer/display` | Explain display steps as read-only guidance and review surfaces. | Methodology builders | `docs/architecture/methodology-pages/workflow-editor/display-step.md`; `packages/contracts/src/runtime/executions.ts` | `current behavior` |
| `/design-time/step-layer/branch` | Explain deterministic branch selection and routed workflow behavior. | Methodology builders | `docs/architecture/methodology-pages/workflow-editor/branch-step.md`; `packages/contracts/src/runtime/executions.ts` | `current behavior` |

## Project Runtime Track

| Slug | Page purpose | Target audience | Authority sources | Claim policy |
| --- | --- | --- | --- | --- |
| `/project-runtime/` | Entry page for operator-facing runtime concepts and the link back to design-time definitions. | Operators, reviewers, contributors | `README.md`; `packages/contracts/src/runtime/overview.ts`; `packages/contracts/src/runtime/work-units.ts`; `packages/contracts/src/runtime/executions.ts` | `conceptual` + `current behavior` |
| `/project-runtime/project-overview` | Explain the project runtime overview, active work, and summary surfaces. | Operators | `packages/contracts/src/runtime/overview.ts` | `current behavior` |
| `/project-runtime/project-facts` | Explain project-wide facts as runtime state outside any single work unit instance. | Operators | `packages/contracts/src/runtime/overview.ts`; `packages/contracts/src/runtime/facts.ts` | `current behavior` |
| `/project-runtime/work-unit-instances` | Explain how work unit instances appear inside a project and how they relate back to design-time work-unit definitions. | Operators, methodology builders | `packages/contracts/src/runtime/work-units.ts`; `docs/architecture/chiron-module-structure.md` | `current behavior` |
| `/project-runtime/work-unit-instance` | Explain the operator view of one work unit instance: state, facts, artifacts, and active transition. | Operators | `packages/contracts/src/runtime/work-units.ts` | `current behavior` |
| `/project-runtime/transition-executions` | Explain transition execution as the state-change envelope that owns start/completion gates and bound workflows. | Operators, reviewers | `packages/contracts/src/runtime/executions.ts`; `packages/contracts/src/runtime/work-units.ts`; `docs/architecture/method-workitem-execution-contract.md` | `current behavior` |
| `/project-runtime/workflow-executions` | Explain workflow execution as the runtime path attached to a transition execution. | Operators, reviewers | `packages/contracts/src/runtime/executions.ts` | `current behavior` |
| `/project-runtime/step-executions` | Explain step execution as the observable unit inside a workflow execution, while clearly labeling unfinished depth where needed. | Operators, reviewers, contributors | `packages/contracts/src/runtime/executions.ts`; `README.md` | `current behavior` + explicit `planned/not fully implemented` |
| `/project-runtime/artifact-slots` | Explain runtime artifact slots and snapshots as operator-visible outputs of work. | Operators, reviewers | `packages/contracts/src/runtime/artifacts.ts`; `packages/contracts/src/runtime/work-units.ts` | `current behavior` |
| `/project-runtime/runtime-guidance` | Explain runtime guidance/eligibility/readiness surfaces for what can run next. | Operators | `packages/contracts/src/runtime/overview.ts`; `packages/contracts/src/runtime/work-units.ts`; related runtime contracts | `current behavior` |

## Reference And Bridge Pages

| Slug | Page purpose | Target audience | Authority sources | Claim policy |
| --- | --- | --- | --- | --- |
| `/reference/glossary` | Define public vocabulary, including methodology, work unit, workflow, step, transition, facts, and artifact slots. | All audiences | `README.md`; methodology/runtime contracts; promoted internal docs | `conceptual` + selective `current behavior` |
| `/reference/legacy-layer-bridge` | Bridge public layer names to legacy `L1/L2/L3` terminology without using legacy labels as primary navigation. | Existing contributors, internal users entering the public docs | `README.md`; `docs/architecture/epic-3-authority.md`; promoted methodology docs | `current behavior` |
| `/reference/internal-docs` | Explain the public/internal boundary and link advanced readers into `docs/**` canonical resources. | Contributors, advanced evaluators | `docs/README.md`; `docs/architecture/epic-3-authority.md`; this authority matrix | `current behavior` |

## Boundary Rule

Internal docs are linked from public docs and README surfaces as advanced resources, but they are not mirrored as first-class public pages and they do not appear as wholesale copies inside the public docs tree.

## Coverage Check

- Shared intro pages: covered
- Design Time pages: covered
- Project Runtime pages: covered
- Glossary / bridge pages: covered
- Exact slugs present for every public page: covered
- Claim policy present for every page: covered
- Legacy `L1/L2/L3` blocked from primary public labels: covered
