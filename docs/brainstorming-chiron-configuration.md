# Brainstorming Workflow Configuration Guide (Chiron)

**Date:** November 23, 2025  
**Status:** LOCKED (Steps 1-7)  
**Architecture:** Git-Backed Artifact Workbench  
**Patterns:** Blocking Approval Tools, Progressive Tool Unlocking, Workflow Invocation Loop, Parent-Owned Artifacts

---

## 🎯 Architecture Overview

The Brainstorming module is composed of:
1.  **Parent Workflow (`brainstorming`)**: Manages context, selection, and orchestration. Owns the Artifact.
2.  **Technique Workflows (`technique-*`)**: Specialized workflows that facilitate methods (interactive).
3.  **Analysis Workflows (`analysis-*`)**: Specialized workflows that process data (automated).
4.  **Artifact Workbench**: The UI that renders the chat stream and progressive artifact preview.

---

## 🔒 Parent Workflow: `brainstorming`

### **Step 1: Setup & Selection**
**Goal:** Define session scope and select methods.  
**Pattern:** Chat with sequential blocking tools.

```typescript
const step1Config: AskUserChatStepConfig = {
  agentId: "brainstorming-agent",
  initialMessage: "Welcome to the Artifact Workbench! To get started, what specific topic are we brainstorming about today?",
  
  tools: [
    // 1. Set Topic (Blocking)
    {
      name: "set_session_topic",
      toolType: "update_variable",
      requiresApproval: true,
      config: { variable: "session_topic" },
      axSignature: {
        input: [
          { name: "conversation_history", type: "string", source: "context", description: "Chat history" }
        ],
        output: [
          { name: "topic", type: "string", description: "Concise brainstorming topic" },
          { name: "reasoning", type: "string", description: "Why this topic captures user intent", internal: true }
        ],
        strategy: "ChainOfThought"
      }
    },
    
    // 2. Set Goal (Blocking)
    {
      name: "set_stated_goals",
      toolType: "update_variable",
      requiredVariables: ["session_topic"],
      requiresApproval: true,
      config: { variable: "stated_goals" },
      axSignature: {
        input: [
          { name: "conversation_history", type: "string", source: "context", description: "Chat history" },
          { name: "session_topic", type: "string", source: "variable", variableName: "session_topic", description: "The approved topic" }
        ],
        output: [
          { name: "goal", type: "string", description: "Clear success criteria or goal statement" },
          { name: "reasoning", type: "string", description: "Reasoning for this goal formulation", internal: true }
        ],
        strategy: "ChainOfThought"
      }
    },
    
    // 3. Select Techniques (Blocking)
    {
      name: "select_techniques",
      toolType: "ax-generation",
      requiredVariables: ["stated_goals"],
      requiresApproval: true,
      optionsSource: {
        table: "workflows",
        filterBy: { "tags->'type'->>'value'": "technique" },
        outputVariable: "selected_technique_ids",
        displayConfig: { cardLayout: "simple" }
      },
      axSignature: {
        input: [
          { name: "topic", type: "string", source: "variable", variableName: "session_topic" },
          { name: "goal", type: "string", source: "variable", variableName: "stated_goals" },
          { 
            name: "available_techniques", 
            type: "json[]", 
            source: "optionsSource", 
            description: "Array of {id, title, description, best_for, energy_level, typical_duration}"
          }
        ],
        output: [
          { name: "selected_ids", type: "array", items: { type: "string" }, description: "IDs of recommended techniques" },
          { name: "reasoning", type: "string", description: "Why these techniques fit the goal", internal: false }
        ],
        strategy: "ChainOfThought"
      }
    }
  ],
  
  // Progressive Update
  artifactOutput: {
    "topic": "session_topic",
    "goal": "stated_goals"
  },
  
  // Output Persistence
  outputVariables: {
    session_topic: "approval_states.set_session_topic.value",
    stated_goals: "approval_states.set_stated_goals.value"
  },
  
  completionCondition: {
    type: "all-tools-approved",
    requiredTools: ["set_session_topic", "set_stated_goals", "select_techniques"]
  }
};
```

### **Step 2: Technique Execution Loop**
**Goal:** Execute selected techniques.  
**Pattern:** Workflow Invocation Loop.

```typescript
const step2Config: InvokeWorkflowStepConfig = {
  stepType: "invoke-workflow",
  config: {
    iteratorVariable: "selected_technique_ids", 
    outputMode: "map", 
    outputVariable: "technique_results", 
    
    outputMapping: {
      "execution_id": "$execution_id",
      "technique_id": "$iterator.id",
      "technique_name": "$iterator.name",
      "raw_ideas": "captured_ideas" 
    },
    
    inputs: {
      "topic": "{{session_topic}}",
      "goal": "{{stated_goals}}"
    },
    
    artifactOutput: {
      "session_data": "technique_results"
    }
  }
};
```

### **Step 3: Convergence & Analysis Prep**
**Goal:** Organize ideas and select analysis methods.  
**Pattern:** Kanban + Sequential Blocking Tools.

```typescript
const step3Config: AskUserChatStepConfig = {
  agentId: "brainstorming-agent",
  initialMessage: "We've collected all your ideas. Let's organize them into priorities and then decide how to analyze them.",
  
  tools: [
    // 1. Organize Ideas (Kanban)
    {
      name: "organize_ideas",
      toolType: "ax-generator",
      requiresApproval: true,
      
      optionsSource: {
        variable: "technique_results", 
        transform: "flatten_ideas", 
        categories: [
          { id: "immediate", label: "🚀 Immediate Wins", color: "green" },
          { id: "future", label: "🔮 Future Innovations", color: "blue" },
          { id: "moonshot", label: "🌕 Moonshots", color: "purple" },
          { id: "discard", label: "🗑️ Discard" }
        ],
        displayConfig: { cardLayout: "kanban", allowReorder: true },
        outputVariable: "categorized_ideas_map"
      },
      
      axSignature: { 
        input: [
          { name: "ideas", type: "array", source: "optionsSource" }, 
          { name: "goal", type: "string", source: "variable", variableName: "stated_goals" }
        ],
        output: [
          {
            name: "categorized_map",
            type: "json", 
            description: "Object with keys: immediate, future, moonshot, discard. Each value is string[]"
          }
        ],
        strategy: "ChainOfThought"
      }
    },
    
    // 2. Select Analysis Methods (Blocked by Organization)
    {
      name: "select_analysis_methods",
      toolType: "ax-generation",
      requiredVariables: ["categorized_ideas_map"], // <--- Dependency Lock
      requiresApproval: true,
      
      optionsSource: {
        table: "workflows",
        filterBy: { 
          "tags->'type'->>'value'": "analysis",
          "tags->'mode'->>'value'": "automated"
        },
        outputVariable: "selected_analysis_ids",
        displayConfig: { cardLayout: "simple" }
      },
      
      axSignature: {
        input: [
          { name: "priorities", type: "json", source: "variable", variableName: "categorized_ideas_map" },
          { name: "goal", type: "string", source: "variable", variableName: "stated_goals" },
          { 
            name: "available_methods", 
            type: "json[]", 
            source: "optionsSource",
            description: "Array of {id, title, description, output_pattern}"
          }
        ],
        output: [
          { name: "selected_ids", type: "array", items: { type: "string" }, description: "IDs of recommended analysis methods" },
          { name: "reasoning", type: "string", description: "Why these methods fit the priorities" }
        ],
        strategy: "ChainOfThought"
      }
    }
  ],
  
  // Artifact Mapping
  artifactOutput: {
    "list_immediate": "categorized_ideas_map.immediate",
    "list_future": "categorized_ideas_map.future",
    "list_moonshot": "categorized_ideas_map.moonshot"
  },
  
  // Output Persistence
  outputVariables: {
    categorized_ideas_map: "approval_states.organize_ideas.value.categorized_map"
  },
  
  completionCondition: {
    type: "all-tools-approved",
    requiredTools: ["organize_ideas", "select_analysis_methods"]
  }
};
```

### **Step 4: Analysis Execution Loop**
**Goal:** Execute selected analysis methods.  
**Pattern:** Workflow Invocation Loop (Automated).

```typescript
const step4Config: InvokeWorkflowStepConfig = {
  stepType: "invoke-workflow",
  config: {
    iteratorVariable: "selected_analysis_ids", 
    outputMode: "map", 
    outputVariable: "analysis_results",
    
    outputMapping: {
      "execution_id": "$execution_id",
      "method_id": "$iterator.id",
      "method_name": "$iterator.name",
      "insights": "analysis_output" 
    },
    
    inputs: {
      "priorities": "{{categorized_ideas_map}}",
      "goal": "{{stated_goals}}"
    },
    
    artifactOutput: {
      "analysis_data": "analysis_results"
    }
  }
};
```

### **Step 5: Action Planning**
**Goal:** Create detailed action plans.  
**Pattern:** Ax Draft + Editable Form.

```typescript
const step5Config: AskUserChatStepConfig = {
  agentId: "brainstorming-agent",
  initialMessage: "Let's turn your 'Immediate Wins' into an action plan. I've drafted the details based on our analysis.",
  
  tools: [
    {
      name: "create_action_plan",
      toolType: "ax-generation",
      description: "Draft detailed action plans for top priority ideas",
      requiredVariables: [], 
      requiresApproval: true,
      
      axSignature: {
        input: [
          // System Inputs
          { name: "top_ideas", type: "array", source: "variable", variableName: "categorized_ideas_map.immediate" },
          { name: "analysis_insights", type: "array", source: "variable", variableName: "analysis_results" },
          
          // Agent Input (Context Summary)
          { 
            name: "planning_context_summary", 
            type: "string", 
            // No Source = Agent must provide
            description: "Summarize constraints (budget, timeline) from chat history"
          }
        ],
        
        output: [
          {
            name: "action_plan",
            type: "json",
            description: "Detailed plan for each top idea",
            schema: { /* ... schema ... */ }
          }
        ],
        strategy: "ChainOfThought"
      },
      
      optionsSource: {
        outputVariable: "final_action_plan",
        displayConfig: { cardLayout: "detailed-list", allowEdit: true }
      }
    }
  ],
  
  artifactOutput: {
    "action_plan_items": "final_action_plan"
  },
  
  outputVariables: {
    final_action_plan: "approval_states.create_action_plan.value.action_plan"
  },
  
  completionCondition: {
    type: "all-tools-approved",
    requiredTools: ["create_action_plan"]
  }
};
```

### **Step 6: Reflection**
**Goal:** Capture session feedback.  
**Pattern:** Chat + Ax Summary.

```typescript
const step6Config: AskUserChatStepConfig = {
  agentId: "brainstorming-agent",
  initialMessage: "We have a solid plan. Before we finish, let's reflect on the session.",
  
  tools: [
    {
      name: "record_reflection",
      toolType: "ax-generation",
      description: "Analyze the session chat and record reflection notes",
      requiresApproval: true,
      
      axSignature: {
        input: [
          // System Injects Full History
          { 
            name: "full_chat_log", 
            type: "string", 
            source: "context", 
            description: "Full conversation history of the reflection phase" 
          }
        ],
        
        output: [
          {
            name: "reflection_data",
            type: "json",
            description: "Structured reflection notes",
            schema: {
              type: "object",
              properties: {
                what_worked: { type: "string" },
                areas_to_explore: { type: "string" },
                next_session_topic: { type: "string" }
              }
            }
          }
        ],
        strategy: "ChainOfThought"
      }
    }
  ],
  
  artifactOutput: {
    "reflection": "reflection_data"
  },
  
  outputVariables: {
    reflection_data: "approval_states.record_reflection.value.reflection_data"
  },
  
  completionCondition: {
    type: "all-tools-approved",
    requiredTools: ["record_reflection"]
  }
};
```

### **Step 7: Completion**
**Goal:** Finalize and commit.  
**Pattern:** Execute Action.

```typescript
const step7Config: ExecuteActionStepConfig = {
  stepType: "execute-action",
  config: {
    actionType: "save-artifact",
    
    // Final Template Render
    templateId: "brainstorming-template-uuid",
    outputFilename: "docs/brainstorming-{{date}}.md",
    
    // Commit Message
    gitCommitMessage: "docs: add brainstorming results for {{session_topic}}"
  }
};
```

---

## 🔒 Child Workflow Examples (Reference)

### `technique-scamper`
*   **Step 1 (Chat):** Uses `scamper_substitute`, `scamper_combine` tools in sequence.
*   **Step 2 (Return):** Returns `captured_ideas` array.

### `analysis-identify-risks`
*   **Step 1 (Ax Gen):** Backend-only. Inputs priorities, outputs `analysis_output` (risks).

---

## 💡 Key Architectural Decisions

1.  **Consolidated Setup:** Step 1 handles Topic, Goal, and Selection.
2.  **Execution Loop:** Step 2 iterates through techniques, aggregating `captured_ideas`.
3.  **Structured Output:** Techniques return arrays of objects, not text blobs.
4.  **Convergence:** Step 3 uses Ax + Kanban UI to sort raw ideas.
5.  **Planning:** Step 5 uses **Agent-Provided Context** (Memory) + **System-Provided Data** (Vars) to draft an editable plan.
6.  **Reflection:** Step 6 uses **System-Injected Context** (History) to summarize the session.
7.  **Artifact:** Step 7 commits the final state to Git.