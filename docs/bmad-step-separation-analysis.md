# BMAD Step Separation & Chiron Artifact Workbench Design

> **📌 Status: Conceptual Analysis Document**  
> This document contains early design thinking from November 2025.  
> **Actual Implementation:** See `docs/architecture/layout-routing-system.md` for the implemented architecture using `WorkflowLayoutRenderer`, layout types (wizard/artifact-workbench/dialog), and timeline container patterns.

**Date:** November 23, 2025  
**Analyst:** Mary (Business Analyst)  
**Focus:** Why BMAD separates steps and how this maps to Chiron's artifact workbench concept  
**Critical:** Understanding the architectural reasoning behind step separation

---

## 🎯 **WHY BMAD SEPARATES INTO STEPS**

### **📊 Architectural Reasons:**

#### **1. Workflow Engine Orchestration**
```xml
<WORKFLOW-RULES critical="true">
  <rule n="1">Steps execute in exact numerical order (1, 2, 3...)</rule>
  <rule n="2">Optional steps: Ask user unless #yolo mode active</rule>
  <rule n="3">Template-output tags: Save content → Show user → Get approval before continuing</rule>
  <rule n="4">User must approve each major section before continuing UNLESS #yolo mode active</rule>
</WORKFLOW-RULES>
```
**Purpose:** Ensure **deterministic execution order** and **user approval gates**.

#### **2. Template-Output Checkpoints**
```xml
<template-output>session_topic, stated_goals</template-output>
```
**Purpose:** Create **save points** where user can review progress before continuing.

#### **3. Step Granularity for Complex Workflows**
Each step represents a **significant workflow phase**:
- **Step 1:** Setup and context gathering
- **Step 2:** Technique selection (major decision point)
- **Step 3:** Technique execution (core work)
- **Step 4:** Convergence and synthesis
- **Step 5:** Action planning
- **Step 6:** Reflection and follow-up

#### **4. Variable Scope Management**
Each step has **defined variable scope** to prevent complexity:
- **Step 1:** Creates session setup variables
- **Step 2:** Creates selection variables
- **Step 3:** Creates execution variables
- **Step 4:** Creates analysis variables
- **Step 5:** Creates planning variables
- **Step 6:** Creates reflection variables

---

## 🎨 **HOW THIS MAPS TO CHIRON ARTIFACT WORKBENCH**

### **📋 Step as "Artifact Workbench Module"**

#### **Current Chiron Chat Step:**
```typescript
// Your current AskUserChatStep handles single conversation
<AskUserChatStep 
  executionId="brainstorming-123"
  stepConfig={{
    agentId: "brainstorming-agent",
    initialMessage: "What are we brainstorming about today?"
  }}
/>
```

#### **Enhanced Multi-Step Chat Step:**
```typescript
// Each step becomes a focused workbench module
<ArtifactWorkbenchStep 
  executionId="brainstorming-123"
  stepNumber={2} // Technique selection
  stepConfig={{
    agentId: "brainstorming-agent",
    tools: [
      {
        name: "technique-selector",
        description: "Dynamic technique selection from BMAD libraries",
        toolType: "technique-library"
      },
      {
        name: "technique-executor", 
        description: "Execute selected techniques with BMAD facilitation",
        toolType: "technique-executor"
      }
    ]
  }}
  onStepComplete={(stepOutput) => {
    // Update workbench context
    updateWorkbenchContext(stepOutput);
  }}
/>
```

### **🔄 Progressive Workbench Context:**
```typescript
interface WorkbenchContext {
  // Step 1: Setup
  session_topic: string;
  stated_goals: string;
  
  // Step 2: Selection
  selected_techniques: Technique[];
  approach_type: string;
  session_plan: string;
  
  // Step 3: Execution
  current_technique: string;
  technique_sessions: TechniqueSession[];
  total_ideas: number;
  
  // Step 4: Convergence
  key_themes: string;
  insights_learned: string;
  
  // Step 5: Planning
  priorities: Priority[];
  
  // Step 6: Reflection
  reflections: Reflection;
  
  // Progressive accumulation
  artifact_state: {
    current_step: number;
    completed_steps: number[];
    variables: Record<string, any>;
  };
}
```

---

## 🎯 **RENDERING AS ARTIFACT WORKBENCH**

### **📊 Multi-Step Visualization:**
```typescript
export function BrainstormingWorkbench() {
  const [currentStep, setCurrentStep] = useState(1);
  const [workbenchContext, setWorkbenchContext] = useState<WorkbenchContext>({});
  
  return (
    <div className="artifact-workbench">
      {/* Step Progress Indicator */}
      <StepProgress 
        currentStep={currentStep}
        totalSteps={6}
        completedSteps={workbenchContext.completed_steps}
      />
      
      {/* Dynamic Step Renderer */}
      <StepRenderer stepNumber={currentStep}>
        {currentStep === 1 && <SessionSetup />}
        {currentStep === 2 && <TechniqueSelection />}
        {currentStep === 3 && <TechniqueExecution />}
        {currentStep === 4 && <Convergence />}
        {currentStep === 5 && <ActionPlanning />}
        {currentStep === 6 && <Reflection />}
      </StepRenderer>
      
      {/* Artifact Preview */}
      <ArtifactPreview 
        context={workbenchContext}
        template="brainstorming-template"
      />
    </div>
  );
}
```

### **📋 Step Components as Focused Modules:**

#### **Step 1: Session Setup Module**
```typescript
export function SessionSetup({ onContextUpdate }: StepProps) {
  return (
    <div className="session-setup">
      <h2>Session Setup</h2>
      <QuestionSet 
        questions={[
          "What are we brainstorming about?",
          "Are there any constraints or parameters?",
          "Is this broad exploration or focused ideation?"
        ]}
        onResponse={onContextUpdate}
      />
    </div>
  );
}
```

#### **Step 2: Technique Selection Module**
```typescript
export function TechniqueSelection({ onTechniquesSelected }: StepProps) {
  return (
    <div className="technique-selection">
      <h2>Technique Selection</h2>
      <TechniqueLibrary 
        library="brainstorming"
        onTechniquesSelected={onTechniquesSelected}
      />
      <SelectionRationale />
    </div>
  );
}
```

#### **Step 3: Technique Execution Module**
```typescript
export function TechniqueExecution({ technique, context }: StepProps) {
  return (
    <div className="technique-execution">
      <h2>Executing: {technique.name}</h2>
      <TechniqueFacilitator 
        technique={technique}
        context={context}
      />
      <LiveDocumentBuilder />
    </div>
  );
}
```

---

## 🎯 **WHY THIS DESIGN WORKS**

### **✅ Maps to BMAD's Philosophy:**
1. **Step-by-step progression** - Maintains BMAD's sequential approach
2. **Approval gates** - Preserves BMAD's template-output checkpoints
3. **Variable scope management** - Each step has defined variable boundaries
4. **Template integration** - Final artifact assembly from all steps

### **✅ Enables Artifact Workbench:**
1. **Visual step progression** - Users see where they are in the workflow
2. **Context preservation** - Variables flow between steps seamlessly
3. **Module isolation** - Each step is a focused, testable component
4. **Progressive artifact building** - Live preview updates as variables accumulate
5. **Flexible routing** - Can handle different workflow patterns
6. **Tool integration** - Each step can have specialized tools

### **✅ Supports Your Multi-Technique Use Case:**
1. **Step 2** becomes technique selection module
2. **Step 3** becomes technique execution module
3. **Context accumulation** - Workbench context preserves technique history
4. **Dynamic tool loading** - Technique selector and executor tools
5. **Template resolution** - Final document uses all accumulated variables

---

## 🚀 **IMPLEMENTATION ROADMAP**

### **Week 1: Core Workbench Infrastructure**
1. **Step-based routing system** - Dynamic component loading
2. **Workbench context management** - Cross-step variable flow
3. **Template integration** - Live document building
4. **Progress indicators** - Visual step progression

### **Week 2: BMAD Technique Integration**
1. **Technique library loader** - Import all BMAD CSVs
2. **Dynamic technique selector** - Smart selection algorithms
3. **Multi-technique execution** - Enhanced chat step
4. **Context preservation** - Technique history management

### **Week 3: Advanced Features**
1. **Technique switching** - Back-and-forth between techniques
2. **Cross-technique synthesis** - Combine insights from multiple techniques
3. **Template customization** - User-defined templates
4. **Workflow branching** - Different paths based on user choices

---

## 🎯 **THE BOTTOM LINE:**

### **BMAD's Step Separation = Artifact Workbench Architecture**

BMAD separates into steps because:
1. **Execution control** - Deterministic workflow progression
2. **User agency** - Approval gates at major checkpoints
3. **Complexity management** - Each step has focused responsibility
4. **Template integration** - Progressive artifact assembly

### **Your Chiron Implementation:**
```
Step 1 → Step 2 → Step 3 → Step 4 → Step 5 → Step 6
   ↓           ↓          ↓          ↓          ↓          ↓          ↓
Setup → Selection → Execution → Convergence → Planning → Reflection
   ↓           ↓          ↓          ↓          ↓          ↓
Variables → Techniques → Sessions → Themes → Priorities → Reflections → Final Document
```

**This transforms your chat interface into a true Artifact Workbench where each step is a focused module that contributes to a progressive artifact building process!**