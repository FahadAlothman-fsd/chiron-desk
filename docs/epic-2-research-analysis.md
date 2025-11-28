# Epic 2 Research Analysis: Phase 0 & Artifact Workbench

**Date:** November 23, 2025  
**Status:** FINALIZED  
**Scope:** Phase 0 Implementation (Brainstorming), Artifact Workbench Architecture, Schema Refactoring

---

## 1. Core Architectural Decisions

### 1.1 "No-Doc-Store" Principle
*   **Database:** Stores the "Map" (Metadata, Pointers, Chat History, Variables).
*   **Git Repo:** Stores the "Territory" (Actual Content/Artifacts).
*   **Workbench:** Visualizes the process.
    *   **Draft State:** Rendered from DB Variables + Template (Preview).
    *   **Final State:** Committed file in Git.

### 1.2 Unified Workflow Model
We are moving to a unified schema where **Techniques** and **Analysis Methods** are also Workflows.

*   **Workflows Table:** Stores *everything* (Project Init, Brainstorming, SCAMPER, Risk Analysis).
*   **Distinction:** Handled via `tags.type`.

### 1.3 Schema Refactoring (`workflows` table)
We are simplifying the `workflows` table to remove legacy columns and add flexible JSONB configuration.

**Removed Columns:** `module`, `agentId`, `initializerType`, `isStandalone`, `requiresProjectContext`.

**New Columns:**
*   `tags`: JSONB (Queryable classification)
*   `metadata`: JSONB (Configuration flags)

**Tags Schema:**
```typescript
type WorkflowTags = {
  type: "initializer" | "standard" | "technique" | "automation";
  module: "core" | "cis" | "bmm";
  context?: "new-project" | "existing-project"; // For initializers
  category?: string; // e.g. "creative", "risk"
  energy?: "high" | "low";
  mode?: "interactive" | "automated";
};
```

**Metadata Schema:**
```typescript
type WorkflowMetadata = {
  defaultAgentId?: string;
  acceptsContextDocument?: boolean;
  contextVariableName?: string;
  // ... future flags
};
```

---

## 2. UI/UX Patterns

### 2.1 Routing Logic
The frontend routes based on `tags.type`:
*   `initializer` -> **Wizard UI** (Step-by-step, full screen).
*   `standard` -> **Artifact Workbench** (Split screen: Chat + Preview).
*   `technique` -> **Dialog/Modal** (Invoked within Workbench).
*   `automation` -> **Background Process** (Invisible).

### 2.2 Artifact Workbench Components
1.  **Chat Timeline (Left):**
    *   Acts as the "Audit Trail" / "Cause".
    *   Renders **Action Lists** (Technique Execution).
    *   Renders **Approval Gates** (Variable updates).
    *   Renders **Kanban/Forms** (Ax Generators).
2.  **Live Preview (Right):**
    *   Renders the Artifact from `template.md` + DB Variables.
    *   Updates in real-time via `artifactOutput` mapping.
    *   Scrolls/Highlights based on Chat focus.

---

## 3. Brainstorming Workflow Specification

**Type:** `standard`  
**Goal:** Generate a "Brainstorming Results" artifact.

### **Step 1: Setup & Selection**
*   **UI:** Chat.
*   **Tools:**
    *   `set_session_topic` (Blocking).
    *   `set_stated_goals` (Blocking).
    *   `select_techniques` (Ax Generator - Multi Select).
*   **Source:** Queries `workflows` table (`type: technique`).

### **Step 2: Execution Loop**
*   **Logic:** Iterates through selected techniques.
*   **Action:** Invokes Child Workflows (e.g., `technique-scamper`).
*   **UI:** Renders an **Action List** in chat. User clicks to open **Dialogs**.
*   **Output:** Aggregates `captured_ideas` into structured array.

### **Step 3: Convergence & Analysis**
*   **Part A: Organize (Convergence)**
    *   **UI:** **Kanban Board** (Ax Generator).
    *   **Action:** User drags raw ideas into "Immediate", "Future", "Moonshot".
    *   **Result:** Clean, prioritized lists.
*   **Part B: Select Analysis**
    *   **Action:** Agent recommends analysis methods based on priorities.
    *   **Source:** Queries `workflows` table (`type: analysis`).

### **Step 4: Analysis Loop**
*   **Logic:** Iterates through selected analysis methods.
*   **Action:** Invokes Child Workflows (e.g., `analysis-risk-scan`).
*   **Type:** Automated (`ax-generate`).
*   **Input:** The *Clean* list from Step 3.

### **Step 5: Planning**
*   **UI:** **Editable Form List** (Ax Generator).
*   **Action:** AI drafts plans (Rationale, Timeline); User edits/approves.
*   **Input:** Priorities + Analysis Insights + Chat Context.

### **Step 6: Reflection**
*   **UI:** Chat + Summary Tool.
*   **Input:** Full Chat History (System Injected).

### **Step 7: Completion**
*   **Action:** Git Commit.

---

## 4. Migration & Implementation Plan

### **Phase 1: Foundation (Days 1-3)**
1.  **Refactor Schema:** Update `workflows` table (add tags/metadata, remove old cols).
2.  **Update Seeds:** Refactor `workflow-init-new` to use new schema.
3.  **Seed Techniques:** Migrate `brain-methods.csv` and `adv-elicit-methods.csv` into `workflows` table entries.

### **Phase 2: Workflow Engine (Days 4-7)**
1.  **Implement `ax-generation` Step:** Handle JSON schema outputs.
2.  **Implement `invoke-workflow`:** Add Iterator logic and Output Mapping.
3.  **Implement Artifact Mapping:** Add `artifactOutput` handler to `ExecuteAction`.

### **Phase 3: UI Components (Days 8-10)**
1.  **Artifact Workbench:** Split pane layout + Template Rendering.
2.  **Action List Component:** For Step 2 execution.
3.  **Kanban Component:** For Step 3 convergence.
4.  **Action Plan Form:** For Step 5 planning.

### **Phase 4: Assembly (Days 11-14)**
1.  **Configure Brainstorming:** Write the full JSON config.
2.  **Test E2E:** Run the full session.

---

This plan covers all requirements, respects the architectural constraints, and delivers the high-quality "Artifact Workbench" experience.