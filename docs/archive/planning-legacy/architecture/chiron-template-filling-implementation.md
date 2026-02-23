# Implementing BMAD Template-Filling in Chiron Artifact Workbench

**Date:** November 23, 2025  
**Analyst:** Mary (Business Analyst)  
**Project:** Chiron - BMAD Platform Implementation  
**Focus:** Translating BMAD's template-filling patterns to Chiron's architecture

---

## 🎯 **Core Concept: Template-Filling with Conversational Interface**

Based on my analysis, BMAD's magic is **Template-First Conversational Variable Extraction**:

```
Template Variables → Targeted Questions → User Responses → Structured Content → Living Document
```

## 🏗️ **Chiron Implementation Architecture**

### **1. Template System Design**

**Template Structure (JSON Schema):**
```typescript
interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  phase: number;
  
  // Template content with variables
  template: string;
  
  // Variable definitions
  variables: {
    [variableName: string]: {
      type: "text" | "section" | "conditional" | "array";
      required: boolean;
      description: string;
      promptStrategy: "direct" | "conversational" | "contextual";
      validation?: {
        minLength?: number;
        patterns?: string[];
      };
    };
  };
  
  // Execution configuration
  execution: {
    stepOrder: string[];
    conditionalSections: {
      [sectionName: string]: {
        condition: string; // Variable dependency
        template: string;
      };
    };
  };
}
```

**Example: Product Brief Template**
```json
{
  "id": "product-brief",
  "name": "Product Brief",
  "template": "# Product Brief: {{project_name}}\n\n## Executive Summary\n\n{{executive_summary}}\n\n## Problem Statement\n\n{{problem_statement}}\n\n{{#if market_analysis}}\n## Market Analysis\n\n{{market_analysis}}\n{{/if}}",
  "variables": {
    "project_name": {
      "type": "text",
      "required": true,
      "promptStrategy": "direct",
      "description": "Name of the project"
    },
    "executive_summary": {
      "type": "section", 
      "required": true,
      "promptStrategy": "conversational",
      "description": "High-level overview of the project"
    },
    "problem_statement": {
      "type": "section",
      "required": true,
      "promptStrategy": "contextual",
      "description": "Detailed problem worth solving"
    },
    "market_analysis": {
      "type": "conditional",
      "required": false,
      "promptStrategy": "contextual",
      "description": "Market context and analysis"
    }
  }
}
```

### **2. Conversational Variable Extraction System**

**Component: `TemplateVariableExtractor`**
```typescript
interface VariableExtractionStrategy {
  variableName: string;
  strategy: "direct" | "conversational" | "contextual";
  prompts: {
    initial: string;
    followups: string[];
    contextAdaptation: {
      hobby: string[];
      startup: string[];
      enterprise: string[];
    };
  };
}

class TemplateVariableExtractor {
  async extractVariable(
    variable: VariableDefinition,
    conversationContext: ConversationHistory,
    existingVariables: Record<string, any>
  ): Promise<ExtractedVariable> {
    
    // 1. Analyze existing context
    const context = this.analyzeContext(conversationContext);
    
    // 2. Select appropriate prompt strategy
    const prompt = this.selectPrompt(variable, context);
    
    // 3. Generate conversational question
    const question = this.generateQuestion(prompt, context);
    
    // 4. Extract and structure response
    const response = await this.converse(question, context);
    
    // 5. Format for template
    return this.formatForTemplate(response, variable.type);
  }
}
```

**Prompt Strategy Examples:**
```typescript
const productBriefStrategies = {
  project_name: {
    initial: "What's the project name, and what got you excited about building this?",
    followups: [
      "Tell me more about what sparked this idea",
      "What's the vision behind this name?"
    ]
  },
  
  problem_statement: {
    initial: "What problem are you trying to solve?",
    contextAdaptation: {
      hobby: [
        "What's annoying you that this would fix?",
        "What would this make easier or more fun?"
      ],
      startup: [
        "Walk me through the frustration your users face today",
        "What's the cost of this problem - time, money, opportunities?"
      ],
      enterprise: [
        "What's driving the need for this internally?",
        "Which teams/processes are most affected?"
      ]
    }
  }
};
```

### **3. Living Document Generation System**

**Component: `LivingDocumentBuilder`**
```typescript
class LivingDocumentBuilder {
  private template: WorkflowTemplate;
  private extractedVariables: Record<string, any> = {};
  private documentSections: Record<string, string> = {};
  
  // Progressive section building
  async addSection(variableName: string, content: string): Promise<void> {
    // 1. Format content for template
    const formattedContent = this.formatContent(content, this.template.variables[variableName]);
    
    // 2. Update template variable
    this.extractedVariables[variableName] = formattedContent;
    
    // 3. Generate current document state
    const currentDocument = this.generateCurrentDocument();
    
    // 4. Save to database/file
    await this.saveDocumentState(currentDocument);
    
    // 5. Emit update event
    this.emitDocumentUpdate(variableName, formattedContent);
  }
  
  // Generate document with current variables
  private generateCurrentDocument(): string {
    let document = this.template.template;
    
    // Replace simple variables
    Object.keys(this.extractedVariables).forEach(varName => {
      const regex = new RegExp(`{{${varName}}}`, 'g');
      document = document.replace(regex, this.extractedVariables[varName]);
    });
    
    // Handle conditional sections
    document = this.processConditionals(document);
    
    return document;
  }
  
  // Handle {{#if variable}}...{{/if}} blocks
  private processConditionals(document: string): string {
    const conditionalRegex = /{{#if (\w+)}}(.*?){{\/if}}/gs;
    return document.replace(conditionalRegex, (match, varName, content) => {
      return this.extractedVariables[varName] ? content : '';
    });
  }
}
```

### **4. Integration with Chiron's Existing Architecture**

**Extend Current Chat Step:**
```typescript
// Modify AskUserChatStep.tsx
interface TemplateChatStepProps extends AskUserChatStepProps {
  workflowTemplate: WorkflowTemplate;
  currentVariable?: string;
  documentPreview?: string;
}

export function TemplateChatStep({
  executionId,
  stepConfig,
  workflowTemplate,
  currentVariable,
  documentPreview
}: TemplateChatStepProps) {
  
  const [extractedVariables, setExtractedVariables] = useState<Record<string, any>>({});
  const [documentState, setDocumentState] = useState<string>("");
  
  // Handle variable extraction
  const handleVariableExtraction = async (userResponse: string) => {
    if (!currentVariable) return;
    
    // Extract and format variable
    const extractor = new TemplateVariableExtractor();
    const extracted = await extractor.extractVariable(
      workflowTemplate.variables[currentVariable],
      messages, // conversation history
      extractedVariables
    );
    
    // Update living document
    const builder = new LivingDocumentBuilder(workflowTemplate);
    await builder.addSection(currentVariable, extracted.content);
    
    // Update UI
    setExtractedVariables(prev => ({ ...prev, [currentVariable]: extracted.content }));
    setDocumentState(builder.generateCurrentDocument());
  };
  
  return (
    <div className="flex h-[calc(100vh-12rem)] gap-6">
      {/* Chat Interface */}
      <AskUserChatStep
        executionId={executionId}
        stepConfig={stepConfig}
        onMessage={handleVariableExtraction}
      />
      
      {/* Live Document Preview */}
      <div className="w-1/2 border-l pl-6">
        <DocumentPreview
          content={documentState}
          template={workflowTemplate}
          extractedVariables={extractedVariables}
        />
      </div>
    </div>
  );
}
```

**New Component: DocumentPreview**
```typescript
interface DocumentPreviewProps {
  content: string;
  template: WorkflowTemplate;
  extractedVariables: Record<string, any>;
}

export function DocumentPreview({ content, template, extractedVariables }: DocumentPreviewProps) {
  return (
    <div className="h-full overflow-y-auto p-6 bg-background border rounded-lg">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Living Document</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          Auto-saving
        </div>
      </div>
      
      {/* Progress indicators */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {Object.keys(template.variables).map(varName => (
            <VariableStatusBadge
              key={varName}
              variableName={varName}
              isCompleted={!!extractedVariables[varName]}
              isRequired={template.variables[varName].required}
            />
          ))}
        </div>
      </div>
      
      {/* Document content */}
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
```

### **5. Template Storage and Management**

**Database Schema Addition:**
```sql
-- Workflow templates
CREATE TABLE workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  phase INTEGER NOT NULL,
  template_content TEXT NOT NULL,
  variables JSONB NOT NULL,
  execution_config JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Template instances (living documents)
CREATE TABLE template_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES workflow_templates(id),
  execution_id UUID REFERENCES workflow_executions(id),
  project_id UUID REFERENCES projects(id),
  current_content TEXT NOT NULL,
  extracted_variables JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**API Endpoints:**
```typescript
// Template management
export const templateRouter = router({
  // Get template by ID
  getTemplate: publicProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .query(async ({ input }) => {
      return await db.query.workflowTemplates.findFirst({
        where: eq(workflowTemplates.id, input.templateId)
      });
    }),
  
  // Get Phase 0 templates
  getPhase0Templates: publicProcedure.query(async () => {
    return await db.query.workflowTemplates.findMany({
      where: eq(workflowTemplates.phase, 0)
    });
  }),
  
  // Save template instance
  saveTemplateInstance: publicProcedure
    .input(z.object({
      templateId: z.string().uuid(),
      executionId: z.string().uuid(),
      content: z.string(),
      variables: z.record(z.any())
    }))
    .mutation(async ({ input }) => {
      return await db.insert(templateInstances).values({
        templateId: input.templateId,
        executionId: input.executionId,
        currentContent: input.content,
        extractedVariables: input.variables
      }).returning();
    })
});
```

## 🚀 **Implementation Roadmap**

### **Phase 1: Core Template System (Week 1)**
1. **Template Schema & Storage**
   - Database tables for templates and instances
   - Basic template CRUD operations
   - JSON schema validation

2. **Variable Extraction Engine**
   - Basic conversational prompts
   - Context-aware question generation
   - Response formatting and validation

3. **Living Document Builder**
   - Progressive document generation
   - Template variable replacement
   - Conditional section handling

### **Phase 2: UI Integration (Week 2)**
1. **Enhanced Chat Interface**
   - Template-aware chat steps
   - Variable extraction prompts
   - Progress tracking

2. **Document Preview Component**
   - Real-time document rendering
   - Variable completion status
   - Auto-save indicators

3. **Template Management UI**
   - Template selection interface
   - Variable progress visualization
   - Document export functionality

### **Phase 3: Advanced Features (Future)**
1. **Context Adaptation**
   - Project type detection (hobby/startup/enterprise)
   - Adaptive prompt strategies
   - Dynamic template selection

2. **Cross-Template Integration**
   - Input discovery from previous templates
   - Variable inheritance between workflows
   - Artifact chaining

3. **Collaboration Features**
   - Multi-user document editing
   - Comment and review system
   - Version history and rollback

## 🎯 **Success Metrics**

**Technical Metrics:**
- Template rendering performance <100ms
- Real-time document sync <500ms
- Variable extraction accuracy >90%
- Auto-save reliability >99%

**User Experience Metrics:**
- Conversational flow feels natural
- Document builds progressively without jarring
- Template completion rate >80%
- User satisfaction with generated documents

## 💡 **Key Differentiators from BMAD**

1. **Real-Time Preview:** Users see document build live during conversation
2. **Visual Progress:** Clear indication of which variables are completed
3. **Modern UI:** React-based interface with smooth interactions
4. **Database Integration:** Persistent storage with version history
5. **Extensible Architecture:** Easy to add new templates and workflows

## 🔄 **Continuous Improvement**

**Learning Loop:**
1. Track which prompts work best for each variable type
2. Analyze user feedback on generated content
3. Refine extraction strategies based on success patterns
4. Update templates based on usage analytics

This implementation brings BMAD's sophisticated template-filling approach to Chiron's modern web architecture, creating an intuitive Artifact Workbench where users co-create business documents through natural conversation.
