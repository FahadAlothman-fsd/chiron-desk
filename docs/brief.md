# Project Brief: Chiron

## Executive Summary

Chiron is an AI-powered project management tool specifically designed for **individual developers** that leverages the proven BMAD method to transform how software projects are planned and executed. The product addresses the fundamental fragmentation problem in current AI development tools by shifting from an IDE-centric to a project management-centric approach. Targeting **individual developers seeking structured AI-assisted workflows**, Chiron provides enhanced chat interfaces with interactive elements for generating and managing BMAD artifacts (Project Brief → PRD → Frontend Spec → Architecture → Epics → Stories). **The primary goal is to create comprehensive context that enables AI agents to implement exactly what the developer truly desires**, bridging the gap between planning and execution through deep integration with OpenCode. The core value proposition lies in combining AI-guided artifact generation with user control, offering individual developers the clarity and focus of having a "project manager managing projects rather than supervisor whipping monkeys" - delivering relief, focus, and clarity to solo development workflows.

## Problem Statement

Individual developers face significant fragmentation and cognitive overhead when using AI-assisted development tools. Current solutions force developers to switch between multiple disconnected interfaces for planning, coding, and project management, leading to context loss, duplicated effort, and workflow inefficiency. The traditional IDE-centric approach treats documentation and planning as secondary to code, leaving solo developers without structured guidance for project architecture and decision-making. This fragmentation results in wasted time, inconsistent project quality, and the mental burden of maintaining project coherence across disparate tools. Without a unified, structured approach, individual developers struggle to maintain the discipline needed for systematic software development, particularly when working alone without the benefit of team collaboration and oversight.

## Proposed Solution

Chiron provides a unified, AI-powered project management interface that puts structured planning at the center of the development workflow. **The entire purpose of the planning phase is to generate rich, structured context that AI agents need to implement software projects accurately.** The solution implements an enhanced chat interface with interactive elements that guides individual developers through the BMAD method artifact generation sequence (Project Brief → PRD → Frontend Spec → Architecture → Epics → Stories). Unlike traditional IDE-centric tools, Chiron features a split-screen interface displaying real-time artifact updates alongside AI conversations, eliminating context switching and maintaining project coherence. The system combines AI-guided generation with user control, allowing developers to leverage structured methodologies while maintaining creative autonomy. **Through deep integration with OpenCode, Chiron seamlessly transfers planning artifacts as execution context**, ensuring that AI agents have comprehensive understanding of project requirements, technical decisions, and implementation details. By storing planning artifacts in Git with chat history in a linked database, Chiron provides complete artifact provenance and enables developers to maintain project discipline without the overhead of manual documentation management.

## Target Users

### Primary User Segment: Individual Developers Working on Personal Projects

**Profile:**
- **Demographics:** Software developers, computer science students, independent contractors
- **Experience Level:** Intermediate to advanced developers familiar with software development concepts
- **Current Context:** Working on personal projects, academic work (like master's theses), or solo freelance work
- **Technical Comfort:** Comfortable with Git, modern development tools, and AI assistants

**Current Behaviors and Workflows:**
- Switch between multiple tools: IDE for coding, separate apps for planning, documentation tools
- Struggle to maintain project structure and documentation discipline when working alone
- Use AI assistants for coding help but lack structured planning guidance
- Experience context loss when moving between planning and implementation phases
- Often abandon documentation practices due to time pressure and lack of immediate payoff

**Specific Needs and Pain Points:**
- Need structured project planning without the overhead of enterprise tools
- Require help maintaining architectural consistency across solo projects
- Want to improve project quality and maintainability without team oversight
- Seek to reduce cognitive load from managing multiple disconnected tools
- Desire the benefits of structured methodologies without complex setup

**Goals They're Trying to Achieve:**
- Build high-quality, well-architected software projects independently
- Maintain project discipline and documentation without external accountability
- **Ensure AI agents implement exactly what they envision through comprehensive planning context**
- Learn and apply best practices systematically in their work
- Reduce time wasted on context switching and tool management
- Complete projects with confidence in their architectural decisions
- **Bridge the gap between planning ideas and actual code implementation**

## Goals & Success Metrics

### Business Objectives

- **Validate BMAD method enhancement through AI interface:** Achieve 80% user satisfaction with AI-guided artifact generation within 3 months of MVP release
- **Demonstrate technical feasibility of enhanced chat interface:** Complete functional prototype with split-screen artifact display within 2 months
- **Establish proof of concept for individual developer project management:** Successfully support 5+ complete project workflows from Project Brief through Stories by master's completion
- **Create reusable framework for BMAD artifact generation:** Develop template system supporting at least 3 different project types with validation checklists

### User Success Metrics

- **Reduce context switching time:** Decrease tool-switching frequency by 70% compared to traditional workflows
- **Improve project documentation quality:** Achieve 90% completion rate for BMAD artifact sequences in user projects
- **Enhance development clarity:** Measure 40% reduction in time spent on project architecture decisions through AI guidance
- **Increase project completion rates:** Support users in completing 80% of started projects with full artifact documentation

### Key Performance Indicators (KPIs)

- **Artifact Generation Success Rate:** 85% of AI-generated artifacts pass BMAD validation checklists without major revisions
- **User Engagement:** Average session duration of 45+ minutes indicating deep workflow engagement
- **Feature Adoption:** 75% of users utilize enhanced chat interactive elements within first week
- **Project Velocity:** Users complete BMAD artifact sequences 50% faster than manual template methods
- **Error Reduction:** 60% decrease in architectural inconsistencies detected during implementation phase

## MVP Scope

### Core Features (Must Have)

- **BMAD Artifact Generation with Enhanced Chat:** Implement Project Brief → PRD → **Frontend Spec → Architecture** → Epics → Stories workflow with AI-enhanced chat interfaces. This is the core value proposition that addresses the fundamental fragmentation problem.
- **Split-Screen Artifact Interface:** Real-time artifact display alongside interactive AI chat for refinement. Essential for solving the context fragmentation problem identified in your session.
- **Template System with Validation:** Custom templates with BMAD validation checklists preserved. Maintains BMAD integrity while allowing customization for individual developer needs.
- **Basic Project Management:** Simple project creation, artifact storage, and navigation between BMAD workflow stages. Provides the foundational structure for the planning-centric approach.
- **Git Integration:** Automatic artifact versioning and storage in Git repository. Ensures project portability and aligns with developer workflows.
- **OpenCode Integration:** Seamless transfer of planning artifacts as execution context for AI agents. Ensures implementation phase has comprehensive understanding of project requirements and decisions.
- **Kanban Board Integration:** Real-time task monitoring with planning and implementation boards (developed after initial planning artifacts are complete). Provides visual project tracking for individual developers.

### Out of Scope for MVP

- **Interactive Story Refinement Interface:** Sortable list of AI-generated stories with individual discussion dialogs (3-4 month development needed)
- **Gherkin Integration with Test Generation:** Stories automatically generate Gherkin specs and test frameworks (2-3 month development)
- **Agent Traffic Control Interface:** Real-time monitoring of AI agents implementing tasks (moonshot concept)
- **Multi-user Collaboration:** Team features, sharing, or collaborative editing (focus is individual developers)
- **Advanced Analytics:** Project metrics, productivity tracking, or performance insights
- **Custom Workflow Builder:** User-defined artifact sequences beyond BMAD method

### MVP Success Criteria

**MVP Success is achieved when:** An individual developer can successfully create a complete project from initial idea through implementation-ready stories using the BMAD method entirely within Chiron, with all artifacts properly validated and stored in Git, **seamlessly transfer planning context to OpenCode for accurate AI implementation**, track progress on a Kanban board, and experience measurable reduction in context switching and improved project clarity compared to traditional fragmented workflows.

## Post-MVP Vision

### Phase 2 Features

**Interactive Story Refinement Interface:** Sortable list of AI-generated stories with individual discussion dialogs that allow developers to dive deep into specific story requirements, acceptance criteria, and implementation approaches. This builds on the MVP's story generation by providing granular control and refinement capabilities.

**Gherkin Integration with Test Generation:** Automatic generation of Gherkin specifications from user stories, coupled with test framework scaffolding. This extends the BMAD method into the testing phase, ensuring that stories automatically produce comprehensive test coverage and behavior-driven development practices.

**Advanced Template Customization:** User-defined templates and workflow variations while maintaining BMAD validation. Allows individual developers to adapt the system to specific project types (mobile apps, APIs, data science projects) without losing the structured approach benefits.

### Long-term Vision

**Complete Development Lifecycle Integration:** Extend Chiron beyond planning into implementation assistance through enhanced OpenCode integration, with AI agents capable of generating code snippets, suggesting architectural patterns, and providing real-time implementation guidance based on the comprehensive context established in BMAD artifacts.

**Learning and Recommendation Engine:** Analyze successful project patterns across individual developer projects to provide personalized recommendations for architectural decisions, technology choices, and best practices based on project characteristics and developer preferences.

**Cross-Project Knowledge Management:** Enable developers to leverage insights and patterns from previous projects, creating a personal knowledge base that grows with each completed project and informs future development decisions.

### Expansion Opportunities

**Team Collaboration Features:** Scale from individual developers to small teams, introducing collaborative artifact editing, shared project spaces, and team workflow coordination while maintaining the structured BMAD approach.

**Integration Ecosystem:** Connect with popular development tools (GitHub, GitLab, Jira, VS Code) to embed Chiron's structured planning capabilities within existing developer workflows rather than replacing them entirely.

## Technical Considerations

### Platform Requirements

- **Target Platforms:** Web-based application with desktop app capabilities through Tauri
- **Browser/OS Support:** Modern browsers (Chrome, Firefox, Safari, Edge) with cross-platform desktop support (Windows, macOS, Linux)
- **Performance Requirements:** Real-time chat interface with <200ms response times, split-screen updates without lag, support for artifacts up to 10,000 lines
- **Offline Capability:** Local storage for critical artifacts with sync when connection restored

### Technology Preferences

- **Frontend:** React with TypeScript (existing web app), Vite for build tooling, Tailwind CSS for styling, Tauri for desktop wrapper
- **Backend:** Node.js with TypeScript (existing server), Drizzle ORM for database management, WebSocket support for real-time updates
- **Database:** PostgreSQL for structured data (chat history, metadata), Git repository for artifact storage and versioning
- **Hosting/Infrastructure:** Self-hosted option for individual developers, Docker containerization for easy deployment, optional cloud backup for Git repositories

### Architecture Considerations

- **Repository Structure:** Monorepo approach (already established) with separate apps for web, server, and AI service
- **Service Architecture:** Microservices with dedicated AI service (DSPy + OpenRouter integration), real-time service for chat updates, artifact service for document management
- **Integration Requirements:** OpenRouter API for AI model access, Git integration for artifact versioning, **OpenCode integration for agent execution context**, potential future integrations with GitHub/GitLab
- **Security/Compliance:** Local-first data storage for privacy, API key management for external services, secure handling of proprietary project data

## Constraints & Assumptions

### Constraints

- **Budget:** Limited to personal development resources and potentially academic project funding; no commercial investment or enterprise resources available
- **Timeline:** Must be completed within master's program duration (approximately 12-18 months total), with MVP deliverable for thesis requirements
- **Resources:** Solo development effort with potential for limited peer collaboration; no dedicated team for UI/UX, testing, or DevOps
- **Technical:** Must work within existing technology stack and monorepo structure; cannot introduce completely new frameworks that would require extensive learning
- **Scope:** Focus on individual developer workflow only; no team collaboration features or enterprise-level requirements
- **External Dependencies:** Reliant on OpenRouter API availability and pricing; DSPy framework stability and documentation quality

### Key Assumptions

- **Individual Developer Demand:** Solo developers experience sufficient pain from tool fragmentation to adopt new workflow approaches
- **BMAD Method Appeal:** Individual developers value structured planning enough to learn and adopt the BMAD methodology
- **AI Assistant Acceptance:** Developers are comfortable with AI-guided workflows while maintaining final decision control
- **Technical Feasibility:** Enhanced chat interface with interactive elements can be implemented within solo developer resource constraints
- **Learning Curve:** Individual developers willing to invest time in learning new workflow if it provides clear productivity benefits
- **Git Integration Acceptance:** Developers comfortable with Git-based artifact storage as primary document management approach
- **Local-First Preference:** Individual developers prefer local data storage over cloud-only solutions for privacy and control

## Risks & Open Questions

### Key Risks

- **Workflow Adoption Risk:** Individual developers may be resistant to changing established workflows, even if current approaches are fragmented. The habit of IDE-centric development is deeply ingrained and may limit adoption of planning-centric approaches.
- **AI Dependency Risk:** Heavy reliance on OpenRouter API availability, pricing stability, and rate limits. Service disruptions or pricing changes could impact core functionality and user experience.
- **BMAD Method Complexity Risk:** The structured BMAD approach may be perceived as too rigid or bureaucratic for individual developers who value flexibility and rapid iteration.
- **Technical Implementation Risk:** Real-time split-screen interface with chat-artifact synchronization may be more complex than anticipated, potentially affecting performance and user experience.
- **Scope Creep Risk:** The temptation to add advanced features (like the moonshot concepts identified) could delay MVP delivery and compromise the focused individual developer value proposition.

### Open Questions

- **Optimal AI Guidance Balance:** What is the right balance between AI-suggested content and user control for individual developers? How much structure is helpful versus restrictive?
- **Context Management Strategy:** How will the system maintain context across complex branching conversations without overwhelming the user or losing important details?
- **Artifact Versioning Approach:** How should Git integration handle iterative refinement of artifacts? Should each chat update create a new commit or batch changes?
- **User Onboarding Flow:** What is the minimal learning path for developers new to BMAD method? How can we demonstrate value quickly without requiring extensive methodology training?
- **Success Measurement:** How do we quantify "reduced context switching" and "improved project clarity" in measurable ways for individual developers?

### Areas Needing Further Research

- **Individual Developer Workflow Patterns:** Deep research into how solo developers currently manage project planning and what specific pain points they experience most acutely
- **BMAD Method Adaptation:** Investigation into how the BMAD method needs to be adapted for individual developer use cases versus team environments
- **Enhanced Chat Interface Usability:** User testing of interactive list items and expansion dialogs to validate the revolutionary potential identified in brainstorming
- **Competitive Analysis:** Detailed study of existing project management tools for individual developers to identify precise differentiation opportunities
- **Performance Benchmarking:** Technical research into real-time update capabilities and resource requirements for split-screen interfaces

## Appendices

### A. Research Summary

**Brainstorming Session Results (October 5, 2025):**
Comprehensive ideation session using First Principles Thinking, Mind Mapping, Six Thinking Hats, and SCAMPER Method generated 25+ core concepts and identified key themes:

- **Paradigm Shift:** From IDE-based to project management-based AI development
- **Core Innovation:** Enhanced AI chat interfaces with interactive elements  
- **Foundation:** BMAD method as proven framework reduces innovation risk
- **Value Proposition:** "Project manager managing projects rather than supervisor whipping monkeys"
- **Technical Feasibility:** Mockup exists, DSPy capable, OpenRouter proven

**Key Insights Discovered:**
- Fragmentation is the core problem developers face
- Artifact-driven approach aligns perfectly with BMAD methodology
- Enhanced chat interfaces solve context overload problem
- Individual developer focus provides clear market positioning

**Immediate Opportunities Identified:**
1. BMAD Artifact Generation with Enhanced Chat (2-3 months)
2. Split-Screen Artifact Interface (1-2 months)  
3. Template System with Validation (1 month)

### B. Stakeholder Input

**Master's Program Requirements:**
- Project must demonstrate technical competence and innovation
- Timeline aligned with academic completion schedule
- Focus on individual developer use case appropriate for solo thesis work
- Documentation and research components required for academic validation

**Personal Development Goals:**
- Gain expertise in AI-assisted development tools
- Build practical experience with modern development workflows
- Create portfolio-worthy project demonstrating end-to-end development capability
- Explore intersection of project management and AI assistance

### C. References

**Technical Documentation:**
- BMAD-METHOD framework documentation and templates
- DSPy framework documentation for AI service integration
- OpenRouter API documentation for AI model access
- Existing Chiron monorepo structure and configuration

**Research Sources:**
- Individual developer workflow studies and productivity research
- Project management tool analysis for solo developers
- AI-assisted development tool market analysis
- User interface design patterns for real-time collaboration

**Project Resources:**
- Current Chiron codebase (web, server, ai-service applications)
- BMAD agent configurations and templates
- Existing development environment and toolchain
- Academic research resources and methodology guidelines

## Next Steps

### Immediate Actions

1. **Set up technical infrastructure for AI service integration**
   - Configure OpenRouter API access and authentication
   - Implement DSPy framework integration in existing ai-service app
   - Establish WebSocket connections for real-time chat updates
   - Set up database schema for chat history and artifact metadata

2. **Develop enhanced chat interface prototype**
   - Create split-screen layout with artifact display panel
   - Implement interactive list items with expansion dialogs
   - Build real-time synchronization between chat and artifact content
   - Test performance with various artifact sizes and complexity

3. **Implement BMAD artifact generation workflow**
   - Start with Project Brief template and AI generation logic
   - Follow BMAD sequence: Project Brief → PRD → Frontend Spec → Architecture → Epics → Stories
   - Integrate BMAD validation checklists for each artifact type
   - Establish Git integration for artifact versioning and storage

4. **Create user testing framework**
   - Recruit individual developers for early feedback
   - Establish metrics for measuring context switching reduction
   - Develop testing scenarios for complete workflow validation
   - Set up feedback collection and iteration process

5. **Document technical architecture and decisions**
   - Create detailed technical specifications for each component
   - Document API contracts between services
   - Establish coding standards and development workflows
   - Prepare academic research documentation for thesis requirements

### PM Handoff

This Project Brief provides the full context for Chiron. Please start in 'PRD Generation Mode', review the brief thoroughly to work with the user to create the PRD section by section as the template indicates, asking for any necessary clarification or suggesting improvements.

**Key Focus Areas for PM:**
- Individual developer user experience and workflow optimization
- BMAD method integrity while enhancing through AI interface
- Technical feasibility within solo development resource constraints
- Academic timeline alignment with master's program requirements
- MVP scope management to ensure focused delivery

**Critical Success Factors:**
- Maintain the enhanced chat interface as core innovation
- Preserve BMAD method validation and structure
- Ensure individual developer value proposition remains central
- Balance AI guidance with user control appropriately
- Deliver complete planning-to-implementation workflow for solo developers