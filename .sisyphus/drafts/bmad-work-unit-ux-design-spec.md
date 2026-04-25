# BMAD Work Unit Seed Spec: UX Design

## Status
- Agreement state: **draft for review**
- Scope: BMAD Method seeded methodology, UX Design work unit only
- Purpose: reference artifact for implementing canonical UX Design seed rows and downstream Architecture / Backlog bindings

## Ground Rules
- UX Design is a BMAD planning work unit that converts PRD journeys/requirements into a user-centered design specification.
- UX Design is `many_per_project`: a project may have multiple PRDs, major product surfaces, or design variants; each UX Design unit must bind to one chosen PRD or direct source context.
- UX Design is optional for non-UI projects, but first-class when user interaction, visual UI, or interaction design matters.
- The canonical output is `UX_DESIGN_SPECIFICATION`.
- Supporting visual artifacts such as color theme visualizers and design direction mockups are artifact slots, not facts.
- UX Design requirements are first-class downstream inputs for Backlog/Epics and must not be treated as informal supplementary notes.
- BMAD's micro-step UX workflow is preserved as embedded agent procedure, but Chiron should model it as a smaller set of agent-heavy steps initially.
- `display` must not be used.
- `action` is used only for propagation in this seed slice.

## Work Unit Definition

| Property | Value |
|---|---|
| Work unit key | `ux_design` |
| Display name | `UX Design` |
| Cardinality | `many_per_project` |
| Purpose | Create a comprehensive UX design specification covering project understanding, core experience, visual foundation, flows, components, patterns, responsiveness, and accessibility. |

## Lifecycle States

### State: `done`

| Property | Value |
|---|---|
| Key | `done` |
| Display name | `Done` |
| Meaning | UX design specification is complete and ready to inform Architecture, Backlog/Epics, and implementation. |

## Lifecycle Transitions

### Transition: `activation_to_done`

| Property | Value |
|---|---|
| Key | `activation_to_done` |
| From state | `null` / activation |
| To state | `done` |
| Bound primary workflow | `create_ux_design` |

### Start gate
UX Design can start when:

- A PRD work-unit reference or PRD artifact exists, preferred; or
- Direct source context exists and the workflow can elicit missing product/user context; and
- The project has meaningful user interaction, visual UI, or interaction-design needs.

If the PRD classification indicates API/backend-only with no user-facing interface, Setup/PRD should normally skip UX Design and continue to Architecture/Backlog instead.

### Completion gate
UX Design can complete only when the workflow has propagated the design contract and artifact:

- UX Design work-unit fact `project_understanding` exists
- UX Design work-unit fact `core_experience` exists
- UX Design work-unit fact `design_system_strategy` exists
- UX Design work-unit fact `visual_foundation` exists
- UX Design work-unit fact `user_flow_specs` has at least one item
- UX Design work-unit fact `component_strategy` exists
- UX Design work-unit fact `responsive_accessibility_strategy` exists
- UX Design work-unit fact `ux_design_requirements` has at least one item
- UX Design work-unit fact `ux_design_synthesis` exists
- UX Design artifact slot `UX_DESIGN_SPECIFICATION` has an artifact instance or artifact reference
- UX Design work-unit fact `next_recommended_work_units` has at least one item

Supporting visual artifacts are recommended when produced but do not block completion.

## Artifact Slot Definitions

| Slot key | Display name | Cardinality | Required for completion | Purpose |
|---|---|---:|---:|---|
| `UX_DESIGN_SPECIFICATION` | UX Design Specification | `single` | yes | Canonical comprehensive UX design specification. |
| `UX_COLOR_THEMES` | UX Color Themes Visualizer | `single` | no | Optional HTML/visual artifact for color theme exploration. |
| `UX_DESIGN_DIRECTIONS` | UX Design Directions | `single` | no | Optional HTML/visual artifact showing design direction mockups and comparisons. |

### UX Design artifact required section coverage
The `UX_DESIGN_SPECIFICATION` artifact should include, when applicable:

- Executive Summary / Project Understanding
- Core User Experience
- Desired Emotional Response
- UX Pattern Analysis & Inspiration
- Design System Foundation
- Defining Experience
- Visual Design Foundation
- Design Direction Decision
- User Journey Flows
- Component Strategy
- UX Consistency Patterns
- Responsive Design & Accessibility

## UX Design Work-Unit Fact Definitions

| Fact key | Value type | Cardinality | Required for completion | Purpose |
|---|---|---:|---:|---|
| `prd_work_unit` | `work_unit_reference` | `one` | no | Preferred source PRD reference. |
| `product_brief_work_unit` | `work_unit_reference` | `one` | no | Optional Product Brief source reference. |
| `research_work_units` | `work_unit_reference` | `many` | no | Optional research references that inform UX decisions. |
| `project_understanding` | `json` | `one` | yes | UX-focused synthesis of project vision, target users, design challenges, and opportunities. |
| `core_experience` | `json` | `one` | yes | Core action, platform strategy, effortless interactions, success moments, and principles. |
| `emotional_response` | `json` | `one` | no | Desired emotional states and design implications. |
| `ux_inspiration` | `json` | `one` | no | Inspiring products, transferable patterns, anti-patterns, and inspiration strategy. |
| `design_system_strategy` | `json` | `one` | yes | Design system choice, rationale, implementation approach, and customization strategy. |
| `visual_foundation` | `json` | `one` | yes | Color, typography, spacing/layout, and accessibility foundation. |
| `design_direction_decision` | `json` | `one` | no | Chosen visual direction, rationale, and implementation approach. |
| `user_flow_specs` | `json` | `many` | yes | Detailed journey flows with steps, branches, error recovery, and optimization principles. |
| `component_strategy` | `json` | `one` | yes | Design-system coverage, custom component specs, and implementation roadmap. |
| `ux_consistency_patterns` | `json` | `one` | no | Buttons, feedback, forms, navigation, empty/loading states, and other reusable UX patterns. |
| `responsive_accessibility_strategy` | `json` | `one` | yes | Responsive strategy, breakpoints, WCAG target, testing strategy, and implementation guidelines. |
| `ux_design_requirements` | `json` | `many` | yes | Actionable UX design requirements for Backlog/Epics and implementation traceability. |
| `ux_design_synthesis` | `json` | `one` | yes | Machine-readable downstream summary of UX decisions and traceability. |
| `next_recommended_work_units` | `work_unit_reference` | `many` | yes | Next recommended work units, typically Architecture and/or Backlog. |

### `project_understanding` schema

```ts
{
  projectVision: string;
  targetUsers: string[];
  keyDesignChallenges: string[];
  designOpportunities: string[];
  sourcePrdFrIds?: string[];
}
```

### `core_experience` schema

```ts
{
  coreUserAction: string;
  platformStrategy: string[];
  effortlessInteractions: string[];
  criticalSuccessMoments: string[];
  experiencePrinciples: string[];
  definingExperience?: {
    description: string;
    userMentalModel: string;
    successCriteria: string[];
    novelPatterns: string[];
    mechanics: string[];
  };
}
```

### `emotional_response` schema

```ts
{
  primaryEmotionalGoals: string[];
  emotionalJourney: string[];
  microEmotions: string[];
  designImplications: string[];
  emotionsToAvoid: string[];
}
```

### `design_system_strategy` schema

```ts
{
  selectedApproach: "custom" | "established_system" | "themeable_system" | "existing_project_system" | "other";
  selectedSystemName?: string;
  rationale: string[];
  implementationApproach: string[];
  customizationStrategy: string[];
}
```

### `visual_foundation` schema

```ts
{
  colorSystem: string[];
  typographySystem: string[];
  spacingAndLayout: string[];
  accessibilityConsiderations: string[];
}
```

### `user_flow_specs` item schema

```ts
{
  flowId: string;
  name: string;
  sourceJourneyId?: string;
  entryPoints: string[];
  steps: string[];
  decisionPoints: string[];
  successPath: string;
  failureAndRecoveryPaths: string[];
  mermaidDiagram?: string;
  optimizationPrinciples: string[];
}
```

### `component_strategy` schema

```ts
{
  foundationComponents: string[];
  customComponents: Array<{
    name: string;
    purpose: string;
    usage: string;
    states: string[];
    variants: string[];
    accessibility: string[];
    sourceFlowIds?: string[];
  }>;
  implementationRoadmap: Array<{
    phase: "core" | "supporting" | "enhancement";
    components: string[];
  }>;
}
```

### `ux_design_requirements` item schema

```ts
{
  id: string; // UX-DR1, UX-DR2, ...
  category: "flow" | "component" | "visual" | "pattern" | "responsive" | "accessibility" | "content" | "other";
  requirement: string;
  source: "prd" | "ux_discovery" | "component_strategy" | "accessibility" | "design_direction" | "other";
  priority: "must" | "should" | "could";
  relatedFrIds?: string[];
}
```

### `responsive_accessibility_strategy` schema

```ts
{
  responsiveStrategy: string[];
  breakpointStrategy: string[];
  wcagTarget: "A" | "AA" | "AAA" | "not_applicable";
  accessibilityRequirements: string[];
  testingStrategy: string[];
  implementationGuidelines: string[];
}
```

### `ux_design_synthesis` schema

```ts
{
  executiveSummary: string;
  keyUxDecisions: string[];
  designSystem: string;
  criticalFlows: string[];
  customComponentCount: number;
  uxRequirementCount: number;
  downstreamTraceability: {
    architectureNeeds: string[];
    backlogNeeds: string[];
    implementationRisks: string[];
  };
}
```

## Workflow Context Fact Definitions

### Bound UX Design facts

| Fact key | Context fact kind | Value type / target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `project_understanding_ctx` | `bound_fact` | binds UX fact `project_understanding` | `one` | Discovery agent | UX project understanding. |
| `core_experience_ctx` | `bound_fact` | binds UX fact `core_experience` | `one` | Experience agent | Core/defining experience. |
| `emotional_response_ctx` | `bound_fact` | binds UX fact `emotional_response` | `one` | Experience agent | Emotional design goals. |
| `ux_inspiration_ctx` | `bound_fact` | binds UX fact `ux_inspiration` | `one` | Experience agent | Pattern inspiration. |
| `design_system_strategy_ctx` | `bound_fact` | binds UX fact `design_system_strategy` | `one` | Visual/design agent | Design system decision. |
| `visual_foundation_ctx` | `bound_fact` | binds UX fact `visual_foundation` | `one` | Visual/design agent | Visual foundation. |
| `design_direction_decision_ctx` | `bound_fact` | binds UX fact `design_direction_decision` | `one` | Visual/design agent | Chosen visual direction. |
| `user_flow_specs_ctx` | `bound_fact` | binds UX fact `user_flow_specs` | `many` | Flows/components agent | Detailed flows. |
| `component_strategy_ctx` | `bound_fact` | binds UX fact `component_strategy` | `one` | Flows/components agent | Component strategy. |
| `ux_consistency_patterns_ctx` | `bound_fact` | binds UX fact `ux_consistency_patterns` | `one` | Flows/components agent | Consistency patterns. |
| `responsive_accessibility_strategy_ctx` | `bound_fact` | binds UX fact `responsive_accessibility_strategy` | `one` | A11y/completion agent | Responsive/a11y strategy. |
| `ux_design_requirements_ctx` | `bound_fact` | binds UX fact `ux_design_requirements` | `many` | A11y/completion agent | Actionable UX requirements. |
| `ux_design_synthesis_ctx` | `bound_fact` | binds UX fact `ux_design_synthesis` | `one` | A11y/completion agent | Downstream summary. |
| `next_work_unit_refs` | `bound_fact` | binds UX fact `next_recommended_work_units` | `many` | A11y/completion agent | Next recommended units. |

### Source and artifact context facts

| Fact key | Context fact kind | Target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `prd_work_unit_ref` | `work_unit_reference_fact` | PRD work unit | `one` | Invoke binding | Preferred PRD source. |
| `product_brief_work_unit_ref` | `work_unit_reference_fact` | Product Brief work unit | `one` | Invoke binding | Optional brief source. |
| `research_work_unit_refs` | `work_unit_reference_fact` | Research work units | `many` | Invoke binding | Optional research source. |
| `input_artifact_refs` | `artifact_slot_reference_fact` | PRD / Product Brief / Research / Project Context | `many` | Invoke binding / initialization agent | Prior artifacts to load or summarize. |
| `ux_design_spec_artifact_ctx` | `artifact_slot_reference_fact` | `UX_DESIGN_SPECIFICATION` | `one` | A11y/completion agent | Staged UX spec artifact. |
| `ux_color_themes_artifact_ctx` | `artifact_slot_reference_fact` | `UX_COLOR_THEMES` | `one` | Visual/design agent | Optional color theme visualizer. |
| `ux_design_directions_artifact_ctx` | `artifact_slot_reference_fact` | `UX_DESIGN_DIRECTIONS` | `one` | Visual/design agent | Optional design direction mockups. |

## Workflow Definition: `create_ux_design`

| Property | Value |
|---|---|
| Workflow key | `create_ux_design` |
| Family | `ux_design` |
| Intent | `create_ux_design_specification` |
| Bound transition | `activation_to_done` |
| Entry step | `ux_input_initialization_agent` |

## Workflow Step Graph

### Step 1: `ux_input_initialization_agent`
- Type: `agent`
- Purpose: BMAD Step 1: detect continuation, discover inputs, initialize UX specification context.
- Reads:
  - `prd_work_unit_ref`
  - `product_brief_work_unit_ref`
  - `research_work_unit_refs`
  - `input_artifact_refs`
- Writes:
  - initial source context used by later steps
- Objective:
  - Discover PRD, Product Brief, Research, Project Context, and project docs.
  - Prefer bound Chiron references over filesystem scanning when available.
  - Confirm input set with the user in guided mode before using it.

### Step 2: `ux_project_and_experience_agent`
- Type: `agent`
- Purpose: BMAD Steps 2-5: project understanding, core experience, emotional response, inspiration.
- Reads:
  - source references and input artifacts
- Writes:
  - `project_understanding_ctx`
  - `core_experience_ctx`
  - `emotional_response_ctx`
  - `ux_inspiration_ctx`
- Objective:
  - Synthesize PRD/user context into UX challenges and opportunities.
  - Define core action, platform strategy, effortless interactions, critical success moments, and experience principles.
  - Define desired emotional response and design implications.
  - Analyze inspiration sources, transferable patterns, and anti-patterns.

### Step 3: `ux_visual_foundation_agent`
- Type: `agent`
- Purpose: BMAD Steps 6-9: design system choice, defining experience, visual foundation, design directions.
- Reads:
  - `project_understanding_ctx`
  - `core_experience_ctx`
  - `emotional_response_ctx`
  - `ux_inspiration_ctx`
- Writes:
  - `design_system_strategy_ctx`
  - updated `core_experience_ctx`, with defining experience details
  - `visual_foundation_ctx`
  - `design_direction_decision_ctx`
  - `ux_color_themes_artifact_ctx`, if produced
  - `ux_design_directions_artifact_ctx`, if produced
- Objective:
  - Choose design system foundation and rationale.
  - Define the product's defining interaction and mechanics.
  - Establish colors, typography, spacing/layout, and accessibility foundation.
  - Produce optional visual exploration artifacts when useful.

### Step 4: `ux_flows_components_patterns_agent`
- Type: `agent`
- Purpose: BMAD Steps 10-12: journey flows, component strategy, consistency patterns.
- Reads:
  - `project_understanding_ctx`
  - `core_experience_ctx`
  - `design_system_strategy_ctx`
  - `visual_foundation_ctx`
  - `design_direction_decision_ctx`
  - PRD journeys / FR references through source context
- Writes:
  - `user_flow_specs_ctx`
  - `component_strategy_ctx`
  - `ux_consistency_patterns_ctx`
- Objective:
  - Convert PRD journeys into detailed interaction flows with decision points and recovery paths.
  - Specify custom components and design-system coverage.
  - Define reusable UX patterns for buttons, feedback, forms, navigation, empty/loading states, and other critical situations.

### Step 5: `ux_responsive_accessibility_completion_agent`
- Type: `agent`
- Purpose: BMAD Steps 13-14: responsive/accessibility strategy, final specification, next steps.
- Reads:
  - all prior UX context facts
  - source PRD references and artifacts
- Writes:
  - `responsive_accessibility_strategy_ctx`
  - `ux_design_requirements_ctx`
  - `ux_design_synthesis_ctx`
  - `ux_design_spec_artifact_ctx`
  - `next_work_unit_refs`
- Objective:
  - Define responsive strategy, breakpoints, WCAG target, testing, and implementation guidelines.
  - Extract actionable UX Design Requirements (`UX-DR#`) for Backlog/Epics.
  - Produce final UX Design Specification artifact.
  - Recommend Architecture and/or Backlog next, depending on current path.

### Step 6: `propagate_ux_design_outputs`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist finalized workflow-context values into durable UX Design facts and artifact slots.

#### Propagate to UX Design work-unit facts
- `prd_work_unit_ref`, if present → UX Design fact `prd_work_unit`
- `product_brief_work_unit_ref`, if present → UX Design fact `product_brief_work_unit`
- `research_work_unit_refs`, if present → UX Design fact `research_work_units`
- `project_understanding_ctx` → UX Design fact `project_understanding`
- `core_experience_ctx` → UX Design fact `core_experience`
- `emotional_response_ctx`, if present → UX Design fact `emotional_response`
- `ux_inspiration_ctx`, if present → UX Design fact `ux_inspiration`
- `design_system_strategy_ctx` → UX Design fact `design_system_strategy`
- `visual_foundation_ctx` → UX Design fact `visual_foundation`
- `design_direction_decision_ctx`, if present → UX Design fact `design_direction_decision`
- `user_flow_specs_ctx` → UX Design fact `user_flow_specs`
- `component_strategy_ctx` → UX Design fact `component_strategy`
- `ux_consistency_patterns_ctx`, if present → UX Design fact `ux_consistency_patterns`
- `responsive_accessibility_strategy_ctx` → UX Design fact `responsive_accessibility_strategy`
- `ux_design_requirements_ctx` → UX Design fact `ux_design_requirements`
- `ux_design_synthesis_ctx` → UX Design fact `ux_design_synthesis`
- `next_work_unit_refs` → UX Design fact `next_recommended_work_units`

#### Propagate to UX Design artifact slots
- `ux_design_spec_artifact_ctx` → `UX_DESIGN_SPECIFICATION`
- `ux_color_themes_artifact_ctx`, if present → `UX_COLOR_THEMES`
- `ux_design_directions_artifact_ctx`, if present → `UX_DESIGN_DIRECTIONS`

## Invoke and Downstream Design Notes

- PRD should invoke UX Design only when user-facing interface or interaction design is material.
- Architecture should read UX Design outputs when available, especially design system, responsive/a11y strategy, component strategy, and flows.
- Backlog/Epics must extract `ux_design_requirements` as a separate first-class requirement stream, not merge them into generic additional requirements.
- Implementation Readiness should validate UX ↔ PRD ↔ Architecture alignment when UX Design exists.

## Implementation Reference Files

- BMAD UX Design workflow: `_bmad/bmm/2-plan-workflows/bmad-create-ux-design/workflow.md`
- BMAD UX Design template: `_bmad/bmm/2-plan-workflows/bmad-create-ux-design/ux-design-template.md`
- BMAD UX Design steps: `_bmad/bmm/2-plan-workflows/bmad-create-ux-design/steps/*.md`
- BMAD Epic extraction of UX requirements: `_bmad/bmm/3-solutioning/bmad-create-epics-and-stories/steps/step-01-validate-prerequisites.md`
- BMAD Architecture UX input handling: `_bmad/bmm/3-solutioning/bmad-create-architecture/steps/step-02-context.md`
- Methodology fact schema: `packages/db/src/schema/methodology.ts`
- Fact contracts: `packages/contracts/src/methodology/fact.ts`
- Workflow contracts: `packages/contracts/src/methodology/workflow.ts`
- Agent runtime/MCP behavior: `packages/workflow-engine/src/services/runtime/agent-step-mcp-service.ts`
