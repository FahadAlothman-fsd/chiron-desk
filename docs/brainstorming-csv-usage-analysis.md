# Brainstorming CSV Column Usage Analysis

**Date:** November 23, 2025  
**Analyst:** Mary (Business Analyst)  
**Focus:** Exact tracing of how brain-methods.csv columns are used in brainstorming workflow  
**Critical for:** Understanding precise data flow for Chiron implementation

---

## 🎯 **COLUMN USAGE BREAKDOWN**

### **📊 CSV Columns (6 total):**

| Column | Data Type | Exact Usage in Workflow | Example |
|---------|-----------|-------------------|---------|
| `category` | string | **Filtering & Analysis** - Groups techniques for smart selection | "creative" |
| `technique_name` | string | **Dynamic Selection** - Technique identifier for execution | "What If Scenarios" |
| `description` | string | **Introduction** - Explains technique to user | "Explore radical possibilities..." |
| `facilitation_prompts` | string | **Execution** - Pipe-separated AI prompts | "What if we had unlimited resources?|What if opposite were true?" |
| `best_for` | string | **Matching Logic** - Context selection criteria | "innovation" |
| `energy_level` | string | **Session Planning** - User energy required | "high" |
| `typical_duration` | string | **Time Management** - Duration estimates | "15-20" |

---

## 🔧 **EXACT USAGE FLOW**

### **Step 1: CSV Loading**
```xml
<action>Load techniques from {brain_techniques} CSV file</action>
<action>Parse: category, technique_name, description, facilitation_prompts</action>
```
**Result:** All 36 techniques loaded into memory with full column data available for dynamic selection.

### **Step 2: Smart Technique Selection**
```xml
<action>Review {brain_techniques} and select 3-5 techniques that best fit the context</action>

Analysis Framework:
1. **Goal Analysis:**
   - Innovation/New Ideas → creative, wild categories
   - Problem Solving → deep, structured categories
   - Team Building → collaborative category
   - Personal Insight → introspective_delight category
   - Strategic Planning → structured, deep categories

2. **Complexity Match:**
   - Complex/Abstract Topic → deep, structured techniques
   - Familiar/Concrete Topic → creative, wild techniques
```
**Usage:** `category` and `best_for` columns are used for intelligent technique matching based on user's stated goals and topic complexity.

### **Step 3: Technique Execution**
```xml
<!-- For each selected technique -->
<action>Introduce: "Let's try [technique_name]. [Adapt description from CSV to their context]."</action>

2. **First Prompt: Pull first facilitation_prompt from {brain_techniques} and adapt to their topic</action>
```
**Critical Usage:** 
- `technique_name` - Displayed to user: "Let's try **What If Scenarios**"
- `description` - Adapted from CSV: "Explore radical possibilities by questioning all constraints..."
- `facilitation_prompts` - **PIPE-SPLIT INTO ARRAY** for sequential use:
  - First prompt: "What if we had unlimited resources?"
  - Second prompt: "What if the opposite were true?" 
  - Third prompt: "What if this problem didn't exist?"

### **Step 4: Progressive Facilitation**
```xml
3. **Build on Response:** Use "Yes, and..." or "That reminds me..." or "Building on that..."
4. **Next Prompt:** Pull next facilitation_prompt when ready to advance
5. **Monitor Energy:** Check user energy level
6. **Document Everything:** Capture all ideas for final report
```
**Usage Pattern:**
```typescript
// CSV provides the complete facilitation script
const prompts = technique.facilitation_prompts.split('|'); // ["prompt1", "prompt2", "prompt3"]

// AI uses prompts sequentially
for (const prompt of prompts) {
  await askUser(prompt);
  const response = await getUserResponse();
  addToTechniqueSession(response);
}
```

### **Step 5: Energy & Time Management**
```xml
<energy-checkpoint>
   After 4 rounds with a technique, check: "Should we continue with this technique or try something new?"
</energy-checkpoint>

<check if="strong context from Step 1 (specific problem/goal)">
   <action>Identify 2-3 most relevant categories based on stated_goals</action>
</check>
```
**Usage:** `energy_level` and `typical_duration` columns guide session management:
- High energy + 15-20 min techniques = intensive session
- Low energy + 10-15 min techniques = lighter session

---

## 🎯 **PRECISE VARIABLE CREATION FROM CSV**

### **How Each Column Becomes a Variable:**

#### **During Technique Selection:**
```typescript
interface SelectedTechnique {
  technique_name: string;        // CSV: technique_name
  category: string;             // CSV: category  
  description: string;           // CSV: description
  energy_level: string;         // CSV: energy_level
  typical_duration: string;      // CSV: typical_duration
  best_for: string;            // CSV: best_for
  facilitation_prompts: string[]; // CSV: facilitation_prompts split by '|'
}
```

#### **During Technique Execution:**
```typescript
interface TechniqueExecution {
  current_technique: string;     // From CSV: technique_name
  technique_description: string;   // From CSV: description
  current_prompts: string[];     // From CSV: facilitation_prompts
  technique_category: string;      // From CSV: category
  energy_requirement: string;     // From CSV: energy_level
  estimated_duration: string;       // From CSV: typical_duration
}
```

### **Template Variable Integration:**
```xml
<template-output>techniques_list</template-output>
<!-- Becomes: "What If Scenarios (creative), Mind Mapping (structured), Six Thinking Hats (structured)" -->
```

---

## 🔄 **DYNAMIC DATA FLOW PATTERN**

```
CSV Load → Category Analysis → Technique Selection → Prompt Array → Execution → Template Variables
    ↓              ↓                ↓              ↓           ↓
brain-methods  → category matching → selected_tech → prompts[] → technique_sessions → {{techniques_list}}
```

### **Key Insight:**
The CSV is **NOT just data** - it's a **complete facilitation system** where:
1. **Categories** enable smart filtering
2. **Descriptions** provide AI with technique explanations
3. **Prompts** give AI exact facilitation language
4. **Metadata** guides session management (energy, time, context)

---

## 🎨 **CHIRON IMPLEMENTATION REQUIREMENTS**

### **1. CSV Parser with Pipe Handling**
```typescript
class BrainMethodsCSVParser {
  parse(csvContent: string): BrainMethod[] {
    return csvContent.split('\n').map(line => {
      const [category, name, description, prompts, bestFor, energy, duration] = line.split(',');
      return {
        category: category.trim(),
        technique_name: name.trim(),
        description: description.trim(),
        facilitation_prompts: prompts.trim().split('|'),
        best_for: bestFor.trim(),
        energy_level: energy.trim(),
        typical_duration: duration.trim()
      };
    });
  }
}
```

### **2. Dynamic Prompt Generator**
```typescript
class PromptAdapter {
  adaptPrompts(basePrompts: string[], userContext: SessionContext): string[] {
    return basePrompts.map(prompt => 
      prompt.replace(/\[topic\]/g, userContext.sessionTopic)
         .replace(/\[user_goal\]/g, userContext.statedGoals)
         .replace(/\[previous_idea\]/g, userContext.lastIdea)
    );
  }
}
```

### **3. Technique Execution Engine**
```typescript
class TechniqueExecutor {
  async execute(technique: BrainMethod, context: SessionContext): Promise<TechniqueResult> {
    const adaptedPrompts = this.adaptPrompts(technique.facilitation_prompts, context);
    
    let sessionContent = `## ${technique.technique_name}\n\n`;
    sessionContent += `${technique.description}\n\n`;
    
    for (const prompt of adaptedPrompts) {
      const response = await this.askUser(prompt);
      sessionContent += `**Prompt:** ${prompt}\n`;
      sessionContent += `**Response:** ${response}\n\n`;
      
      // Build on response using facilitation principles
      const followup = this.generateFollowup(response);
      if (followup) {
        const followupResponse = await this.askUser(followup);
        sessionContent += `**Follow-up:** ${followup}\n`;
        sessionContent += `**Response:** ${followupResponse}\n\n`;
      }
    }
    
    return {
      technique_name: technique.technique_name,
      session_content: sessionContent,
      ideas_generated: this.countIdeas(sessionContent),
      user_engagement: this.trackEngagement(sessionContent)
    };
  }
}
```

### **4. Variable Integration**
```typescript
// CSV data becomes execution variables
const executionVariables = {
  // From technique selection
  selected_techniques: selectedTechs.map(t => t.technique_name),
  techniques_list: selectedTechs.map(t => `${t.technique_name} (${t.category})`).join(', '),
  
  // From technique execution
  current_technique: activeTechnique.technique_name,
  technique_sessions: accumulatedSessions,
  total_ideas: totalIdeaCount,
  
  // All integrate with Handlebars template
};
```

---

## 💡 **CRITICAL IMPLEMENTATION INSIGHTS**

### **The CSV is a "Facilitation Engine":**
1. **36 Pre-built Techniques** - Each with complete facilitation scripts
2. **Smart Selection Logic** - Category-based matching algorithm
3. **Dynamic Prompting** - Context-aware prompt adaptation
4. **Session Management** - Energy and time guidance
5. **Progressive Documentation** - Real-time content accumulation

### **For Chiron:**
This isn't just about loading CSV data - it's about creating a **dynamic technique execution system** where the CSV provides:
- **Technique library** for selection
- **Facilitation scripts** for AI to follow
- **Session metadata** for planning and management
- **Execution framework** for consistent technique delivery

The brainstorming workflow uses the CSV as a **complete facilitation methodology** - not just a data source, but a **dynamic execution engine**!