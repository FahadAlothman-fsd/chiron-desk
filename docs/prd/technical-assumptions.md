# Technical Assumptions

## Repository Structure: Monorepo
Chiron maintains the existing monorepo structure with separate applications for web frontend, server backend, and AI service. This approach ensures shared dependencies, consistent tooling, and simplified deployment while allowing independent scaling of services.

## Service Architecture
**Microservices within Monorepo:** Three core services work together:
- **AI Service** (apps/ai-service/): Dedicated service for DSPy framework integration and OpenRouter API communication, isolated from direct database access
- **Server Service** (apps/server/): Hono-based backend handling all database operations, business logic, and serving as single source of truth
- **Web Service** (apps/web/): React frontend with TypeScript, providing the enhanced chat interface and split-screen artifact display

**Service Communication:** WebSocket-based real-time updates between services, with the server acting as orchestrator and the AI service focusing purely on LLM interactions.

## Testing Requirements
**Unit + Integration Testing:** Comprehensive test coverage including unit tests for individual components, integration tests for service interactions, and end-to-end tests for critical user workflows. Manual testing convenience methods for rapid development iteration.

## Additional Technical Assumptions and Requests

- **OpenRouter Integration:** Primary AI provider with API key management and usage tracking
- **DSPy Framework:** Core AI orchestration for prompt optimization and model management
- **Attachments Library:** File upload and document processing capabilities integrated into chat interfaces
- **Database Access Control:** AI service has no direct database access; all data flows through server service
- **Git Integration:** Automatic artifact versioning with standard Git workflows and commit history
- **WebSocket Implementation:** Real-time synchronization for chat updates and artifact changes
- **Local-First Architecture:** PostgreSQL for structured data with Git for artifact storage
- **Tauri Desktop Wrapper:** Cross-platform desktop application support
- **TypeScript Strict Mode:** All code written in TypeScript with strict type checking
- **Tailwind CSS:** Styling framework with Winter color palette implementation
- **Shadcn Component Registry:** UI component library built on Radix UI primitives
- **OpenCode Integration:** API endpoints for transferring planning artifacts as execution context
- **Rate Limiting:** OpenRouter API quota management and usage controls
- **Error Handling:** Comprehensive error logging with user-friendly messages
- **Security:** Encrypted API key storage and secure communication between services
- **Performance:** Sub-200ms response times for chat interactions
- **Scalability:** Support for artifacts up to 10,000 lines without performance degradation
