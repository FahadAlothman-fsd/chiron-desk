# Research Workflow Analysis (Phase 0 -> Epic 3)

## 1. Purpose & Distinction

**Purpose:**
The Research Workflow is an **adaptive, evidence-based investigation engine**. Its primary goal is to answer specific strategic or technical questions using **live, verifiable external data**. Unlike Brainstorming, which generates ideas from *internal* creativity and latent knowledge, Research focuses on *external* validation, fact-gathering, and synthesis of real-world information.

**Key Differentiators:**
| Feature | Brainstorming (Epic 2) | Research (Epic 3) |
| :--- | :--- | :--- |
| **Source of Truth** | Internal (User + LLM Knowledge) | External (Web Search, Live Data) |
| **Primary Mode** | Divergent/Convergent Thinking | Discovery/Verification/Synthesis |
| **Validation** | Plausibility / User Preference | Citations / Source Credibility |
| **Output** | List of Ideas / Concepts | Sourced Report / Decision Matrix |
| **Critical Requirement** | Creativity | Anti-Hallucination / Fact-Checking |

## 2. Workflow Structure & Steps

The workflow employs a **Router Pattern**, directing users to specialized paths (Market, Technical, Deep Prompt, etc.) after an initial discovery phase.

### Core Steps (General):
1.  **Readiness Check:** Verify workflow status (if sequenced).
2.  **Discovery & Routing:**
    -   Conversational interface to identify the user's "burning questions".
    -   Classification of research type (Market, Competitor, User, Technical, Domain).
    -   Selection of appropriate instruction set (e.g., `instructions-market.md`, `instructions-technical.md`).
3.  **Scope Definition:** Collaborative definition of boundaries (e.g., geography, market segment, tech constraints).
4.  **Data Gathering (Iterative):**
    -   Systematic execution of `WebSearch` tools.
    -   Extraction of key data points (stats, versions, dates).
    -   Immediate "checkpointing" (sharing findings with user).
5.  **Analysis & Synthesis:**
    -   Application of frameworks (Porter's 5 Forces, SWOT, Comparative Matrix).
    -   Calculation (TAM/SAM/SOM, Estimations).
    -   Triangulation of conflicting data.
6.  **Source Validation (Critical):**
    -   Audit of gathered sources.
    -   Verification of dates (current year focus).
    -   Credibility assessment.
7.  **Report Generation:**
    -   Compilation of findings into a structured Markdown report.
    -   Inclusion of citations and appendices.

## 3. Key Artifacts

The workflow produces distinct artifacts depending on the research path, but all share a common "Evidence-Based" DNA.

### Primary Artifacts:
*   **Research Report (Markdown):** A comprehensive document with Executive Summary, Methodology, Detailed Findings, and References.
*   **Source List:** A structured collection of verified URLs, titles, and access dates.

### Specialized Data Models (by Type):
*   **Market Research:**
    *   `Market Sizing Model` (TAM/SAM/SOM calculations).
    *   `Competitor Profiles` (Funding, Features, Pricing).
    *   `Customer Personas` (Demographics, JTBD).
    *   `Porter's 5 Forces Analysis`.
*   **Technical Research:**
    *   `Comparison Matrix` (Feature vs. Option).
    *   `Trade-off Analysis` (Weighted decision factors).
    *   `Architecture Decision Record (ADR)`.
    *   `Tech Profiles` (Version, Maturity, Ecosystem).

## 4. Proposed Data Structure (JSON Schema)

To support the Artifact Workbench, we need a robust state object to track the research session.

```json
{
  "session_id": "uuid",
  "research_type": "market | technical | deep-prompt | competitor",
  "status": "in_progress | completed",
  "metadata": {
    "user_name": "string",
    "date": "ISO-8601",
    "topic": "string"
  },
  "scope": {
    "objectives": ["string"],
    "questions": ["string"],
    "constraints": ["string"],
    "boundaries": {
      "geography": "string",
      "segments": ["string"],
      "technical_stack": ["string"]
    }
  },
  "sources": [
    {
      "id": "src_1",
      "url": "https://...",
      "title": "string",
      "publisher": "string",
      "date_published": "string",
      "date_accessed": "ISO-8601",
      "credibility_score": "high | medium | low",
      "relevant_for": ["claim_id_1", "claim_id_2"]
    }
  ],
  "findings": [
    {
      "id": "find_1",
      "content": "string (the fact/insight)",
      "type": "fact | statistic | quote | analysis",
      "source_ids": ["src_1"],
      "confidence": "high | medium | low",
      "tags": ["market-size", "competitor-a"]
    }
  ],
  "entities": {
    "competitors": [
      { "name": "Comp A", "pricing": "...", "features": ["..."] }
    ],
    "technologies": [
      { "name": "Tech A", "version": "1.0", "pros": ["..."], "cons": ["..."] }
    ]
  },
  "analysis": {
    "tam_sam_som": { ... },
    "comparison_matrix": {
      "columns": ["Tech A", "Tech B"],
      "rows": ["Performance", "Cost"],
      "cells": [ ... ]
    }
  }
}
```

## 5. UI Patterns & Recommendations for Epic 3

The Artifact Workbench for Research requires specific UI components to handle the density of information and the requirement for verification.

### Essential UI Patterns:
1.  **Citation Manager / Source Inbox:**
    *   A side panel listing all active sources.
    *   Ability to "pin" sources.
    *   Visual indicators for credibility (e.g., green check for verified, yellow for old).
2.  **Split-View "Browser":**
    *   Since `WebSearch` is central, the UI should ideally visualize the search results or the "reading" of a page alongside the chat/analysis.
3.  **Data Extraction Cards:**
    *   When a finding is made, it should appear as a "Card" (like an "Insight Card") that can be dragged into the report or pinned.
    *   Cards must have visible source links.
4.  **Comparison Table Builder:**
    *   A grid view for populating Competitor or Tech comparison matrices.
    *   Cells should support "link to source" tooltips.
5.  **Report Preview with "Live Citations":**
    *   As the report is generated, citations `[1]` should be clickable/hoverable to show the source details immediately.
6.  **"Confidence" Badges:**
    *   Visual tagging of claims: `[Verified]`, `[Estimating]`, `[Low Confidence]`.

### Implementation Recommendations:
*   **State Management:** The `research` state is more complex than brainstorming. Use a dedicated store that separates *raw data* (sources/findings) from *synthesized output* (the report).
*   **Anti-Hallucination UI:** Implement a UI warning if the LLM adds a claim without linking it to an existing Source ID in the store.
*   **Export:** The final artifact is a Markdown file, but the *research session* (with all sources and raw findings) should be exportable as a JSON "Research Dossier" for future reference.
