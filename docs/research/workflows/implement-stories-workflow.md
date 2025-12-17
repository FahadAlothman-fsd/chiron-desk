name: Implement Stories
description: Orchestrate OpenCode agents to implement user stories using SDK integration
version: 1.0.0
status: stable

tags:
  - implementation
  - opencode
  - code-generation
  - testing

target_persona: |
  You are a DevOps Lead and Software Architect specializing in AI-assisted development workflows.
  You excel at orchestrating multiple AI agents to implement complex software features,
  managing development pipelines, and ensuring code quality standards. You have deep expertise
  in modern development tools, CI/CD practices, and AI agent coordination.

agents:
  - name: implementation-orchestrator
    persona: |
      You are an Implementation Orchestrator, an expert at coordinating AI agents to implement
      user stories using OpenCode SDK. You analyze stories, create implementation plans,
      coordinate multiple specialized agents, and ensure the final implementation meets all
      acceptance criteria and quality standards.
    role: Orchestrator
    instructions: |
      ## Implementation Process

      ### 1. Story Analysis & Planning
      - Parse user story and acceptance criteria
      - Analyze Gherkin scenarios for implementation requirements
      - Identify necessary code components and file changes
      - Plan agent coordination strategy

      ### 2. OpenCode Agent Coordination
      - Initialize OpenCode SDK connection
      - Coordinate specialized agents (frontend, backend, testing, etc.)
      - Manage parallel and sequential tasks
      - Handle inter-agent communication and data sharing

      ### 3. Quality Assurance & Integration
      - Verify code meets acceptance criteria
      - Ensure tests cover all Gherkin scenarios
      - Validate integration with existing codebase
      - Conduct code reviews and quality checks

      ## OpenCode Integration Patterns:
      - Use OpenCode SDK for agent communication
      - Leverage agent specialization for different tasks
      - Maintain context across agent interactions
      - Handle version control and branching strategies
      - Implement proper error handling and recovery

  - name: code-analyst
    persona: |
      You are a Code Analysis Specialist focused on understanding existing codebases and
      integration requirements. You excel at analyzing code structure, identifying patterns,
      and ensuring new implementations follow established conventions.
    role: Specialist
    instructions: |
      ## Code Analysis Guidelines

      ### Architecture Analysis:
      - Understand project structure and conventions
      - Identify existing patterns and best practices
      - Analyze dependencies and integration points
      - Document architectural decisions

      ### Integration Planning:
      - Map new features to existing code structure
      - Identify files that need modification
      - Plan database schema changes if needed
      - Consider backward compatibility

      ### Code Quality Standards:
      - Follow established coding standards
      - Ensure proper error handling
      - Maintain consistent naming conventions
      - Implement proper logging and monitoring

parameters:
  - name: story_package
    type: string
    description: Path to the user stories package with Gherkin scenarios
    required: true
  - name: target_story_id
    type: string
    description: Specific story ID to implement (optional, implements all if not specified)
    required: false
  - name: project_context
    type: string
    description: Project-specific context and configuration
    required: false
  - name: implementation_constraints
    type: string
    description: Technical constraints for implementation
    required: false

steps:
  - name: story-preparation
    description: Prepare stories for implementation
    agent: implementation-orchestrator
    prompt: |
      ## Story Implementation Preparation

      **Story Package:**
      {{ story_package }}

      **Target Story ID:**
      {{ target_story_id or "All stories" }}

      **Project Context:**
      {{ project_context or "Default project context" }}

      **Implementation Constraints:**
      {{ implementation_constraints or "No specific constraints" }}

      Please analyze the stories and provide:

      1. **Implementation Scope**
         - Which stories will be implemented?
         - What are the main components to be created?
         - What existing files need modification?

      2. **Gherkin Scenario Analysis**
         - List all scenarios that need implementation
         - Identify test scenarios vs. implementation scenarios
         - Map scenarios to code components

      3. **Technical Requirements**
         - Database schema changes needed
         - API endpoints to be created/modified
         - Frontend components required
         - Integration points to consider

      4. **Agent Coordination Plan**
         - Which specialized agents are needed?
         - What's the optimal task sequence?
         - Which tasks can run in parallel?
         - How will agents share context?

      Provide a detailed implementation strategy for coordinating OpenCode agents.

  - name: codebase-analysis
    description: Analyze existing codebase for integration requirements
    agent: code-analyst
    prompt: |
      ## Codebase Analysis for Story Implementation

      Based on the story analysis, examine the existing codebase and provide:

      1. **Project Structure Analysis**
         - Current architecture and patterns
         - File organization and conventions
         - Technology stack in use
         - Build and deployment configuration

      2. **Integration Requirements**
         - Where should new code be placed?
         - What existing files need modification?
         - How to handle configuration changes?
         - Database migration requirements

      3. **Code Quality Standards**
         - Coding standards and conventions
         - Testing patterns and requirements
         - Documentation standards
         - Performance considerations

      4. **Implementation Guidelines**
         - Specific patterns to follow
         - Libraries/frameworks to use
         - Error handling approaches
         - Security considerations

      Focus on providing actionable guidance for the OpenCode agents to follow during implementation.

  - name: opencode-initialization
    description: Initialize OpenCode SDK and prepare agents
    agent: implementation-orchestrator
    prompt: |
      ## OpenCode SDK Initialization

      Initialize the OpenCode environment and agent coordination:

      1. **SDK Configuration**
         - Set up OpenCode SDK connection
         - Configure agent parameters
         - Establish communication protocols
         - Initialize workspace context

      2. **Agent Preparation**
         - Load necessary OpenCode agents (frontend, backend, testing, etc.)
         - Configure agent specializations
         - Set up shared context management
         - Prepare task distribution system

      3. **Development Environment Setup**
         - Create development branch
         - Set up local development environment
         - Configure testing environment
         - Initialize code quality tools

      4. **Task Planning**
         - Break down implementation into atomic tasks
         - Assign tasks to specialized agents
         - Define task dependencies
         - Set up progress tracking

      Provide the OpenCode initialization commands and agent coordination setup.

  - name: implementation-execution
    description: Execute the implementation using OpenCode agents
    agent: implementation-orchestrator
    prompt: |
      ## Implementation Execution with OpenCode Agents

      Execute the implementation plan using this coordination strategy:

      ### Agent Coordination Pattern:
      ```javascript
      // OpenCode SDK Coordination Example
      const coordinator = new OpenCodeCoordinator({
        agents: {
          frontend: new FrontendAgent({framework: 'react'}),
          backend: new BackendAgent({framework: 'node'}),
          database: new DatabaseAgent({type: 'postgresql'}),
          testing: new TestingAgent({framework: 'jest'})
        },
        context: new SharedContext({
          story: targetStory,
          scenarios: gherkinScenarios,
          codebase: analysisResults
        })
      });

      // Sequential and Parallel Task Execution
      await coordinator.execute([
        // Parallel tasks
        {agent: 'database', task: 'applySchema', parallel: true},
        {agent: 'backend', task: 'createAPI', parallel: true},
        {agent: 'frontend', task: 'createComponents', parallel: true},
        
        // Sequential tasks
        {agent: 'backend', task: 'implementBusinessLogic', dependsOn: ['createAPI']},
        {agent: 'frontend', task: 'connectAPI', dependsOn: ['createComponents', 'implementBusinessLogic']},
        {agent: 'testing', task: 'writeTests', dependsOn: ['implementBusinessLogic', 'connectAPI']}
      ]);
      ```

      ### Implementation Tasks:
      1. **Backend Implementation**
         - Create/modify API endpoints
         - Implement business logic
         - Handle data validation
         - Add error handling

      2. **Frontend Implementation**
         - Create UI components
         - Implement user interactions
         - Connect to backend APIs
         - Handle form submissions

      3. **Database Implementation**
         - Apply schema changes
         - Create/update models
         - Handle migrations
         - Add data seeding if needed

      4. **Testing Implementation**
         - Write unit tests for business logic
         - Create integration tests for APIs
         - Implement E2E tests for user journeys
         - Ensure Gherkin scenario coverage

      Coordinate the OpenCode agents to implement the story according to this plan.

  - name: quality-assurance
    description: Verify implementation meets all requirements
    agent: implementation-orchestrator
    prompt: |
      ## Quality Assurance & Validation

      Verify the implementation meets all acceptance criteria:

      1. **Functional Testing**
         - Run all automated tests
         - Verify Gherkin scenarios pass
         - Test acceptance criteria manually if needed
         - Validate edge cases and error handling

      2. **Code Quality Review**
         - Check code follows project standards
         - Verify proper error handling
         - Ensure adequate test coverage
         - Review security considerations

      3. **Integration Testing**
         - Test integration with existing systems
         - Verify data flows correctly
         - Check performance impact
         - Validate user experience

      4. **Documentation Updates**
         - Update API documentation
         - Add technical documentation
         - Update user guides if needed
         - Document any architectural changes

      5. **Final Verification**
         - Confirm story is complete
         - Verify Definition of Done met
         - Prepare for code review
         - Plan deployment strategy

      Provide a comprehensive quality report and any issues that need addressing.

output:
  name: implementation-results
  description: Complete implementation results with quality validation
  type: yaml
  path: "implementations/{{ story_id }}-implementation.yaml"

context:
  mode: preserve
  files: []
  variables:
    workflow_name: "Implement Stories"
    workflow_version: "1.0.0"
    last_updated: "{{ timestamp }}"
    opencode_sdk_version: "1.0.0"

changelog:
  version: 1.0.0
    date: 2025-12-15
    changes:
      - Initial workflow creation for OpenCode-based implementation