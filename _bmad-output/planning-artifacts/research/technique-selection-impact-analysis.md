# Brainstorming Technique Selection & Utilization Analysis

**Date:** November 23, 2025  
**Analyst:** Mary (Business Analyst)  
**Focus:** Exact tracing of how technique selection affects workflow instructions and variables  
**Critical Question:** How does technique selection change vs. not change the agent's instructions?

---

## 🎯 **KEY FINDINGS**

### **📊 Technique Selection DOES NOT Change Instructions**

The brainstorming workflow instructions are **STATIC** - they don't change based on technique selection. Here's the proof:

### **🔍 Evidence from Instructions:**

#### **Step 2a: User-Selected Techniques**
```xml
<step n="2a" title="User-Selected Techniques" if="selection==1">
  <action>Load techniques from {brain_techniques} CSV file</action>
  <action>Parse: category, technique_name, description, facilitation_prompts</action>
  <check if="strong context from Step 1">
    <action>Identify 2-3 most relevant categories based on stated_goals</action>
    <action>Present those categories first with 3-5 techniques each</action>
  </check>
</step>
```
**Instructions remain CONSTANT** - regardless of which techniques user selects.

#### **Step 2b: AI-Recommended Techniques**
```xml
<step n="2b" title="AI-Recommended Techniques" if="selection==2">
  <action>Review {brain_techniques} and select 3-5 techniques that best fit to context</action>
  <!-- Same instruction pattern as 2a -->
</step>
```

#### **Step 2c: Single Random Technique**
```xml
<step n="2c" title="Single Random Technique Selection" if="selection==3">
  <action>Load all techniques from {brain_techniques} CSV</action>
  <action>Select random technique using true randomization</action>
  <action>Build excitement about unexpected choice</action>
</step>
```

#### **Step 2d: Progressive Flow**
```xml
<step n="2d" title="Progressive Flow" if="selection==4">
  <action>Design a progressive journey through {brain_techniques} based on session context</action>
  <!-- Same instruction pattern as 2a -->
</step>
```

---

## 🧩 **HOW TECHNIQUE SELECTION AFFECTS VARIABLES**

### **📋 Variable Creation Pattern:**

#### **Selection Phase Variables:**
```typescript
// These variables are created REGARDLESS of which approach is chosen
interface SelectionVariables {
  selection: number;           // User's choice (1-4)
  selected_techniques: Technique[];  // ALWAYS created from CSV data
  approach_type: string;         // "user-selected", "ai-recommended", "random", "progressive"
  session_plan: string;          // Documenting chosen approach
}
```

#### **Execution Phase Variables:**
```typescript
// These variables are created DURING technique execution
interface ExecutionVariables {
  current_technique: string;     // From selected_techniques array
  technique_sessions: string;      // Built progressively during facilitation
  ideas_generated: number;       // Count tracking
  user_engagement: string;        // Energy monitoring
}
```

### **🔄 Key Insight:**

#### **Technique Selection is DATA-DRIVEN, Not Instruction-Driven:**
1. **Instructions NEVER change** - Same facilitation steps regardless of technique
2. **CSV data is ALWAYS loaded** - All 36 techniques available for selection
3. **Selection creates CHOICE variable** - `selection: 1-4`
4. **Execution creates TECHNIQUE-SPECIFIC variables** - From the selected techniques

---

## 🎯 **WHAT TECHNIQUE SELECTION ACTUALLY DOES:**

### **1. Enables Dynamic Facilitation**
```xml
<!-- After selection, execution uses the chosen techniques -->
<action>Introduce: "Let's try [technique_name]. [Adapt description from CSV to their context]."</action>

2. **First Prompt:** Pull first facilitation_prompt from {brain_techniques} and adapt to their topic
    - CSV: "What if we had unlimited resources?"
    - Becomes: "What if you had unlimited resources for [session_topic]?"
```

### **2. Provides Technique Metadata**
```typescript
// Each selected technique brings its full CSV data
interface SelectedTechnique {
  name: string;           // "What If Scenarios"
  category: string;         // "creative" 
  description: string;       // "Explore radical possibilities..."
  prompts: string[];        // ["What if we had unlimited resources?", "What if opposite were true?"]
  energy_level: string;       // "high"
  typical_duration: string;    // "15-20"
  best_for: string;          // "innovation"
}
```

### **3. Creates Context-Specific Execution**
```typescript
// The AI adapts facilitation based on technique metadata
function adaptFacilitation(technique: SelectedTechnique, userContext: SessionContext) {
  // Use technique.energy_level to match session intensity
  // Use technique.best_for to match user goals
  // Use technique.description to introduce properly
  // Use technique.prompts as conversation script
}
```

---

## 🎨 **CRITICAL IMPLEMENTATION INSIGHTS**

### **📊 Variable Flow is SEPARATION of CONCERNS:**

1. **Selection Phase:** Creates approach variables (`selection`, `selected_techniques`)
2. **Execution Phase:** Creates technique-specific variables (`current_technique`, `technique_sessions`)
3. **Template Phase:** Accumulates ALL variables into final document

### **🔧 For Chiron Implementation:**

#### **Technique Selection Component:**
```typescript
interface TechniqueSelectionProps {
  onTechniquesSelected: (techniques: SelectedTechnique[]) => void;
}

// Component handles selection logic
const TechniqueSelector = {
  async selectTechniques(context: SessionContext): Promise<SelectedTechnique[]> {
    // 1. Load CSV data
    const csvData = await loadBrainstormingCSV();
    
    // 2. Present options based on approach
    const approach = determineApproach(context);
    if (approach === 'user-selected') {
      return await this.presentUserSelection(csvData, context);
    }
    // ... other approaches
    
    // 3. Return selected techniques
    return selectedTechniques;
  }
};
```

#### **Dynamic Execution Component:**
```typescript
// Executes ANY selected technique with its specific prompts
interface TechniqueExecutorProps {
  techniques: SelectedTechnique[];
  currentTechnique: string;
  onTechniqueComplete: () => void;
}

const UniversalTechniqueExecutor = {
  async executeTechnique(technique: SelectedTechnique, context: SessionContext) {
    // Use technique-specific prompts from CSV
    const prompts = technique.facilitation_prompts;
    
    // Execute facilitation sequence
    for (const prompt of prompts) {
      const response = await askUser(prompt);
      addToSession(technique.name, prompt, response);
    }
    
    // Generate technique-specific variables
    const result = {
      technique_name: technique.name,
      technique_sessions: getSessionContent(),
      ideas_generated: countIdeas(),
      category: technique.category
    };
    
    onTechniqueComplete(result);
  }
};
```

### **🎯 The Magic Formula:**

```
Static Instructions + Dynamic CSV Data = Context-Aware Execution
     ↓                           ↓                    ↓
brainstorming workflow    brain-methods.csv    Selected techniques with full metadata
instructions (constant)     →  selection variables →  execution variables → template variables
```

---

## 💡 **FINAL ANSWER TO YOUR QUESTION:**

### **"Does technique selection change instructions of agent?"**

**NO** - Instructions remain **exactly the same** regardless of technique selection.

### **"What does technique selection really do?"**

1. **Creates CHOICE variables** - `selection: 1-4`, `approach_type`
2. **Enables DYNAMIC execution** - Different techniques get different prompts and metadata
3. **Provides TECHNIQUE CONTEXT** - Each technique brings its description, energy level, duration
4. **Drives VARIABLE CREATION** - Technique-specific variables like `current_technique`, `technique_sessions`

### **"Does it change instructions?"**

**NO** - The facilitation principles and steps remain identical. What changes is the **CONTENT** of facilitation based on which technique is selected.

### **Example:**
- **User selects "What If Scenarios"** → AI uses creative prompts, high energy approach
- **User selects "Five Whys"** → AI uses analytical prompts, deep dive approach
- **User selects "Mind Mapping"** → AI uses visual prompts, structured approach

**The instructions are the CONTAINER, the techniques are the CONTENT.**