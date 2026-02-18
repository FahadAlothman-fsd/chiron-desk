# BMAD Workflow Variables Analysis - Brainstorming Focus

**Date:** November 23, 2025  
**Analyst:** Mary (Business Analyst)  
**Focus:** Complete variable synthesis from BMAD brainstorming workflow  
**Scope:** How variables are initialized, updated, and used throughout workflow execution

---

## 🎯 **VARIABLE LIFECYCLE IN BRAINSTORMING WORKFLOW**

### **Variable Initialization Sources**

#### **1. System Variables (from config)**
```yaml
config_source: "{project-root}/bmad/cis/config.yaml"
output_folder: "{config_source}:output_folder"
user_name: "{config_source}:user_name"
date: system-generated
```

#### **2. Workflow Configuration Variables**
```yaml
installed_path: "{project-root}/bmad/core/workflows/brainstorming"
template: "{installed_path}/template.md"
instructions: "{installed_path}/instructions.md"
validation: "{installed_path}/checklist.md"
brain_techniques: "{installed_path}/brain-methods.csv"
```

#### **3. Runtime Variables (from execution context)**
- **Data attribute** - Context document passed when invoking workflow
- **User responses** - All `ask` and `ask response` responses
- **CSV loaded data** - Parsed brain-methods.csv content
- **Step outputs** - Accumulated from each `template-output` call

---

## 📋 **COMPLETE VARIABLE INVENTORY**

### **Phase 1: Session Setup Variables**

| Variable | Source | Type | Initialization | Usage |
|----------|---------|-------|----------------|
| `session_topic` | `ask response="session_topic"` | string | User input: "What are we brainstorming about?" |
| `stated_goals` | `ask response="stated_goals"` | string | User input: "Are there any constraints?" |
| `session_refinement` | `ask response="session_refinement"` | string | User input when context provided |
| `session_start_plan` | Action-generated | text | Compiled from setup data + chosen approach |

**Template Output:**
```xml
<template-output>session_topic, stated_goals</template-output>
```

### **Phase 2: Approach Selection Variables**

| Variable | Source | Type | Initialization | Usage |
|----------|---------|-------|----------------|
| `selection` | `ask response="selection"` | number (1-4) | User chooses approach: User-Selected, AI-Recommended, Random, Progressive |
| `technique_categories` | CSV load | array | From brain-methods.csv: ["structured", "creative", "collaborative", "deep", "theatrical", "wild", "introspective_delight"] |
| `selected_techniques` | Action-generated | array | Filtered and selected techniques based on approach |
| `session_plan` | Action-generated | text | Documented chosen techniques and approach used |

**Conditional Branch Variables:**
- `strong_context_from_Step_1` - Boolean evaluation
- `open_exploration` - Boolean evaluation  
- `specific_problem_or_goal` - Boolean evaluation

### **Phase 3: Technique Execution Variables**

| Variable | Source | Type | Initialization | Usage |
|----------|---------|-------|----------------|
| `technique_name` | CSV + Action | string | From brain-methods.csv + randomization |
| `description` | CSV | string | Technique description from CSV |
| `facilitation_prompts` | CSV | string | Pipe-separated prompts from CSV |
| `technique_sessions` | Accumulated | text | Built progressively during technique execution |
| `current_technique` | Action tracking | string | Currently executing technique |
| `energy_level` | User feedback | string | User's current energy level |

**Template Output:**
```xml
<template-output>technique_sessions</template-output>
```

### **Phase 4: Convergence Variables**

| Variable | Source | Type | Initialization | Usage |
|----------|---------|-------|----------------|
| `immediate_opportunities` | `ask response="immediate_opportunities"` | text | User categorizes quick wins |
| `future_innovations` | `ask response="future_innovations"` | text | User categorizes development ideas |
| `moonshots` | `ask response="moonshots"` | text | User categorizes ambitious ideas |
| `idea_patterns` | Analysis-generated | array | Identified patterns across techniques |
| `key_themes` | Analysis-generated | text | Recurring concepts discovered |

**Template Output:**
```xml
<template-output>immediate_opportunities, future_innovations, moonshots</template-output>
```

### **Phase 5: Insight Extraction Variables**

| Variable | Source | Type | Initialization | Usage |
|----------|---------|-------|----------------|
| `key_themes` | Analysis | text | Patterns identified across techniques |
| `insights_learnings` | Analysis + Task | text | From advanced-elicitation.xml output |
| `surprising_connections` | Observation | text | Unexpected relationships discovered |

**Advanced Elicitation Integration:**
```xml
<invoke-task halt="true">{project-root}/bmad/core/tasks/advanced-elicitation.xml</invoke-task>
```

**Template Output:**
```xml
<template-output>key_themes, insights_learnings</template-output>
```

### **Phase 6: Action Planning Variables**

| Variable | Source | Type | Initialization | Usage |
|----------|---------|-------|----------------|
| `priority_1_name` | User input | string | User's top priority idea |
| `priority_1_rationale` | User input | text | Why this is priority #1 |
| `priority_1_steps` | User input | text | Concrete next steps |
| `priority_1_resources` | User input | text | Resources needed |
| `priority_1_timeline` | User input | text | Realistic timeline |
| `priority_2_name` | User input | string | User's second priority |
| `priority_2_rationale` | User input | text | Why this is priority #2 |
| `priority_2_steps` | User input | text | Concrete next steps |
| `priority_2_resources` | User input | text | Resources needed |
| `priority_2_timeline` | User input | text | Realistic timeline |
| `priority_3_name` | User input | string | User's third priority |
| `priority_3_rationale` | User input | text | Why this is priority #3 |
| `priority_3_steps` | User input | text | Concrete next steps |
| `priority_3_resources` | User input | text | Resources needed |
| `priority_3_timeline` | User input | text | Realistic timeline |

**Template Output:**
```xml
<template-output>priority_1_name, priority_1_rationale, priority_1_steps, priority_1_resources, priority_1_timeline</template-output>
<template-output>priority_2_name, priority_2_rationale, priority_2_steps, priority_2_resources, priority_2_timeline</template-output>
<template-output>priority_3_name, priority_3_rationale, priority_3_steps, priority_3_resources, priority_3_timeline</template-output>
```

### **Phase 7: Reflection Variables**

| Variable | Source | Type | Initialization | Usage |
|----------|---------|-------|----------------|
| `what_worked` | User input | text | What techniques were most productive |
| `areas_exploration` | User input | text | Topics deserving deeper investigation |
| `recommended_techniques` | Analysis | text | Methods for continued work |
| `questions_emerged` | User input | text | New questions from session |
| `followup_topics` | User input | text | What to brainstorm next |
| `timeframe` | User input | text | When to next session |
| `preparation` | User input | text | Preparation needed |

**Template Output:**
```xml
<template-output>what_worked, areas_exploration, recommended_techniques, questions_emerged</template-output>
<template-output>followup_topics, timeframe, preparation</template-output>
```

### **Phase 8: Final Report Variables**

| Variable | Source | Type | Initialization | Usage |
|----------|---------|-------|----------------|
| `agent_role` | System | string | From workflow config |
| `agent_name` | System | string | From workflow config |
| `techniques_list` | Compilation | text | All techniques used in session |
| `total_ideas` | Calculation | number | Ideas generated across all techniques |

**Template Output:**
```xml
<template-output>agent_role, agent_name, user_name, techniques_list, total_ideas</template-output>
```

---

## 🔄 **VARIABLE UPDATE PATTERNS**

### **1. User Input Pattern**
```xml
<ask response="variable_name">Question text</ask>
<!-- Immediately stores user response in execution context -->
```

### **2. Template Output Pattern**
```xml
<template-output>var1, var2, var3</template-output>
<!-- Saves to template.md using Handlebars {{var}} replacement -->
```

### **3. CSV Data Loading Pattern**
```xml
<action>Load techniques from {brain_techniques} CSV file</action>
<action>Parse: category, technique_name, description, facilitation_prompts</action>
```

### **4. Task Invocation Pattern**
```xml
<invoke-task halt="true">{project-root}/bmad/core/tasks/advanced-elicitation.xml</invoke-task>
<!-- Pauses workflow, executes task, returns enhanced content -->
```

### **5. Conditional Logic Pattern**
```xml
<check if="condition">
  <action>Execute if true</action>
</check>
<check if="else">
  <action>Execute if false</action>
</check>
```

---

## 🎯 **KEY INSIGHTS FOR CHIRON IMPLEMENTATION**

### **Variable Accumulation Strategy**
1. **Start with config/system variables** (user_name, date, paths)
2. **Add user input variables** from each `<ask>` call
3. **Load CSV data** into memory for technique selection
4. **Build progressive variables** through template-output calls
5. **Invoke tasks** for advanced processing (like elicitation)
6. **Compile final variables** for template generation

### **Template Variable Resolution**
The brainstorming template uses **47 distinct variables**:
- **User inputs:** 13 variables (session_topic, stated_goals, selection, etc.)
- **System generated:** 8 variables (agent_role, date, techniques_list, etc.)
- **Analysis outputs:** 15 variables (key_themes, insights_learnings, priority_* variables)
- **CSV-derived:** Multiple technique-specific variables

### **Critical Implementation Requirements**
1. **Multi-source variable loading** - Config, CSV, user input, task outputs
2. **Progressive template building** - Each template-output updates the document
3. **Task integration** - Ability to invoke advanced-elicitation.xml
4. **Conditional branching** - Support for complex workflow paths
5. **CSV parsing** - Load and process technique/methods data
6. **Handlebars resolution** - Support all 47 variables in final template

### **Chiron Translation Strategy**
```typescript
// Your execution context already handles this perfectly
interface ExecutionContext {
  systemVariables: { user_name: string, date: string, output_folder: string };
  executionVariables: Record<string, unknown>; // Accumulates from template-outputs
  stepOutputs: Record<string, unknown>;
  defaultValues: Record<string, unknown>;
}

// Each template-output call adds to executionVariables
await updateExecutionVariables(executionId, {
  session_topic: userResponse,
  stated_goals: userGoals,
  // ... accumulates throughout workflow
});
```

This analysis shows BMAD's variable system is **extremely sophisticated** - 47 variables flowing from multiple sources through progressive template building. Your current Chiron architecture can handle this beautifully with the 4-level precedence system!