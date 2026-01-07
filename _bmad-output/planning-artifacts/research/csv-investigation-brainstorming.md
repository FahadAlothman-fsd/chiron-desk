# CSV Investigation: Brainstorming Methods Deep Dive

**Date:** November 23, 2025  
**Analyst:** Mary (Business Analyst)  
**Focus:** Complete analysis of brain-methods.csv structure and usage patterns  
**Critical for:** Translating BMAD to Chiron's variable system

---

## 📊 **CSV STRUCTURE ANALYSIS**

### **File:** `brain-methods.csv`
### **Column Structure (6 columns):**

| Column | Data Type | Purpose | Example |
|---------|-----------|---------|---------|
| `category` | string | Groups techniques by type (collaborative, creative, deep, etc.) | "creative" |
| `technique_name` | string | Human-readable name of the technique | "What If Scenarios" |
| `description` | string | Rich explanation of what technique does, when to use it, and why it's valuable | "Explore radical possibilities by questioning all constraints and assumptions..." |
| `facilitation_prompts` | string | Pipe-separated prompts for AI to use during facilitation | "What if we had unlimited resources?|What if the opposite were true?|What if this problem didn't exist?" |
| `best_for` | string | Context where technique excels | "innovation" |
| `energy_level` | string | Required user energy (high/moderate/low) | "high" |
| `typical_duration` | string | Estimated time for technique execution | "15-20" |

### **Data Content (36 techniques total):**

#### **Categories (7 types):**
1. **collaborative** (3 techniques) - Team-based ideation
2. **creative** (6 techniques) - Innovation and breakthrough thinking  
3. **deep** (4 techniques) - Analytical and root cause analysis
4. **theatrical** (6 techniques) - Playful and perspective-shifting
5. **introspective_delight** (6 techniques) - Personal insight and wisdom
6. **structured** (6 techniques) - Systematic frameworks
7. **wild** (5 techniques) - Unconventional and boundary-pushing

---

## 🔧 **USAGE PATTERNS IN WORKFLOW**

### **1. CSV Loading Pattern:**
```xml
<action>Load techniques from {brain_techniques} CSV file</action>
<action>Parse: category, technique_name, description, facilitation_prompts</action>
```

**Result:** In-memory data structure with all 36 techniques available for dynamic selection.

### **2. Smart Selection Pattern:**
```xml
<action>Review {brain_techniques} and select 3-5 techniques that best fit the context</action>

Analysis Framework:
1. Goal Analysis → Category matching
2. Complexity Match → Technique sophistication  
3. Energy Assessment → User energy level
4. Time Available → Session duration planning
```

### **3. Dynamic Technique Execution:**
```xml
<!-- For each selected technique -->
<action>Introduce: "Let's try [technique_name]. [Adapt description from CSV to their context]."</action>

<!-- First prompt from pipe-separated list -->
<action>Pull first facilitation_prompt from {brain_techniques} and adapt to their topic</action>
```

**Example from CSV:**
- **Technique:** "What If Scenarios"  
- **Prompts:** "What if we had unlimited resources?|What if the opposite were true?|What if this problem didn't exist?"
- **AI Usage:** Use first prompt, wait for response, then use next prompt

### **4. Progressive Facilitation Pattern:**
```xml
1. Introduce technique with CSV description
2. Use first facilitation_prompt from CSV
3. Wait for user response  
4. Build on response using "Yes, and..." patterns
5. Use next facilitation_prompt when ready
6. Monitor energy levels
7. Document all ideas generated
```

---

## 🎯 **VARIABLE EXTRACTION FROM CSV**

### **How CSV Data Becomes Variables:**

#### **During Technique Selection:**
```typescript
// After CSV load and analysis
interface SelectedTechnique {
  technique_name: string;        // From CSV column
  description: string;           // From CSV column  
  category: string;             // From CSV column
  facilitation_prompts: string[]; // Split pipe into array
  energy_level: string;         // From CSV column
  typical_duration: string;      // From CSV column
}
```

#### **During Technique Execution:**
```typescript
// Dynamic variables created during facilitation
interface TechniqueExecution {
  current_technique: string;     // Currently executing
  technique_sessions: string;      // Accumulated session content
  user_energy: string;           // Monitored energy level
  ideas_generated: number;        // Count tracking
}
```

### **CSV-to-Variable Mapping:**

| CSV Column | Variable Name | Usage Context |
|-------------|----------------|----------------|
| `category` | `technique_category` | For filtering and analysis |
| `technique_name` | `current_technique` | Active technique tracking |
| `description` | `technique_description` | For introduction and explanation |
| `facilitation_prompts` | `current_prompts` | Active prompt array |
| `best_for` | `technique_best_for` | Context matching logic |
| `energy_level` | `energy_requirement` | User energy management |
| `typical_duration` | `duration_estimate` | Time planning |

---

## 🔄 **DYNAMIC VARIABLE CREATION**

### **Pattern 1: Array Splitting**
```typescript
// CSV pipe-separated field becomes array
const facilitation_prompts = "What if we had unlimited resources?|What if the opposite were true?|What if this problem didn't exist?";
const prompt_array = facilitation_prompts.split('|'); // ["prompt1", "prompt2", "prompt3"]
```

### **Pattern 2: Context-Based Selection**
```typescript
// AI analyzes user context and selects appropriate techniques
function selectTechniques(userContext: SessionContext, csvData: Technique[]): Technique[] {
  return csvData.filter(technique => {
    // Match category to user goals
    // Match energy to user state
    // Match complexity to user sophistication
    // Return 3-5 best matches
  });
}
```

### **Pattern 3: Progressive Content Building**
```typescript
// As each technique executes, content accumulates
let technique_sessions = "";

for (const technique of selectedTechniques) {
  technique_sessions += `## ${technique.technique_name}\n\n${userResponses}\n\n`;
}

// Becomes template variable: {{technique_sessions}}
```

---

## 🎯 **CHIRON IMPLEMENTATION REQUIREMENTS**

### **1. CSV Parser Component**
```typescript
interface BrainMethod {
  category: string;
  technique_name: string;
  description: string;
  facilitation_prompts: string[];
  best_for: string;
  energy_level: string;
  typical_duration: string;
}

class CSVTechniqueLoader {
  async loadTechniques(csvPath: string): Promise<BrainMethod[]> {
    // Parse CSV with proper pipe handling
    // Convert facilitation_prompts to arrays
    // Validate all required columns present
    // Return structured array
  }
  
  selectByContext(context: SessionContext, techniques: BrainMethod[]): BrainMethod[] {
    // Implement smart selection logic from instructions.md
    // Consider: goals, complexity, energy, time
    // Return 3-5 best matches
  }
}
```

### **2. Dynamic Variable Generator**
```typescript
class TechniqueVariableGenerator {
  generateFromSelection(selected: BrainMethod[]): Record<string, any> {
    return {
      selected_techniques: selected.map(t => t.technique_name),
      techniques_list: selected.map(t => `${t.technique_name} (${t.category})`).join(', '),
      total_techniques: selected.length,
      // ... other derived variables
    };
  }
  
  generateFromExecution(execution: TechniqueSession[]): Record<string, any> {
    return {
      technique_sessions: execution.map(session => session.content).join('\n\n'),
      ideas_generated: execution.reduce((sum, session) => sum + session.ideaCount, 0),
      // ... other execution variables
    };
  }
}
```

### **3. Template Integration**
```typescript
// Handlebars template with CSV-derived variables
const templateVariables = {
  // User input variables
  session_topic: userInputs.session_topic,
  stated_goals: userInputs.stated_goals,
  
  // CSV-derived variables  
  selected_techniques: csvVariables.selected_techniques,
  current_technique: executionVariables.current_technique,
  techniques_list: csvVariables.techniques_list,
  
  // Execution accumulation variables
  technique_sessions: executionVariables.technique_sessions,
  key_themes: analysisVariables.key_themes,
  total_ideas: executionVariables.ideas_generated,
  
  // ... all 47 variables from workflow
};
```

---

## 💡 **KEY IMPLEMENTATION INSIGHTS**

### **CSV as Dynamic Content Engine:**
The CSV isn't just data - it's a **technique selection engine** that:
1. **Provides 36 pre-built facilitation methods**
2. **Enables smart matching** based on user context
3. **Supplies structured prompts** for AI to use
4. **Creates dynamic variables** based on selection

### **Variable Creation Pattern:**
```
Static Variables (config) → Dynamic Variables (CSV selection) → Execution Variables (facilitation) → Template Variables (accumulation)
```

### **Critical Success Factors:**
1. **Proper CSV parsing** - Handle pipe separators in prompts
2. **Context matching logic** - Implement the smart selection framework
3. **Dynamic prompt handling** - Use CSV prompts as facilitation guides
4. **Progressive variable building** - Accumulate content across techniques
5. **Template resolution** - Support all CSV-derived variables in Handlebars

### **Chiron Architecture Fit:**
Your current system can handle this perfectly:
- **CSV loading** → Pre-processing step in workflow execution
- **Dynamic variable creation** → Step outputs become execution variables
- **Handlebars resolution** → 4-level precedence handles CSV + user + system variables
- **Template building** → Progressive accumulation through template-output calls

The CSV is the **secret sauce** that makes brainstorming dynamic rather than static - it's a technique library that the AI can draw from based on user context!