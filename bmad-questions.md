 ## 2. Module System

  **What are the three modules?**

  **BMM (Business Methodology Module):**
  - Full name and purpose?
  - What does it help users accomplish?
  - File path: bmad/bmm/ - what's inside?
  - When would a user invoke BMM workflows?

  **CIS (Creative Innovation System):**
  - Full name and purpose?
  - What creative techniques does it provide?
  - File path: bmad/cis/ - what's inside?
  - How does it integrate with BMM?

  **BMB (BMAD Method Builder):**
  - Full name and purpose?
  - What does "builder" mean here?
  - File path: bmad/bmb/ - what's inside?
  - Who uses BMB and for what?

  ## 3. Workflow System

  **How do workflows work?**
  - What is a workflow in BMAD terms?
  - File structure: workflow.yaml + instructions.md + template.md?
  - How are workflows invoked? (Commands, slash commands, agents?)
  - Can you show me 3 example workflow paths with their purposes?

  **Workflow types:**
  - Template workflows vs action workflows?
  - What's the difference in execution?
  - Examples of each type?

  **Workflow composition:**
  - How do workflows call other workflows? (<invoke-workflow>?)
  - How does variable/context inheritance work?
  - Can you show an example workflow chain?

  ## 4. Agent System

  **What are agents in BMAD?**
  - File path: bmad/bmm/agents/ or .claude/agents/?
  - How many agents exist in v6?
  - What does each agent specialize in?

  **Agent invocation:**
  - How does a user load/use an agent?
  - Do agents run workflows automatically?
  - Can multiple agents run simultaneously? (or strictly sequential?)

  **Agent examples:**
  - What does the Analyst agent do?
  - What does the Dev agent do?
  - What does the Architect agent do?
  - Can you show file paths for these agents?

  ## 5. 4-Phase Methodology (BMM)

  **Phase breakdown:**
  - Phase 1: Analysis - what workflows? what outputs?
  - Phase 2: Planning - what workflows? what outputs?
  - Phase 3: Solutioning - what workflows? what outputs?
  - Phase 4: Implementation - what workflows? what outputs?

  **Phase progression:**
  - How does a user move between phases?
  - Is it strictly linear or can they jump around?
  - What determines phase completion?

  **File paths:**
  - Where are phase workflows defined?
  - Show me the actual paths for key workflows in each phase

  ## 6. Project Types & Levels

  **I see "greenfield-level-3" in workflow-status:**
  - What project types exist? (greenfield, brownfield, game?)
  - What do the levels mean? (1, 2, 3, 4, 5?)
  - How does project type/level affect workflow selection?

  **File paths:**
  - Where are workflow paths defined? (greenfield-level-3.yaml?)
  - Show me the path structure

  ## 7. Status & Tracking

  **workflow-status.md:**
  - What information does it track?
  - How is it used by other workflows?
  - Is this the "single source of truth" for project state?

  **sprint-status.yaml:**
  - What is this for?
  - How does it relate to workflow-status?
  - Story tracking system?

  ## 8. What's NEW in v6?

  **Version history:**
  - What was BMAD like before v6?
  - What are the major changes/improvements in v6 alpha?
  - What's still alpha/experimental?
  - What's the roadmap to stable v6?

  ## 9. User Journey

  **End-to-end example:**
  - New user installs BMAD v6
  - They want to build a web application
  - Walk me through the actual commands/steps they take
  - What workflows run? What artifacts get generated?
  - How do they progress through the 4 phases?

  **Provide actual file paths and command examples**

  ## 10. Technical Architecture

  **Execution engine:**
  - How does bmad/core/tasks/workflow.xml work?
  - What calls this engine?
  - How are workflows parsed and executed?

  **Integration with Claude Code:**
  - How does BMAD integrate with Claude Code specifically?
  - Slash commands in .claude/commands/?
  - How do they connect to bmad/ workflows?

  **File storage:**
  - Where do generated artifacts go? (docs/ folder?)
  - How are they organized?
  - Version control strategy?
