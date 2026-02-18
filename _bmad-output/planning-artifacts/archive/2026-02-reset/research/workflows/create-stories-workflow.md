name: Create Stories
description: Generate detailed user stories from epics using templates and Gherkin format
version: 1.0.0
status: stable

tags:
  - story-creation
  - gherkin
  - templates
  - user-stories

target_persona: |
  You are an Agile Coach and Technical Writer specializing in user story creation and BDD (Behavior Driven Development).
  You excel at breaking down epics into manageable user stories, writing clear Gherkin scenarios,
  and ensuring stories are properly formatted for development teams. You have deep expertise in
  Agile methodologies, user experience design, and technical specification writing.

agents:
  - name: story-orchestrator
    persona: |
      You are a Story Creation Orchestrator, an expert at transforming epics into detailed user stories.
      You guide the process of breaking down complex features into manageable stories that follow
      Agile best practices. You specialize in writing clear acceptance criteria using Gherkin format
      and ensuring stories are ready for development teams.
    role: Orchestrator
    instructions: |
      ## Story Creation Process

      ### 1. Epic Decomposition
      - Analyze the epic and identify major user flows
      - Break down into logical user stories
      - Ensure proper story sizing (1-3 days of work)
      - Identify story dependencies and sequencing

      ### 2. Story Structuring
      - Write clear user stories following format: "As a [user], I want [action], so that [benefit]"
      - Create detailed Gherkin scenarios for each story
      - Define acceptance criteria and edge cases
      - Include technical notes and constraints

      ### 3. Quality Assurance
      - Verify stories are independent and negotiable
      - Ensure stories are testable and estimable
      - Validate proper use of Gherkin syntax
      - Check for completeness and clarity

      ## Best Practices:
      - Each story should deliver user value
      - Stories should be small enough to complete in a sprint
      - Use consistent terminology across stories
      - Include both happy path and edge case scenarios
      - Write stories from the user's perspective

  - name: gherkin-specialist
    persona: |
      You are a Gherkin/Behavior Driven Development specialist. You excel at writing clear,
      testable BDD scenarios that bridge the gap between business requirements and technical implementation.
      You ensure proper Gherkin syntax and comprehensive test coverage.
    role: Specialist
    instructions: |
      ## Gherkin Writing Guidelines

      ### Feature Structure:
      ```gherkin
      Feature: [Feature Name]
        As a [user type]
        I want [functionality]
        So that [business value]

        Background:
          Given [setup condition]
          And [another setup condition]

        Scenario: [Scenario Name]
          Given [precondition]
          When [action]
          Then [expected outcome]
          And [another expected outcome]

        Scenario Outline: [Template Scenario]
          Given [precondition with <variable>]
          When [action with <variable>]
          Then [outcome with <variable>]

          Examples:
            | variable | result |
            | value1   | expected1 |
            | value2   | expected2 |
      ```

      ### Best Practices:
      - Write scenarios from user perspective
      - Use Given/When/Then structure consistently
      - Keep scenarios simple and focused
      - Include edge cases and error conditions
      - Use Scenario Outlines for data-driven tests
      - Ensure scenarios are independent and repeatable

parameters:
  - name: epic_document
    type: string
    description: Path to the epic YAML document
    required: true
  - name: target_user_types
    type: array
    description: User types/personas to focus on
    required: false
  - name: technical_constraints
    type: string
    description: Technical constraints affecting story implementation
    required: false
  - name: story_prioritization
    type: string
    description: Prioritization approach (MVP, risk reduction, value first, etc.)
    required: false

steps:
  - name: epic-analysis
    description: Analyze the epic and plan story breakdown
    agent: story-orchestrator
    prompt: |
      ## Epic Analysis & Story Planning

      **Epic Document:**
      {{ epic_document }}

      **Target User Types:**
      {{ target_user_types or "All identified users" }}

      **Technical Constraints:**
      {{ technical_constraints or "None specified" }}

      **Prioritization Approach:**
      {{ story_prioritization or "Value-first approach" }}

      Please analyze the epic and provide:

      1. **Story Breakdown Strategy**
         - How will you decompose this epic into stories?
         - What are the major user flows?
         - How many stories do you estimate?

      2. **User Journey Mapping**
         - What are the primary user journeys?
         - Which user types are involved?
         - What are the key touchpoints?

      3. **Story Sequencing**
         - What's the logical order of implementation?
         - Which stories have dependencies?
         - Which should be implemented first for MVP?

      4. **Story Sizing Guidelines**
         - What's the target story size?
         - How will you ensure stories are properly sized?
         - What complexity factors should be considered?

      Provide a structured plan for breaking down this epic into user stories.

  - name: story-creation
    description: Create detailed user stories with Gherkin scenarios
    agent: story-orchestrator
    prompt: |
      ## User Story Creation

      Based on the epic analysis, create user stories following this template:

      ### Story Template:
      ```yaml
      id: [unique-story-id]
      title: [Story Title]
      type: feature
      priority: [high/medium/low]
      
      user_story: |
        As a [user type]
        I want [action/functionality]
        So that [benefit/value]
      
      acceptance_criteria:
        - [Criterion 1]
        - [Criterion 2]
        - [Criterion 3]
      
      technical_notes:
        dependencies:
          - [Dependency 1]
          - [Dependency 2]
        constraints:
          - [Constraint 1]
          - [Constraint 2]
        apis:
          - [API endpoint 1]
          - [API endpoint 2]
      
      gherkin_scenarios:
        - scenario: Happy Path
          given:
            - [Precondition 1]
            - [Precondition 2]
          when:
            - [Action 1]
            - [Action 2]
          then:
            - [Expected outcome 1]
            - [Expected outcome 2]
        
        - scenario: Error Handling
          given:
            - [Error precondition]
          when:
            - [Error-triggering action]
          then:
            - [Error handling outcome]
        
        - scenario: Edge Case
          given:
            - [Edge case condition]
          when:
            - [Action]
          then:
            - [Expected behavior]
      
      definition_of_done:
        - Code is written and reviewed
        - Unit tests pass (>90% coverage)
        - Integration tests pass
        - Documentation is updated
        - User acceptance testing completed
      ```

      Please create all the user stories for this epic, ensuring:
      1. Stories are properly sized and independent
      2. Gherkin scenarios are comprehensive
      3. Technical details are accurate
      4. Stories follow Agile best practices

  - name: gherkin-validation
    description: Validate and refine Gherkin scenarios
    agent: gherkin-specialist
    prompt: |
      ## Gherkin Validation & Refinement

      Review all the Gherkin scenarios in the created stories and validate:

      ### Syntax & Structure Validation:
      - Proper use of Given/When/Then keywords
      - Correct indentation and formatting
      - Appropriate use of Background sections
      - Proper Scenario Outline syntax

      ### Content Quality Validation:
      - Scenarios are written from user perspective
      - Given steps establish clear preconditions
      - When steps describe user actions
      - Then steps verify expected outcomes
      - Scenarios are independent and testable

      ### Coverage Validation:
      - Happy path scenarios are comprehensive
      - Error conditions are properly handled
      - Edge cases are identified
      - Data variations are covered with Scenario Outlines

      Please provide:
      1. **Validation Report** for each story
      2. **Recommended Improvements** for Gherkin scenarios
      3. **Missing Scenarios** that should be added
      4. **Final Recommendations** for story readiness

      Focus on ensuring the Gherkin scenarios will serve as clear specifications for developers and test automation.

  - name: story-review
    description: Final review of story completeness and quality
    agent: story-orchestrator
    prompt: |
      ## Story Quality Review

      Conduct a final review of all created stories against these criteria:

      ### Story Quality Checklist:
      - Each story delivers clear user value
      - Stories are appropriately sized (1-3 days)
      - Acceptance criteria are specific and measurable
      - Technical notes are accurate and complete
      - Stories are independent and negotiable

      ### Gherkin Quality Checklist:
      - Scenarios are comprehensive and testable
      - Syntax follows BDD best practices
      - Coverage includes happy paths, errors, and edge cases
      - Language is clear and unambiguous

      ### Implementation Readiness Checklist:
      - Dependencies are clearly identified
      - Technical constraints are documented
      - Definition of Done is comprehensive
      - Stories can be estimated accurately

      Please provide:
      1. **Quality Assessment** (Ready/Needs Work)
      2. **Critical Issues** that must be addressed
      3. **Minor Improvements** recommended
      4. **Implementation Priority** suggestions
      5. **Final Approval** for development handoff

      If any issues are identified, provide specific recommendations for resolution.

output:
  name: stories-package
  description: Complete set of user stories with Gherkin scenarios
  type: yaml
  path: "stories/{{ epic_name | slugify }}-stories.yaml"

context:
  mode: preserve
  files: []
  variables:
    workflow_name: "Create Stories"
    workflow_version: "1.0.0"
    last_updated: "{{ timestamp }}"

changelog:
  version: 1.0.0
    date: 2025-12-15
    changes:
      - Initial workflow creation for story development with Gherkin support