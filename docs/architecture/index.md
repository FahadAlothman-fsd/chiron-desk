# Chiron Technical Architecture - Index

This architecture document has been sharded into focused sections for easier navigation and maintenance.

## Architecture Documents

### [Overview](./overview.md)
Executive summary, system architecture pattern, and core architectural principles.

### [AI Service](./ai-service.md)
Python/FastAPI service architecture, OpenRouter integration, DSPy framework orchestration, and prompt optimization.

### [Server Service](./server-service.md)
TypeScript/Hono backend architecture, database schema, business logic, API key management, and tRPC integration.

### [Web Service](./web-service.md)
React/TypeScript frontend architecture, component structure, enhanced chat interface, and split-screen workspace.

### [Service Communication](./communication.md)
Inter-service communication patterns, tRPC implementation, and real-time data flow.

### [OpenRouter Integration](./openrouter-integration.md)
OpenRouter API client architecture, rate limiting, error handling, and streaming response handling.

### [Git Integration](./git-integration.md)
Git-based artifact storage, repository structure, versioning strategy, and commit management.

### [WebSocket Architecture](./websocket.md)
Real-time synchronization, WebSocket server/client implementation, and event broadcasting.

### [Security Architecture](./security.md)
API key management, encryption, service-to-service authentication, and security best practices.

### [Performance Optimization](./performance.md)
Response time optimization, caching strategies, large artifact handling, and virtual scrolling.

### [Deployment Architecture](./deployment.md)
Container configuration, Docker Compose setup, Nginx configuration, and production deployment.

### [Monitoring and Observability](./monitoring.md)
Health check system, metrics collection, performance monitoring, and analytics.

### [Data Models](./data-models.md)
Conceptual data models, database schema, entities, and relationships.

### [Core Workflows](./workflows.md)
BMAD artifact generation workflow, real-time chat interaction, and sequence diagrams.

### [Coding Standards](./coding-standards.md)
Source tree structure, infrastructure, error handling strategy, coding conventions, test strategy, and security requirements.

## Related Documents

- [PRD](../prd.md) - Product Requirements Document
- [UI Architecture](../ui-architecture.md) - Frontend-specific architecture details
- [Frontend Specification](../front-end-spec.md) - Detailed UI/UX specifications

## Document History

- **v4.0** - Initial sharded architecture (current)
- **v3.0** - Comprehensive monolithic architecture document
