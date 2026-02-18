# Phase 0 Research Analysis: Understanding BMAD Discovery Workflows

**Research Date:** November 23, 2025  
**Analyst:** Mary (Business Analyst)  
**Project:** Chiron - BMAD Platform  
**Focus:** Deep analysis of Phase 0 workflows for Epic 2 implementation  
**User:** fahad

---

## Executive Summary

After conducting thorough research of the BMAD repository, I've analyzed the actual Phase 0 workflows (brainstorm-project, research, product-brief) as implemented in the BMAD framework. This analysis reveals a sophisticated discovery system designed to progressively transform raw ideas into actionable project specifications through guided conversation and artifact generation.

**Key Finding:** Phase 0 represents BMAD's "Artifact Workbench" - a conversational environment where users collaboratively build business artifacts through structured yet adaptive workflows.

---

## 1. PHASE 0 WORKFLOW PURPOSE ANALYSIS

### 1.1 Brainstorm-Project Workflow

**Core Purpose:** Meta-workflow that orchestrates CIS brainstorming techniques with project-specific context

**Architecture:**
- **Meta-Workflow Pattern:** Doesn't contain brainstorming logic itself, but invokes the core CIS brainstorming workflow
- **Context Injection:** Provides project-specific guidance through `project-context.md`
- **Status Integration:** Tracks completion in workflow status system

**User Journey:**
1. **Status Validation:** Checks if brainstorming is in sequence and not already completed
2. **Context Loading:** Loads project-specific brainstorming guidance
3. **CIS Invocation:** Delegates to core brainstorming workflow with project context
4. **Result Capture:** Saves session results and updates workflow status

**Artifacts Produced:**
- `brainstorming-session-results-{date}.md` - Raw brainstorming output
- Workflow status update tracking completion

**Key Insights:**
- Designed as optional/standalone workflow
- Leverages existing CIS brainstorming capabilities
- Focuses on software/product project dimensions (problems, features, UX, business model, etc.)

### 1.2 Research Workflow

**Core Purpose:** Adaptive multi-type research system supporting market, technical, competitive, user, and domain research

**Architecture:**
- **Router Pattern:** Uses `instructions-router.md` to direct to specialized research types
- **Anti-Hallucination Protocol:** Strict requirements for source citation and verification
- **Web Research Integration:** Built-in web search capabilities with current year data

**Research Types Supported:**
1. **Market Research** - Business/market questions
2. **Deep Research Prompt Generator** - Creating AI research prompts
3. **Technical Research** - Technology/architecture evaluation  
4. **Competitive Intelligence** - Competitor analysis
5. **User Research** - Customer insights
6. **Domain Research** - Industry/analysis

**User Journey:**
1. **Research Discovery:** Conversational identification of research needs
2. **Type Routing:** Directs to appropriate specialized instruction set
3. **Execution:** Follows type-specific research methodology
4. **Validation:** Ensures citation requirements and source verification

**Key Features:**
- Requires 2+ independent sources for critical claims
- Distinguishes between FACTS, ANALYSIS, and SPECULATION
- Confidence level flagging for uncertain data
- Current year web research integration

### 1.3 Product-Brief Workflow

**Core Purpose:** Context-adaptive discovery that creates living product briefs through natural conversation

**Architecture:**
- **Intent-Driven Facilitation:** Adapts organically to what emerges in conversation
- **Living Document Pattern:** Writes to document continuously throughout discovery
- **Smart Input Discovery:** Automatically loads related artifacts (research, brainstorming, project docs)

**Input Integration:**
```yaml
input_file_patterns:
  research: "{output_folder}/*research*.md"
  brainstorming: "{output_folder}/*brainstorm*.md" 
  document_project: "{output_folder}/docs/index.md"
```

**User Journey:**
1. **Context Understanding:** Adapts to user skill level and project type
2. **Problem Discovery:** Natural exploration of problems worth solving
3. **Solution Vision:** Shapes solution approach based on user context
4. **User Understanding:** Discovers target users through storytelling
5. **Success Definition:** Explores metrics that matter to the user
6. **MVP Scoping:** Defines minimal viable product scope
7. **Context Exploration:** Selectively explores relevant dimensions
8. **Document Refinement:** Reviews and completes living document

**Adaptive Approach:**
- **Hobby Projects:** Casual, fun-focused, simple metrics
- **Startups:** Market opportunity, competition, growth metrics
- **Enterprise:** Strategic alignment, stakeholders, compliance

---

## 2. WORKFLOW INTERCONNECTION ANALYSIS

### 2.1 Artifact Flow Patterns

**Progressive Enrichment:**
```
Brainstorming → Research → Product Brief
     ↓            ↓           ↓
Raw Ideas    Validated    Actionable
           Evidence    Specification
```

**Input Discovery System:**
- Product-brief automatically discovers and loads outputs from previous workflows
- Uses smart loading strategies (FULL_LOAD, SELECTIVE_LOAD, INDEX_GUIDED)
- Maintains artifact lineage and cross-referencing

### 2.2 Status Management System

**Workflow Status Tracking:**
- YAML-based status file tracks completion across all workflows
- Stores file paths as completion evidence
- Supports standalone and sequenced execution modes
- Provides next-step guidance

**Path Configuration:**
- Different workflow paths for different project types (enterprise, quick-flow, method-based)
- Phase 0 is optional in some paths, required in others
- Flexible inclusion based on project complexity and needs

---

## 3. WORKFLOW ENGINE ARCHITECTURE

### 3.1 Core Execution Engine

**XML-Based Workflow System:**
- Structured step execution with conditional logic
- Template-output checkpoints with user approval
- Support for workflow invocation and protocol execution
- Variable resolution and context management

**Key Features:**
- **Step-by-step execution** with exact ordering
- **Conditional execution** using check/if patterns
- **Template integration** with living document generation
- **Protocol system** for reusable functionality (like input discovery)

### 3.2 Variable and Context Management

**Variable Resolution:**
- Config file integration for user preferences
- System-generated variables (date, paths)
- Template variable substitution
- Cross-workflow variable passing

**Context Preservation:**
- Session-based conversation context
- Artifact cross-referencing
- Input discovery and loading
- Decision trail tracking

---

## 4. PHASE 0 IN BMAD METHODOLOGY

### 4.1 Strategic Purpose

**Why These 3 Workflows Form Phase 0:**

1. **Progressive Validation:** Each workflow reduces uncertainty through different lenses
   - Brainstorming: Idea exploration and clustering
   - Research: Evidence-based validation  
   - Product Brief: Strategic specification

2. **Artifact Chain:** Creates connected business artifacts
   - From raw inspiration to actionable specification
   - Each artifact builds upon previous insights
   - Maintains traceability of decisions

3. **Risk Mitigation:** Systematic approach to reduce project risk
   - Market validation through research
   - Problem-solution fit validation
   - Scope definition and prioritization

### 4.2 User Experience Design

**Conversational Interface:**
- Natural language interaction throughout
- Adaptive to user skill level and context
- Progressive disclosure of complexity
- Living document creation reduces cognitive load

**Flexibility Features:**
- Standalone execution for individual workflows
- Sequenced execution with status tracking
- Optional vs required workflow inclusion
- Multiple project type adaptations

---

## 5. TRANSLATION TO CHIRON PLATFORM

### 5.1 Current State Analysis

**What Chiron Already Has:**
- Workflow engine implementation
- Agent system integration
- Variable resolution capabilities
- Step execution framework

**What Needs Implementation:**
- Phase 0 workflow templates
- Input discovery protocols
- Living document generation
- Status management system

### 5.2 Implementation Priorities

**Priority 1: Core Workflow Templates**
1. **Brainstorm-Project:** Meta-workflow pattern with CIS integration
2. **Research Router:** Multi-type research with anti-hallucination
3. **Product Brief:** Intent-driven facilitation with living documents

**Priority 2: Supporting Infrastructure**
1. **Input Discovery Protocol:** Smart file loading and pattern matching
2. **Status Management:** YAML-based workflow tracking
3. **Template System:** Living document generation with checkpoints

**Priority 3: Integration Features**
1. **Web Research:** Current data integration with citation requirements
2. **Artifact Linking:** Cross-workflow reference management
3. **Context Preservation:** Session and artifact context management

### 5.3 Technical Implementation Strategy

**Workflow Template Structure:**
```yaml
workflow_template:
  metadata:
    name: string
    phase: number
    optional: boolean
    
  configuration:
    input_patterns: object
    output_template: string
    status_tracking: boolean
    
  execution:
    steps: array[step_definition]
    protocols: array[protocol_invocation]
    integrations: array[external_system]
```

**Key Implementation Challenges:**
1. **Conversational Adaptation:** Dynamic response generation based on user context
2. **Living Document Generation:** Real-time document building during conversation
3. **Input Discovery:** Intelligent file pattern matching and loading
4. **Research Integration:** Web search with citation verification

---

## 6. RECOMMENDATIONS FOR EPIC 2

### 6.1 2-Week Implementation Strategy

**Week 1: Foundation**
- **Days 1-3:** Implement core workflow template system
- **Days 4-5:** Build brainstorm-project workflow with CIS integration
- **Days 6-7:** Create research router with basic market research

**Week 2: Completion**
- **Days 8-9:** Implement product-brief with living document generation
- **Days 10-11:** Add input discovery and status management
- **Days 12-14:** Integration testing and refinement

### 6.2 Success Metrics

**Technical Metrics:**
- All 3 workflows functional with conversational interface
- Living document generation working in real-time
- Input discovery successfully loading related artifacts
- Status tracking across workflow sequences

**User Experience Metrics:**
- Natural conversation flow without template rigidity
- Progressive document building visible to users
- Seamless workflow transitions with context preservation
- Adaptive responses based on user skill level

### 6.3 Risk Mitigation

**High-Risk Areas:**
1. **Conversational Complexity:** Natural language adaptation is challenging
2. **Living Documents:** Real-time document generation during conversation
3. **Research Integration:** Web search with proper citation requirements

**Mitigation Strategies:**
1. **Start Simple:** Basic conversational flows first, enhance iteratively
2. **Template-First:** Document templates before real-time generation
3. **Manual Research:** Start with user-provided research, add web integration later

---

## Conclusion

Phase 0 workflows represent a sophisticated discovery system that transforms raw ideas into actionable specifications through guided conversation. The implementation balances structure with flexibility, providing systematic validation while maintaining adaptive user experiences.

For Epic 2, success requires focusing on the core conversational workflows while building the supporting infrastructure incrementally. The living document approach and input discovery system are key differentiators that should be prioritized.

The research reveals that Phase 0 is not just about generating documents, but about creating a collaborative environment where users discover and refine their product vision through natural conversation supported by intelligent systems.

---

**Research Completed:** November 23, 2025  
**Next Steps:** Begin Epic 2 story breakdown based on these workflow analyses