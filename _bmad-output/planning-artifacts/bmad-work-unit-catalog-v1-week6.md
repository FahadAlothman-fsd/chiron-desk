# BMAD Work Unit Catalog -> Chiron Mapping v1

Date: 2026-02-18
Status: Canonical work-unit map for methodology setup
Source workflows: `_bmad/_config/workflow-manifest.csv`

## 1) Work Unit Inventory (Canonical IDs)

| workUnitRef | chiron workUnitType key | purpose | primary BMAD workflows |
|---|---|---|---|
| WU.SETUP | setup | bootstrap Chiron project + methodology pin | setup-project (pre-BMAD bootstrap) |
| WU.BRAINSTORMING | brainstorming | ideation session with technique fan-out | brainstorming |
| WU.FACILITATION_SESSION | facilitation-session | multi-agent facilitation panel | party-mode |
| WU.PRODUCT_BRIEF | product-brief | product brief artifact lifecycle | create-product-brief |
| WU.RESEARCH | research | domain/market/technical research artifacts | domain-research, market-research, technical-research |
| WU.PRD | prd | PRD creation/edit/validation lifecycle | create-prd, edit-prd, validate-prd |
| WU.UX_DESIGN | ux-design | UX planning artifacts | create-ux-design |
| WU.IMPLEMENTATION_READINESS | implementation-readiness | readiness quality gate artifacts | check-implementation-readiness |
| WU.ARCHITECTURE | architecture | architecture decision artifacts | create-architecture |
| WU.BACKLOG | backlog | epics/stories planning artifacts | create-epics-and-stories |
| WU.STORY | story | implementation unit through review/test | create-story, dev-story, code-review, quick-dev |
| WU.CHANGE_PROPOSAL | change-proposal | major course-correction proposals | correct-course |
| WU.RETROSPECTIVE | retrospective | retrospectives and lessons | retrospective |
| WU.SPRINT_PLAN | sprint-plan | sprint plan/status artifacts | sprint-planning, sprint-status |
| WU.TECH_SPEC | tech-spec | fast technical specification artifact | quick-spec |
| WU.PROJECT_CONTEXT | project-context | brownfield context docs and guidance | document-project, generate-project-context |
| WU.TEST_AUTOMATION | test-automation | test automation generation artifacts | qa-automate, testarch-automate |
| WU.TEST_ARCHITECTURE | test-architecture | ATDD/test architecture artifacts | testarch-atdd |
| WU.CI_QUALITY | ci-quality | CI/CD quality pipeline artifacts | testarch-ci |
| WU.TEST_FRAMEWORK | test-framework | framework setup artifacts | testarch-framework |
| WU.NFR_ASSESSMENT | nfr-assessment | NFR evidence and assessment | testarch-nfr |
| WU.LEARNING_TRACK | learning-track | multi-session teaching state | teach-me-testing |
| WU.TEST_DESIGN | test-design | test design plans and outputs | testarch-test-design |
| WU.TEST_REVIEW | test-review | test quality review outputs | testarch-test-review |
| WU.TEST_TRACEABILITY | test-traceability | requirements-to-tests trace matrices | testarch-trace |
| WU.DESIGN_FACILITATION | design-facilitation | design-thinking artifacts | design-thinking |
| WU.STRATEGY_FACILITATION | strategy-facilitation | innovation strategy artifacts | innovation-strategy |
| WU.PROBLEM_SOLVING | problem-solving | structured problem-solving artifacts | problem-solving |
| WU.STORYTELLING | storytelling | narrative/story artifacts | storytelling |

## 2) Workflow -> Work Unit + Transition Map (Exhaustive)

| workflow | module | workUnitRef | transition |
|---|---|---|---|
| setup-project | chiron-bootstrap | WU.SETUP | `__absent__ -> done` |
| brainstorming | core | WU.BRAINSTORMING | `draft -> done` |
| party-mode | core | WU.FACILITATION_SESSION | `draft -> done` |
| create-product-brief | bmm | WU.PRODUCT_BRIEF | `draft -> done` |
| domain-research | bmm | WU.RESEARCH | `draft -> done` |
| market-research | bmm | WU.RESEARCH | `draft -> done` |
| technical-research | bmm | WU.RESEARCH | `draft -> done` |
| create-prd | bmm | WU.PRD | `draft -> done` |
| edit-prd | bmm | WU.PRD | `done -> review` |
| validate-prd | bmm | WU.PRD | `done -> review` |
| create-ux-design | bmm | WU.UX_DESIGN | `draft -> done` |
| check-implementation-readiness | bmm | WU.IMPLEMENTATION_READINESS | `draft -> done` |
| create-architecture | bmm | WU.ARCHITECTURE | `draft -> done` |
| create-epics-and-stories | bmm | WU.BACKLOG | `draft -> done` |
| code-review | bmm | WU.STORY | `review -> review` |
| correct-course | bmm | WU.CHANGE_PROPOSAL | `draft -> done` |
| create-story | bmm | WU.STORY | `__absent__ -> draft` |
| dev-story | bmm | WU.STORY | `ready -> review` |
| retrospective | bmm | WU.RETROSPECTIVE | `draft -> done` |
| sprint-planning | bmm | WU.SPRINT_PLAN | `draft -> done` |
| sprint-status | bmm | WU.SPRINT_PLAN | `done -> done` |
| quick-dev | bmm | WU.STORY | `ready -> review` |
| quick-spec | bmm | WU.TECH_SPEC | `draft -> done` |
| document-project | bmm | WU.PROJECT_CONTEXT | `draft -> done` |
| generate-project-context | bmm | WU.PROJECT_CONTEXT | `draft -> done` |
| qa-automate | bmm | WU.TEST_AUTOMATION | `draft -> done` |
| testarch-atdd | tea | WU.TEST_ARCHITECTURE | `draft -> done` |
| testarch-automate | tea | WU.TEST_AUTOMATION | `draft -> done` |
| testarch-ci | tea | WU.CI_QUALITY | `draft -> done` |
| testarch-framework | tea | WU.TEST_FRAMEWORK | `draft -> done` |
| testarch-nfr | tea | WU.NFR_ASSESSMENT | `draft -> done` |
| teach-me-testing | tea | WU.LEARNING_TRACK | `draft -> done` |
| testarch-test-design | tea | WU.TEST_DESIGN | `draft -> done` |
| testarch-test-review | tea | WU.TEST_REVIEW | `draft -> done` |
| testarch-trace | tea | WU.TEST_TRACEABILITY | `draft -> done` |
| design-thinking | cis | WU.DESIGN_FACILITATION | `draft -> done` |
| innovation-strategy | cis | WU.STRATEGY_FACILITATION | `draft -> done` |
| problem-solving | cis | WU.PROBLEM_SOLVING | `draft -> done` |
| storytelling | cis | WU.STORYTELLING | `draft -> done` |

## 3) Configuration Rule for All Step Definitions

For every workflow definition and every step config:

- Include/resolve `context.workUnitRef` from workflow-level `workUnitRef`.
- Gate checks consume `context.workUnitRef` + transition edge (`fromState`, `toState`).
- Invoke behavior:
  - technique/facilitation loops: `bindingMode=same_work_unit`
  - entity fan-out: `bindingMode=child_work_units`
