# Template-Filling Implementation Strategy for Chiron

**Date:** November 23, 2025  
**Recommendation:** How to implement BMAD-style template filling with Chiron's existing architecture

---

## 🏗️ **Current Architecture Analysis**

You already have:
- ✅ **Handlebars** for variable resolution with 4-level precedence
- ✅ **set-variable** action system for updating execution variables  
- ✅ **Step execution engine** with action handlers
- ✅ **Chat interface** with approval system

## 🎯 **Recommended Approach: Tool-Based Template System**

### **YES - Use the Tool/Action Approach!**

Your current `set-variable` action system is PERFECT for template filling. Here's how to extend it:

## 📋 **Proposed Template-Filling Actions**

### **1. New Action Types:**

```typescript
// Extend ExecuteActionStepConfig actions
type TemplateAction = 
  | { type: "set-variable"; variable: string; value: unknown }
  | { type: "extract-variable"; variable: string; strategy: VariableExtractionStrategy }
  | { type: "update-template"; templateId: string; content: string }
  | { type: "save-document"; filename: string; content: string };
```

### **2. Variable Extraction Strategy:**

```typescript
interface VariableExtractionStrategy {
  variable: string;
  prompt: string;
  contextAdaptation?: {
    hobby: string;
    startup: string; 
    enterprise: string;
  };
  validation?: {
    minLength?: number;
    required?: boolean;
  };
}
```

### **3. Template Workflow Configuration:**

```yaml
# product-brief-workflow.yaml
name: "product-brief"
description: "Generate product brief through conversational template filling"

steps:
  - step: 1
    type: "execute-action"
    config:
      actions:
        - type: "extract-variable"
          variable: "project_name"
          strategy:
            prompt: "What's the project name, and what got you excited about building this?"
            validation:
              required: true
              minLength: 3
        - type: "set-variable"
          variable: "executive_summary"
          value: "{{project_name}} - Initial project concept"

  - step: 2  
    type: "ask-user-chat"
    config:
      initialMessage: "Let me capture that project name. Now, tell me about the problem you're trying to solve..."
      onMessage:
        - type: "extract-variable"
          variable: "problem_statement"
          strategy:
            prompt: "What problem are you trying to solve?"
            contextAdaptation:
              hobby: "What's annoying you that this would fix?"
              startup: "Walk me through the frustration your users face today"
              enterprise: "What's driving the need for this internally?"

  - step: 3
    type: "execute-action"
    config:
      actions:
        - type: "update-template"
          templateId: "product-brief"
          content: |
            # Product Brief: {{project_name}}
            
            ## Executive Summary
            {{executive_summary}}
            
            ## Problem Statement  
            {{problem_statement}}
        - type: "save-document"
          filename: "product-brief-{{project_name}}-{{date}}.md"
          content: "{{product_brief_content}}"
```

## 🔧 **Implementation Components**

### **1. Extend ExecuteActionHandler**

```typescript
// In execute-action-handler.ts
private async executeExtractVariable(
  action: Extract<TemplateAction, { type: "extract-variable" }>,
  context: ExecutionContext
): Promise<Record<string, unknown>> {
  const { variable, strategy } = action.config;
  
  // This is where AI extracts variable from conversation
  // For now, return empty to be filled by chat step
  return { [variable]: "" }; // Will be filled by user interaction
}

private async executeUpdateTemplate(
  action: Extract<TemplateAction, { type: "update-template" }>,
  context: ExecutionContext
): Promise<Record<string, unknown>> {
  const { templateId, content } = action.config;
  
  // Resolve variables in template content
  const resolvedContent = resolveVariables(content, context);
  
  // Store as execution variable for next steps
  return { 
    [`${templateId}_content`]: resolvedContent,
    "current_document": resolvedContent 
  };
}

private async executeSaveDocument(
  action: Extract<TemplateAction, { type: "save-document" }>,
  context: ExecutionContext  
): Promise<Record<string, unknown>> {
  const { filename, content } = action.config;
  
  // Resolve variables in filename and content
  const resolvedFilename = resolveVariables(filename, context);
  const resolvedContent = resolveVariables(content, context);
  
  // Save to file system or database
  await this.saveDocument(resolvedFilename, resolvedContent);
  
  return { 
    last_saved_file: resolvedFilename,
    document_saved_at: new Date().toISOString()
  };
}
```

### **2. Enhanced Chat Step Integration**

```typescript
// Modify AskUserChatStep to handle variable extraction
interface TemplateChatStepProps {
  extractionStrategies?: Record<string, VariableExtractionStrategy>;
  onVariableExtracted?: (variable: string, value: string) => void;
}

// When user sends message, check if it matches extraction strategy
const handleExtraction = async (userMessage: string) => {
  const currentStrategy = extractionStrategies?.[currentVariable];
  if (!currentStrategy) return;
  
  // Use AI to extract structured content from user response
  const extracted = await extractStructuredContent(userMessage, currentStrategy);
  
  // Update execution variable using set-variable action
  await setExecutionVariable(currentVariable, extracted);
  
  // Notify parent component
  onVariableExtracted?.(currentVariable, extracted);
};
```

### **3. Template Management System**

```typescript
// Template storage in database
interface Template {
  id: string;
  name: string;
  content: string; // Handlebars template
  variables: Record<string, VariableDefinition>;
  phase: number;
}

// Template instances (living documents)
interface TemplateInstance {
  id: string;
  templateId: string;
  executionId: string;
  currentContent: string;
  extractedVariables: Record<string, any>;
  updatedAt: Date;
}
```

## 🚀 **Why This Approach Works**

### **1. Leverages Existing Architecture**
- Uses your current `set-variable` system
- Integrates with Handlebars variable resolution
- Works with existing step execution engine
- No major architectural changes needed

### **2. Clear Separation of Concerns**
- **Templates** = Handlebars with variables
- **Extraction** = Conversational prompts + AI processing  
- **Storage** = set-variable actions
- **Rendering** = Handlebars resolution

### **3. Progressive Document Building**
```yaml
# Each step updates the document
Step 1: Extract project_name → set variable
Step 2: Extract problem_statement → set variable  
Step 3: Update template with current variables
Step 4: Save document state
Step 5: Extract next variable → repeat
```

### **4. Real-Time Preview**
The `current_content` variable can be used to:
- Show live document preview in UI
- Auto-save after each variable extraction
- Provide progress tracking

## 📋 **Implementation Steps**

### **Week 1: Core Template System**
1. **Extend Action Types** - Add extract-variable, update-template, save-document
2. **Template Storage** - Database tables and CRUD operations
3. **Basic Extraction** - Simple prompt-based variable extraction

### **Week 2: UI Integration**  
1. **Enhanced Chat Step** - Variable extraction with live preview
2. **Template Management** - Template selection and editing interface
3. **Document Preview** - Real-time document rendering

### **Week 3: Advanced Features**
1. **Context Adaptation** - Hobby/startup/enterprise prompt variations
2. **Conditional Sections** - Handlebars {{#if}} blocks
3. **Cross-Template Integration** - Input discovery from previous workflows

## 🎯 **Example Flow**

```yaml
# User selects "Product Brief" template
# System loads template with variables: [project_name, problem_statement, solution]

# Step 1: Extract project_name
AI: "What's the project name and what got you excited?"
User: "Chiron - A BMAD platform for project management"
System: set-variable(project_name, "Chiron - A BMAD platform...")

# Step 2: Update and preview  
System: update-template(content="# Product Brief: {{project_name}}...")
UI: Shows live document with project_name filled

# Step 3: Extract problem_statement
AI: "What problem are you trying to solve with Chiron?"
User: "Current BMAD implementation is complex and needs better UX..."
System: set-variable(problem_statement, "Current BMAD implementation...")

# Step 4: Update and save
System: update-template() + save-document()
UI: Shows complete document with both variables filled
```

This approach gives you the BMAD template-filling magic while staying within your current tool/action architecture!
