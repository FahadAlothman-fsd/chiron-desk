# Dynamic Technique Library System Design

**Date:** November 23, 2025  
**Analyst:** Mary (Business Analyst)  
**Focus:** Dynamic technique selection system for Chiron Artifact Workbench  
**Critical Insight:** BMAD has multiple CSV libraries, not just brainstorming!

---

## 🎯 **BMAD TECHNIQUE LIBRARY ECOSYSTEM**

### **📊 Complete CSV Inventory:**

| Module | CSV File | Technique Count | Purpose |
|---------|-----------|----------------|---------|
| **CIS Brainstorming** | brain-methods.csv | 36 techniques | Creative ideation methods |
| **CIS Problem Solving** | solving-methods.csv | 31 techniques | Analytical problem-solving |
| **CIS Innovation Strategy** | innovation-frameworks.csv | 31 techniques | Strategic innovation |
| **CIS Storytelling** | story-types.csv | 26 types | Narrative structures |
| **CIS Design Thinking** | design-methods.csv | Unknown | Design methodologies |
| **Advanced Elicitation** | advanced-elicitation-methods.csv | 21 methods | Content enhancement |
| **BMM Teams** | default-party.csv | Unknown | Agent party system |
| **And more...** | Multiple other CSVs | Various | Specialized techniques |

### **🔧 CSV Pattern Analysis:**

#### **Universal Column Structure:**
```csv
category,method_name,description,key_questions/prompts,metadata_fields
```

#### **Common Categories Across All CSVs:**
- **collaborative** - Team-based methods
- **creative** - Innovation and breakthrough thinking  
- **deep** - Analytical and root cause analysis
- **structured** - Systematic frameworks
- **theatrical** - Playful and perspective-shifting
- **introspective_delight** - Personal insight and wisdom
- **wild** - Unconventional boundary-pushing
- **strategic** - Business and planning frameworks
- **transformation** - Personal growth narratives
- **persuasive** - Influence and communication
- **emotional** - Connection and empathy
- **analytical** - Data-driven approaches

---

## 🚀 **DYNAMIC TECHNIQUE SELECTION SYSTEM DESIGN**

### **🎯 Core Concept:**
**"Technique Library as a Service"** - Not hardcoded brainstorming, but dynamic selection from ANY technique library!

### **🏗️ System Architecture:**

#### **1. Technique Library Loader**
```typescript
interface TechniqueLibrary {
  loadLibrary(libraryName: string): Promise<Technique[]>;
  getAvailableCategories(): string[];
  searchTechniques(query: string, category?: string): Technique[];
  getByCategory(category: string): Technique[];
}

interface Technique {
  id: string;
  name: string;
  category: string;
  description: string;
  prompts: string[];
  metadata: Record<string, any>;
  bestFor: string[];
  energyLevel: string;
  typicalDuration: string;
}
```

#### **2. Dynamic Selection Engine**
```typescript
class TechniqueSelector {
  async selectTechniques(
    context: SessionContext,
    libraryName: string = 'brainstorming',
    preferences?: SelectionPreferences
  ): Promise<SelectedTechnique[]> {
    
    // 1. Load technique library
    const library = await this.techniqueLibrary.loadLibrary(libraryName);
    
    // 2. Analyze user context
    const analysis = this.analyzeContext(context);
    
    // 3. Smart matching algorithm
    const matches = this.matchTechniques(library, analysis, preferences);
    
    // 4. Present options to user
    return this.presentOptions(matches, analysis);
  }
  
  private analyzeContext(context: SessionContext): ContextAnalysis {
    return {
      userGoals: context.statedGoals,
      complexity: this.assessComplexity(context),
      energyLevel: context.userEnergy,
      timeAvailable: context.timeAvailable,
      domain: context.domain,
      previousTechniques: context.usedTechniques
    };
  }
  
  private matchTechniques(
    library: Technique[], 
    analysis: ContextAnalysis,
    preferences: SelectionPreferences
  ): TechniqueMatch[] {
    
    // Multi-factor matching algorithm
    return library
      .filter(technique => this.matchesContext(technique, analysis))
      .map(technique => ({
        technique,
        score: this.calculateScore(technique, analysis, preferences),
        reasoning: this.explainMatch(technique, analysis)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, preferences?.maxTechniques || 5);
  }
}
```

#### **3. Context-Aware Recommendation System**
```typescript
interface SelectionPreferences {
  maxTechniques?: number;
  preferredCategories?: string[];
  avoidCategories?: string[];
  energyLevel?: 'high' | 'moderate' | 'low';
  timeAvailable?: number; // minutes
  complexity?: 'simple' | 'moderate' | 'complex';
}

class ContextAnalyzer {
  assessComplexity(context: SessionContext): 'simple' | 'moderate' | 'complex' {
    // Analyze stated goals, domain, user language
    if (context.statedGoals.includes('innovation')) return 'complex';
    if (context.statedGoals.includes('problem solving')) return 'moderate';
    return 'simple';
  }
  
  recommendApproach(context: SessionContext): 'ai-recommended' | 'user-selected' | 'random' | 'progressive' {
    // Based on user sophistication, time available, etc.
    if (context.userExperience === 'beginner') return 'ai-recommended';
    if (context.timeAvailable && context.timeAvailable < 30) return 'user-selected';
    return 'progressive';
  }
}
```

---

## 🔄 **UNIVERSAL TECHNIQUE EXECUTION ENGINE**

### **📋 Template-Agnostic Execution:**
```typescript
class UniversalTechniqueExecutor {
  async executeTechnique(
    technique: Technique,
    context: SessionContext,
    userInterface: TechniqueUI
  ): Promise<TechniqueResult> {
    
    // 1. Load technique-specific execution pattern
    const executionPattern = this.loadExecutionPattern(technique.category);
    
    // 2. Execute using technique's native prompts
    const result = await executionPattern.execute({
      technique,
      context,
      prompts: technique.prompts,
      userInterface
    });
    
    // 3. Generate standardized output
    return this.formatResult(result, technique);
  }
  
  private loadExecutionPattern(category: string): TechniqueExecutor {
    switch (category) {
      case 'collaborative': return new CollaborativeExecutor();
      case 'Creative': return new CreativeExecutor();
      case 'Deep': return new AnalyticalExecutor();
      case 'Strategic': return new StrategicExecutor();
      // ... 20+ more categories
    }
  }
}
```

### **🎨 Dynamic UI Generation:**
```typescript
class TechniqueUIGenerator {
  generateInterface(technique: Technique, context: SessionContext): TechniqueUI {
    return {
      introduction: this.generateIntroduction(technique, context),
      prompts: this.adaptPrompts(technique.prompts, context),
      progress: this.createProgressTracker(technique),
      energy: this.createEnergyMonitor(technique),
      completion: this.generateCompletionCriteria(technique)
    };
  }
  
  private adaptPrompts(basePrompts: string[], context: SessionContext): string[] {
    return basePrompts.map(prompt => 
      this.replacePlaceholders(prompt, context)
    );
  }
  
  private replacePlaceholders(prompt: string, context: SessionContext): string {
    return prompt
      .replace(/\[topic\]/g, context.currentTopic || 'this topic')
      .replace(/\[user_goal\]/g, context.statedGoals || 'your goals')
      .replace(/\[previous_idea\]/g, context.lastIdea || 'previous ideas');
  }
}
```

---

## 🎯 **CHIRON IMPLEMENTATION STRATEGY**

### **📊 Database Schema:**
```sql
-- Universal technique libraries
CREATE TABLE technique_libraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE, -- 'brainstorming', 'problem-solving', etc.
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  module VARCHAR(50), -- 'cis', 'bmm', etc.
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Universal techniques
CREATE TABLE techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID REFERENCES technique_libraries(id),
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  prompts TEXT[] NOT NULL, -- Array of prompt strings
  metadata JSONB, -- energy_level, typical_duration, best_for, etc.
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User technique selections
CREATE TABLE session_technique_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES workflow_executions(id),
  library_id UUID REFERENCES technique_libraries(id),
  selected_techniques UUID[] REFERENCES techniques(id),
  selection_reasoning TEXT,
  context_analysis JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **🔧 API Endpoints:**
```typescript
export const techniqueRouter = router({
  // Get all available libraries
  getTechniqueLibraries: publicProcedure.query(async () => {
    return await db.query.techniqueLibraries.findMany();
  }),
  
  // Get techniques from specific library
  getTechniques: publicProcedure
    .input(z.object({ 
      libraryName: z.string(),
      category: z.string().optional(),
      search: z.string().optional()
    }))
    .query(async ({ input }) => {
      const techniques = await db.query.techniques.findMany({
        where: and(
          eq(techniques.libraryId, 
            subquery(techniqueLibraries, 
              eq(techniqueLibraries.name, input.libraryName)
            )
          ),
          input.category ? eq(techniques.category, input.category) : undefined,
          input.search ? 
            or(
              ilike(techniques.name, `%${input.search}%`),
              ilike(techniques.description, `%${input.search}%`)
            ) : undefined
        )
      });
      return techniques;
    }),
  
  // Dynamic technique selection
  selectTechniques: publicProcedure
    .input(z.object({
      sessionId: z.string().uuid(),
      libraryName: z.string(),
      contextAnalysis: z.object({
        userGoals: z.string(),
        complexity: z.enum(['simple', 'moderate', 'complex']),
        energyLevel: z.enum(['high', 'moderate', 'low']),
        timeAvailable: z.number(),
        preferences: z.object({
          maxTechniques: z.number().optional(),
          preferredCategories: z.array(z.string()).optional()
        }).optional()
      }),
      selectedTechniques: z.array(z.string().uuid()).optional()
    }))
    .mutation(async ({ input }) => {
      // Smart selection algorithm
      const recommendations = await techniqueSelector.selectTechniques(
        input.contextAnalysis,
        input.libraryName,
        input.preferences
      );
      
      // Save selection
      await db.insert(sessionTechniqueSelections).values({
        sessionId: input.sessionId,
        libraryId: (await getLibraryId(input.libraryName)).id,
        selectedTechniques: recommendations.map(r => r.technique.id),
        selectionReasoning: recommendations.map(r => r.reasoning).join('\n'),
        contextAnalysis: input.contextAnalysis
      });
      
      return recommendations;
    })
});
```

### **🎨 Frontend Integration:**
```typescript
// Technique selection component
interface TechniqueSelectionProps {
  sessionId: string;
  onTechniquesSelected: (techniques: Technique[]) => void;
}

export function TechniqueSelection({ sessionId, onTechniquesSelected }: TechniqueSelectionProps) {
  const [libraries, setLibraries] = useState<TechniqueLibrary[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<string>('brainstorming');
  const [availableTechniques, setAvailableTechniques] = useState<Technique[]>([]);
  
  return (
    <div className="technique-selection-workspace">
      {/* Library Selection */}
      <LibrarySelector 
        libraries={libraries}
        selectedLibrary={selectedLibrary}
        onLibrarySelect={setSelectedLibrary}
      />
      
      {/* Smart Technique Recommendations */}
      <TechniqueRecommender
        sessionId={sessionId}
        libraryName={selectedLibrary}
        onRecommendations={onTechniquesSelected}
      />
      
      {/* Technique Execution */}
      <TechniqueExecutor
        sessionId={sessionId}
        techniques={availableTechniques}
      />
    </div>
  );
}
```

---

## 💡 **KEY BENEFITS OF THIS APPROACH**

### **🎯 Universal System:**
1. **Any Workflow Can Use Any Library** - Not just brainstorming
2. **Future-Proof** - Easy to add new technique libraries
3. **Cross-Workflow Compatibility** - Same system serves all workflows
4. **Context-Aware** - Smart selection based on user needs

### **🔄 Dynamic Adaptation:**
1. **Multi-Factor Matching** - Goals, complexity, energy, time
2. **Progressive Learning** - System improves recommendations based on usage
3. **Flexible Execution** - Each technique category has optimized executor

### **📈 Scalability:**
1. **Library Management** - Add/remove/update technique libraries
2. **Version Control** - Track technique evolution over time
3. **Usage Analytics** - Understand which techniques work best
4. **A/B Testing** - Test different recommendation algorithms

### **🎨 User Experience:**
1. **Library Browser** - Explore available technique families
2. **Smart Recommendations** - AI suggests optimal techniques
3. **Visual Technique Cards** - Rich descriptions and examples
4. **Progressive Execution** - Techniques build on each other

---

## 🚀 **IMPLEMENTATION ROADMAP**

### **Phase 1: Core Infrastructure (Week 1)**
1. **Database Schema** - Universal technique library tables
2. **CSV Importer** - Migrate existing BMAD CSVs to database
3. **Basic Selection Engine** - Context-aware technique matching
4. **Library Management UI** - Browse and manage technique libraries

### **Phase 2: Smart Selection (Week 2)**
1. **Context Analysis** - User goal and complexity assessment
2. **Recommendation Algorithm** - Multi-factor technique matching
3. **Dynamic UI Generation** - Technique-specific interfaces
4. **Execution Framework** - Universal technique execution system

### **Phase 3: Advanced Features (Future)**
1. **Usage Analytics** - Track technique effectiveness
2. **Learning System** - Improve recommendations based on success patterns
3. **Cross-Library Integration** - Techniques span multiple libraries
4. **Custom Technique Builder** - Users can create own techniques

---

## 🎯 **SUCCESS METRICS**

### **Technical Metrics:**
- Technique library loading <500ms
- Selection algorithm response <2 seconds
- Support 10+ concurrent technique libraries
- 100% technique execution success rate

### **User Experience Metrics:**
- 90%+ user satisfaction with recommended techniques
- <60 seconds from library selection to technique execution
- Support for 50+ techniques across all libraries
- 95%+ technique completion rate

### **Business Metrics:**
- 10+ technique libraries supported
- 500+ total techniques available
- Cross-workflow technique reuse
- Reduced onboarding time for new workflows

This design transforms Chiron from "single-workflow system" into "universal technique platform" - making it a true **Artifact Workbench** where any workflow can dynamically select and execute techniques from any library!
