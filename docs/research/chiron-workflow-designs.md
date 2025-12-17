# Chiron Workflow Designs for Second Semester
# Database-driven workflow step configurations for Epic/Story/Implementation workflows

## Workflow 1: Create Epic Workflow

### Database Records Structure:

**Workflow Record:**
```sql
INSERT INTO workflows (
  name, display_name, description, tags, metadata
) VALUES (
  'create-epic',
  'Create Epic',
  'Transform business requirements into well-structured epics with validation and acceptance criteria',
  '{"phase": "1", "type": "method", "track": "greenfield", "complexity": "moderate"}',
  '{
    "agentId": "[analyst-agent-uuid]",
    "icon": "target",
    "color": "#3B82F6",
    "estimatedDuration": "45-60 min",
    "isStandalone": true,
    "requiresProjectContext": false,
    "inputSchema": {
      "business_requirement": {
        "type": "string",
        "required": true,
        "description": "Raw business requirement or feature request"
      },
      "stakeholder_context": {
        "type": "string", 
        "required": false,
        "description": "Information about stakeholders and their needs"
      },
      "technical_constraints": {
        "type": "string",
        "required": false,
        "description": "Known technical limitations or constraints"
      }
    }
  }'
);
```

**Workflow Steps:**

**Step 1: Requirements Analysis**
```sql
INSERT INTO workflow_steps (
  workflow_id, step_number, goal, step_type, config, next_step_number
) VALUES (
  [workflow-uuid],
  1,
  'Analyze business requirements and gather additional context',
  'ask-user-chat',
  '{
    "agentId": "[analyst-agent-uuid]",
    "initialMessage": "I''ll help you analyze this business requirement and create a comprehensive epic. Let me start by reviewing what you''ve provided and asking some clarifying questions.",
    "tools": [
      {
        "name": "analyze_requirements",
        "toolType": "ax-generation",
        "requiredVariables": ["business_requirement", "stakeholder_context", "technical_constraints"],
        "requiresApproval": true,
        "axSignature": {
          "input": [
            {
              "name": "business_requirement",
              "type": "string",
              "source": "variable",
              "variableName": "business_requirement",
              "description": "The main business requirement"
            },
            {
              "name": "stakeholder_context", 
              "type": "string",
              "source": "variable",
              "variableName": "stakeholder_context",
              "description": "Information about stakeholders"
            },
            {
              "name": "technical_constraints",
              "type": "string", 
              "source": "variable",
              "variableName": "technical_constraints",
              "description": "Technical limitations"
            }
          ],
          "output": [
            {
              "name": "clarification_questions",
              "type": "array",
              "description": "Questions to ask the user"
            },
            {
              "name": "stakeholder_analysis",
              "type": "object", 
              "description": "Analysis of key stakeholders"
            },
            {
              "name": "business_value_assessment",
              "type": "string",
              "description": "Assessment of business value"
            },
            {
              "name": "success_criteria",
              "type": "array",
              "description": "Measurable success criteria"
            },
            {
              "name": "risk_assessment",
              "type": "object",
              "description": "Main risks and uncertainties"
            }
          ],
          "strategy": "ChainOfThought"
        }
      }
    ],
    "completionCondition": {
      "type": "all-tools-approved",
      "requiredTools": ["analyze_requirements"]
    },
    "outputVariables": {
      "clarification_questions": "approval_states.analyze_requirements.value.clarification_questions",
      "stakeholder_analysis": "approval_states.analyze_requirements.value.stakeholder_analysis",
      "business_value_assessment": "approval_states.analyze_requirements.value.business_value_assessment",
      "success_criteria": "approval_states.analyze_requirements.value.success_criteria",
      "risk_assessment": "approval_states.analyze_requirements.value.risk_assessment"
    }
  }',
  2
);
```

**Step 2: Epic Structuring**
```sql
INSERT INTO workflow_steps (
  workflow_id, step_number, goal, step_type, config, next_step_number
) VALUES (
  [workflow-uuid],
  2,
  'Create comprehensive epic structure with acceptance criteria',
  'ask-user-chat',
  '{
    "agentId": "[analyst-agent-uuid]",
    "initialMessage": "Now I''ll create a detailed epic structure based on the requirements analysis. I''ll include all the essential elements for a well-defined epic.",
    "tools": [
      {
        "name": "create_epic_structure",
        "toolType": "ax-generation", 
        "requiredVariables": ["business_requirement", "clarification_questions", "stakeholder_analysis", "business_value_assessment", "success_criteria", "risk_assessment"],
        "requiresApproval": true,
        "axSignature": {
          "input": [
            {
              "name": "business_requirement",
              "type": "string",
              "source": "variable", 
              "variableName": "business_requirement",
              "description": "Original business requirement"
            },
            {
              "name": "analysis_results",
              "type": "object",
              "source": "variable",
              "variableName": "analysis_summary",
              "description": "Combined analysis results from step 1"
            }
          ],
          "output": [
            {
              "name": "epic_structure",
              "type": "object",
              "description": "Complete epic structure with all fields"
            }
          ],
          "strategy": "ChainOfThought"
        }
      }
    ],
    "completionCondition": {
      "type": "all-tools-approved",
      "requiredTools": ["create_epic_structure"]
    },
    "outputVariables": {
      "epic_structure": "approval_states.create_epic_structure.value.epic_structure"
    }
  }',
  3
);
```

**Step 3: Validation**
```sql
INSERT INTO workflow_steps (
  workflow_id, step_number, goal, step_type, config, next_step_number
) VALUES (
  [workflow-uuid],
  3,
  'Validate epic completeness and feasibility',
  'ask-user-chat',
  '{
    "agentId": "[analyst-agent-uuid]", 
    "initialMessage": "Let me validate the epic structure to ensure it meets all quality standards and is ready for development planning.",
    "tools": [
      {
        "name": "validate_epic",
        "toolType": "ax-generation",
        "requiredVariables": ["epic_structure"],
        "requiresApproval": true,
        "axSignature": {
          "input": [
            {
              "name": "epic_structure",
              "type": "object",
              "source": "variable",
              "variableName": "epic_structure", 
              "description": "The epic structure to validate"
            }
          ],
          "output": [
            {
              "name": "validation_report",
              "type": "object",
              "description": "Comprehensive validation results"
            },
            {
              "name": "recommendations",
              "type": "array",
              "description": "Improvement recommendations"
            },
            {
              "name": "final_assessment",
              "type": "string",
              "description": "Ready/Needs work assessment"
            }
          ],
          "strategy": "ChainOfThought"
        }
      }
    ],
    "completionCondition": {
      "type": "all-tools-approved",
      "requiredTools": ["validate_epic"]
    },
    "outputVariables": {
      "validation_report": "approval_states.validate_epic.value.validation_report",
      "recommendations": "approval_states.validate_epic.value.recommendations", 
      "final_assessment": "approval_states.validate_epic.value.final_assessment"
    }
  }',
  4
);
```

**Step 4: Save Epic**
```sql
INSERT INTO workflow_steps (
  workflow_id, step_number, goal, step_type, config
) VALUES (
  [workflow-uuid],
  4,
  'Save the epic document and create database records',
  'execute-action',
  '{
    "actions": [
      {
        "type": "set-variable",
        "config": {
          "variable": "epic_saved",
          "value": true
        }
      },
      {
        "type": "database",
        "config": {
          "table": "epics",
          "operation": "insert",
          "columns": {
            "name": "{{epic_structure.name}}",
            "description": "{{epic_structure.description}}",
            "project_id": "{{project_id}}",
            "business_objectives": "{{epic_structure.business_objectives}}",
            "acceptance_criteria": "{{epic_structure.acceptance_criteria}}",
            "success_metrics": "{{epic_structure.success_metrics}}",
            "estimated_effort": "{{epic_structure.estimated_effort}}",
            "validation_report": "{{validation_report}}"
          }
        }
      }
    ],
    "executionMode": "sequential",
    "requiresUserConfirmation": true
  }'
);
```

---

## Workflow 2: Create Stories Workflow

**Workflow Record:**
```sql
INSERT INTO workflows (
  name, display_name, description, tags, metadata
) VALUES (
  'create-stories',
  'Create Stories',
  'Break down epics into detailed user stories with Gherkin scenarios and technical specifications',
  '{"phase": "3", "type": "method", "track": "greenfield", "complexity": "moderate"}',
  '{
    "agentId": "[sm-agent-uuid]",
    "icon": "file-text",
    "color": "#10B981", 
    "estimatedDuration": "60-90 min",
    "isStandalone": false,
    "requiresProjectContext": true,
    "inputSchema": {
      "epic_document": {
        "type": "string",
        "required": true,
        "description": "Path or content of epic document"
      },
      "target_user_types": {
        "type": "array",
        "items": {"type": "string"},
        "required": false,
        "description": "User types/personas to focus on"
      },
      "story_prioritization": {
        "type": "string",
        "required": false,
        "description": "Prioritization approach (MVP, risk reduction, value first)"
      }
    }
  }'
);
```

**Workflow Steps:**

**Step 1: Epic Analysis & Planning**
```sql
INSERT INTO workflow_steps (
  workflow_id, step_number, goal, step_type, config, next_step_number
) VALUES (
  [workflow-uuid],
  1,
  'Analyze epic and create story breakdown strategy',
  'ask-user-chat',
  '{
    "agentId": "[sm-agent-uuid]",
    "initialMessage": "I''ll analyze this epic and create a comprehensive plan for breaking it down into manageable user stories.",
    "tools": [
      {
        "name": "analyze_epic_for_stories",
        "toolType": "ax-generation",
        "requiredVariables": ["epic_document", "target_user_types", "story_prioritization"],
        "requiresApproval": true,
        "axSignature": {
          "input": [
            {
              "name": "epic_content",
              "type": "string",
              "source": "variable",
              "variableName": "epic_document",
              "description": "The epic document content"
            },
            {
              "name": "target_user_types",
              "type": "array",
              "source": "variable",
              "variableName": "target_user_types",
              "description": "User types to focus on"
            }
          ],
          "output": [
            {
              "name": "story_breakdown_strategy",
              "type": "object",
              "description": "Strategy for breaking down epic into stories"
            },
            {
              "name": "user_journey_mapping",
              "type": "array",
              "description": "Primary user journeys identified"
            },
            {
              "name": "story_sequencing",
              "type": "object",
              "description": "Logical order of implementation"
            },
            {
              "name": "estimated_story_count",
              "type": "number",
              "description": "Estimated number of stories"
            }
          ],
          "strategy": "ChainOfThought"
        }
      }
    ],
    "completionCondition": {
      "type": "all-tools-approved",
      "requiredTools": ["analyze_epic_for_stories"]
    },
    "outputVariables": {
      "story_breakdown_strategy": "approval_states.analyze_epic_for_stories.value.story_breakdown_strategy",
      "user_journey_mapping": "approval_states.analyze_epic_for_stories.value.user_journey_mapping",
      "story_sequencing": "approval_states.analyze_epic_for_stories.value.story_sequencing",
      "estimated_story_count": "approval_states.analyze_epic_for_stories.value.estimated_story_count"
    }
  }',
  2
);
```

**Step 2: Story Creation with Gherkin**
```sql
INSERT INTO workflow_steps (
  workflow_id, step_number, goal, step_type, config, next_step_number
) VALUES (
  [workflow-uuid],
  2,
  'Create detailed user stories with comprehensive Gherkin scenarios',
  'ask-user-chat',
  '{
    "agentId": "[sm-agent-uuid]",
    "initialMessage": "Now I''ll create the user stories based on the analysis, including detailed Gherkin scenarios for testing.",
    "tools": [
      {
        "name": "create_user_stories",
        "toolType": "ax-generation",
        "requiredVariables": ["story_breakdown_strategy", "user_journey_mapping", "story_sequencing"],
        "requiresApproval": true,
        "axSignature": {
          "input": [
            {
              "name": "epic_analysis",
              "type": "object",
              "source": "variable",
              "variableName": "epic_analysis_summary",
              "description": "Summary of epic analysis results"
            }
          ],
          "output": [
            {
              "name": "user_stories",
              "type": "array",
              "description": "Array of complete user stories with Gherkin scenarios"
            }
          ],
          "strategy": "ChainOfThought"
        }
      }
    ],
    "completionCondition": {
      "type": "all-tools-approved",
      "requiredTools": ["create_user_stories"]
    },
    "outputVariables": {
      "user_stories": "approval_states.create_user_stories.value.user_stories"
    }
  }',
  3
);
```

**Step 3: Gherkin Validation**
```sql
INSERT INTO workflow_steps (
  workflow_id, step_number, goal, step_type, config, next_step_number
) VALUES (
  [workflow-uuid],
  3,
  'Validate Gherkin scenarios for syntax and completeness',
  'ask-user-chat',
  '{
    "agentId": "[sm-agent-uuid]",
    "initialMessage": "Let me validate all the Gherkin scenarios to ensure they follow BDD best practices and provide comprehensive test coverage.",
    "tools": [
      {
        "name": "validate_gherkin",
        "toolType": "ax-generation",
        "requiredVariables": ["user_stories"],
        "requiresApproval": true,
        "axSignature": {
          "input": [
            {
              "name": "stories_with_gherkin",
              "type": "array",
              "source": "variable",
              "variableName": "user_stories",
              "description": "User stories with Gherkin scenarios to validate"
            }
          ],
          "output": [
            {
              "name": "gherkin_validation_report",
              "type": "object",
              "description": "Comprehensive validation of Gherkin scenarios"
            },
            {
              "name": "recommended_improvements",
              "type": "array",
              "description": "Specific improvements for Gherkin scenarios"
            },
            {
              "name": "missing_scenarios",
              "type": "array",
              "description": "Additional scenarios that should be added"
            }
          ],
          "strategy": "ChainOfThought"
        }
      }
    ],
    "completionCondition": {
      "type": "all-tools-approved",
      "requiredTools": ["validate_gherkin"]
    },
    "outputVariables": {
      "gherkin_validation_report": "approval_states.validate_gherkin.value.gherkin_validation_report",
      "recommended_improvements": "approval_states.validate_gherkin.value.recommended_improvements",
      "missing_scenarios": "approval_states.validate_gherkin.value.missing_scenarios"
    }
  }',
  4
);
```

**Step 4: Save Stories**
```sql
INSERT INTO workflow_steps (
  workflow_id, step_number, goal, step_type, config
) VALUES (
  [workflow-uuid],
  4,
  'Save stories to database with validation results',
  'execute-action',
  '{
    "actions": [
      {
        "type": "database",
        "config": {
          "table": "stories",
          "operation": "insert",
          "columns": {
            "epic_id": "{{epic_id}}",
            "title": "{{story.title}}",
            "user_story": "{{story.user_story}}",
            "acceptance_criteria": "{{story.acceptance_criteria}}",
            "gherkin_scenarios": "{{story.gherkin_scenarios}}",
            "technical_notes": "{{story.technical_notes}}",
            "priority": "{{story.priority}}",
            "estimated_effort": "{{story.estimated_effort}}",
            "validation_report": "{{gherkin_validation_report}}"
          }
        }
      }
    ],
    "executionMode": "sequential",
    "requiresUserConfirmation": true
  }'
);
```

---

## Workflow 3: Story Implementation Workflow

**Workflow Record:**
```sql
INSERT INTO workflows (
  name, display_name, description, tags, metadata
) VALUES (
  'implement-stories',
  'Implement Stories',
  'Orchestrate OpenCode agents to implement user stories using SDK integration',
  '{"phase": "4", "type": "method", "track": "greenfield", "complexity": "enterprise"}',
  '{
    "agentId": "[dev-agent-uuid]",
    "icon": "code",
    "color": "#F59E0B",
    "estimatedDuration": "2-4 hours per story",
    "isStandalone": false,
    "requiresProjectContext": true,
    "inputSchema": {
      "story_package": {
        "type": "string",
        "required": true,
        "description": "Path to the user stories package with Gherkin scenarios"
      },
      "target_story_id": {
        "type": "string",
        "required": false,
        "description": "Specific story ID to implement (optional)"
      },
      "implementation_constraints": {
        "type": "string",
        "required": false,
        "description": "Technical constraints for implementation"
      }
    }
  }'
);
```

**Workflow Steps:**

**Step 1: Implementation Planning**
```sql
INSERT INTO workflow_steps (
  workflow_id, step_number, goal, step_type, config, next_step_number
) VALUES (
  [workflow-uuid],
  1,
  'Plan implementation strategy and coordinate OpenCode agents',
  'ask-user-chat',
  '{
    "agentId": "[dev-agent-uuid]",
    "initialMessage": "I''ll coordinate with OpenCode agents to implement this story. Let me start by analyzing the requirements and creating an implementation plan.",
    "tools": [
      {
        "name": "create_implementation_plan",
        "toolType": "ax-generation",
        "requiredVariables": ["story_package", "target_story_id", "implementation_constraints"],
        "requiresApproval": true,
        "axSignature": {
          "input": [
            {
              "name": "story_details",
              "type": "object",
              "source": "variable",
              "variableName": "selected_story",
              "description": "Details of the story to implement"
            },
            {
              "name": "gherkin_scenarios",
              "type": "array",
              "source": "variable",
              "variableName": "story_scenarios",
              "description": "Gherkin scenarios for the story"
            }
          ],
          "output": [
            {
              "name": "implementation_scope",
              "type": "object",
              "description": "What needs to be implemented"
            },
            {
              "name": "agent_coordination_plan",
              "type": "object",
              "description": "How to coordinate OpenCode agents"
            },
            {
              "name": "task_breakdown",
              "type": "array",
              "description": "Breakdown of implementation tasks"
            }
          ],
          "strategy": "ChainOfThought"
        }
      }
    ],
    "completionCondition": {
      "type": "all-tools-approved",
      "requiredTools": ["create_implementation_plan"]
    },
    "outputVariables": {
      "implementation_scope": "approval_states.create_implementation_plan.value.implementation_scope",
      "agent_coordination_plan": "approval_states.create_implementation_plan.value.agent_coordination_plan",
      "task_breakdown": "approval_states.create_implementation_plan.value.task_breakdown"
    }
  }',
  2
);
```

**Step 2: OpenCode Agent Coordination**
```sql
INSERT INTO workflow_steps (
  workflow_id, step_number, goal, step_type, config, next_step_number
) VALUES (
  [workflow-uuid],
  2,
  'Execute implementation using OpenCode SDK and specialized agents',
  'execute-action',
  '{
    "actions": [
      {
        "type": "set-variable",
        "config": {
          "variable": "opencode_session_started",
          "value": true
        }
      },
      {
        "type": "custom",
        "config": {
          "customToolHandler": "execute_opencode_workflow",
          "workflow_type": "story_implementation",
          "agents": ["frontend", "backend", "database", "testing"],
          "coordination_plan": "{{agent_coordination_plan}}",
          "tasks": "{{task_breakdown}}"
        }
      }
    ],
    "executionMode": "sequential",
    "requiresUserConfirmation": true
  }',
  3
);
```

**Step 3: Quality Assurance**
```sql
INSERT INTO workflow_steps (
  workflow_id, step_number, goal, step_type, config, next_step_number
) VALUES (
  [workflow-uuid],
  3,
  'Verify implementation meets all acceptance criteria',
  'ask-user-chat',
  '{
    "agentId": "[dev-agent-uuid]",
    "initialMessage": "Implementation complete! Now I''ll verify that all acceptance criteria are met and the quality standards are satisfied.",
    "tools": [
      {
        "name": "validate_implementation",
        "toolType": "ax-generation",
        "requiredVariables": ["implementation_results", "story_acceptance_criteria", "gherkin_scenarios"],
        "requiresApproval": true,
        "axSignature": {
          "input": [
            {
              "name": "implementation_output",
              "type": "object",
              "source": "variable",
              "variableName": "opencode_results",
              "description": "Results from OpenCode implementation"
            },
            {
              "name": "acceptance_criteria",
              "type": "array",
              "source": "variable",
              "variableName": "story_acceptance_criteria",
              "description": "Story acceptance criteria"
            }
          ],
          "output": [
            {
              "name": "quality_report",
              "type": "object",
              "description": "Comprehensive quality validation"
            },
            {
              "name": "test_results",
              "type": "object",
              "description": "Results of running tests against Gherkin scenarios"
            },
            {
              "name": "implementation_status",
              "type": "string",
              "description": "Complete/Needs work/final assessment"
            }
          ],
          "strategy": "ChainOfThought"
        }
      }
    ],
    "completionCondition": {
      "type": "all-tools-approved",
      "requiredTools": ["validate_implementation"]
    },
    "outputVariables": {
      "quality_report": "approval_states.validate_implementation.value.quality_report",
      "test_results": "approval_states.validate_implementation.value.test_results",
      "implementation_status": "approval_states.validate_implementation.value.implementation_status"
    }
  }',
  4
);
```

**Step 4: Complete Implementation**
```sql
INSERT INTO workflow_steps (
  workflow_id, step_number, goal, step_type, config
) VALUES (
  [workflow-uuid],
  4,
  'Finalize implementation and update story status',
  'execute-action',
  '{
    "actions": [
      {
        "type": "database",
        "config": {
          "table": "stories",
          "operation": "update",
          "columns": {
            "status": "done",
            "implementation_results": "{{implementation_results}}",
            "quality_report": "{{quality_report}}",
            "completed_at": "{{current_timestamp}}"
          },
          "where": {
            "id": "{{target_story_id}}"
          }
        }
      }
    ],
    "executionMode": "sequential",
    "requiresUserConfirmation": true
  }'
);
```

---

## Implementation Notes:

1. **Agent Mapping**: Each workflow needs to be mapped to appropriate agents in the `AGENT_WORKFLOW_MAP` in the seeds file

2. **OpenCode Integration**: The implementation workflow uses a custom tool handler `execute_opencode_workflow` that would need to be implemented in the action execution system

3. **Variable Management**: All steps use the variable system to pass data between steps

4. **Database Operations**: Workflows directly interact with the database through the `execute-action` step type

5. **Approval System**: Complex operations require user approval through the built-in approval mechanism

This approach aligns with Chiron's database-driven workflow system while providing the sophisticated agent coordination needed for your second semester research goals.