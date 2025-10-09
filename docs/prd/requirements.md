# Requirements

## Functional Requirements

**FR1:** The system shall integrate with OpenRouter API as the primary AI provider, requiring internet connectivity for all AI functionality.

**FR2:** The system shall provide a dedicated models page displaying all available AI models in a table format with their attributes (model name, provider, context window, pricing, capabilities).

**FR3:** The system shall implement an autocomplete model selection interface accessible during project creation and within project chat interfaces.

**FR4:** The system shall support global application-wide model configuration with Chiron-defined defaults that users can override for new projects.

**FR5:** The system shall track and display usage metrics including context usage, billing information, and request counts within chat interfaces for each workflow.

**FR6:** The system shall implement enhanced chat interfaces with interactive list items supporting three interaction types: sequential (affecting subsequent items), independent, and choice (single selection).

**FR7:** The system shall provide skip functionality for interactive list items, allowing users to bypass specific questions or tasks.

**FR8:** The system shall generate BMAD artifacts in sequence: Project Brief → PRD → Frontend Spec → Architecture → Epics → Stories with AI assistance.

**FR9:** The system shall implement split-screen interface displaying real-time artifact updates alongside AI chat conversations.

**FR10:** The system shall store all planning artifacts in Git repository with automatic versioning and commit history.

**FR11:** The system shall integrate with OpenCode to transfer planning artifacts as execution context for AI agents.

**FR12:** The system shall provide Kanban board functionality for tracking project tasks with planning and implementation boards.

**FR13:** The system shall implement DSPy framework for AI service orchestration and prompt optimization.

**FR14:** The system shall utilize the attachments library for handling file uploads and document processing.

**FR15:** The system shall manage API keys for LLM providers with secure storage and configuration management.

**FR16:** The system shall provide real-time chat history storage and retrieval with project-specific conversation threads.

**FR17:** The system shall implement template system with BMAD validation checklists for each artifact type.

**FR18:** The system shall support project creation, deletion, and navigation between different BMAD workflow stages.

**FR19:** The system shall implement WebSocket-based real-time updates for chat interfaces and artifact synchronization.

**FR20:** The system shall implement local-first data storage with optional cloud backup for Git repositories.

## Non-Functional Requirements

**NFR1:** The system shall maintain chat interface response times under 200ms for user interactions.

**NFR2:** The system shall support artifacts up to 10,000 lines without performance degradation in split-screen interface.

**NFR3:** The system shall implement secure API key storage with encryption at rest for LLM provider credentials.

**NFR4:** The system shall maintain WCAG 2.1 AA accessibility standards for all user interfaces.

**NFR5:** The system shall support cross-platform deployment on Windows, macOS, and Linux through Tauri desktop wrapper.

**NFR6:** The system shall implement local-first architecture with optional cloud synchronization for Git repositories.

**NFR7:** The system shall maintain 99% uptime for core functionality with graceful degradation for AI service interruptions.

**NFR8:** The system shall implement rate limiting and quota management for OpenRouter API usage to prevent service abuse.

**NFR9:** The system shall provide data portability through Git-based artifact storage ensuring no vendor lock-in.

**NFR10:** The system shall implement comprehensive error handling with user-friendly error messages and recovery suggestions.

**NFR11:** The system shall maintain backward compatibility with existing Git repositories and standard Git workflows.

**NFR12:** The system shall implement responsive design supporting modern browsers (Chrome, Firefox, Safari, Edge) with mobile-responsive layouts.
