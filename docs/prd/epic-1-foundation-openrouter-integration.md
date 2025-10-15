# Epic 1: Foundation & OpenRouter Integration with Per-User API Key Management

This epic establishes the core technical infrastructure for Chiron, focusing on OpenRouter API integration with a comprehensive per-user API key management system. The implementation creates a secure architecture where individual users manage their own API keys through a database-backed system with secure service-to-service communication, while establishing the architectural pattern where the AI service remains isolated from direct database access.

## Story 1.1: Configure OpenRouter API Integration with Provider Abstraction ✅

As a developer,
I want to establish OpenRouter API connection with proper authentication and error handling using a provider abstraction layer that supports request-scoped API keys,
so that the system can reliably access AI models through OpenRouter now and support additional providers (OpenAI, Anthropic, etc.) in the future without major refactoring, while enabling secure per-user API key management.

**Acceptance Criteria:**
1. OpenRouter API client is implemented with proper authentication using request-scoped API keys
2. API connection includes comprehensive error handling for network failures, authentication errors, and rate limiting
3. System can successfully retrieve available models list from OpenRouter API
4. API responses are properly parsed and validated against expected schema
5. Connection includes timeout configuration and retry logic for reliability
6. Error messages are user-friendly and provide actionable guidance for common issues
7. API usage is logged for debugging and monitoring purposes
8. **Provider abstraction layer exists to support future AI providers without refactoring existing code**
9. **API keys are accepted per-request rather than from environment variables to support per-user API key management**

**Status:** Ready for Review (183 tests passing)

## Story 1.2: API Key Management System

As a system administrator,
I want to securely store and manage AI provider API keys in the database,
so that users can safely use their own API keys and the system can support multiple providers with proper key rotation and validation.

**Acceptance Criteria:**
1. Database schema supports encrypted storage of API keys for multiple providers
2. CRUD operations exist for API key management (create, read, update, delete)
3. API keys are encrypted at rest using industry-standard encryption
4. System validates API keys before storing them (format verification, test call)
5. API key metadata includes provider, creation date, last used, and status
6. Support for API key rotation without service interruption
7. Audit logging for all API key operations
8. Soft delete for API keys to maintain audit trail

**Status:** Draft

## Story 1.3: API Key UI & User Experience

As a user,
I want to manage my AI provider API keys through an intuitive web interface,
so that I can easily add, validate, and monitor my API keys without technical complexity.

**Acceptance Criteria:**
1. User-friendly form for adding new API keys with provider selection
2. Real-time API key validation with immediate feedback
3. Dashboard showing all API keys with status and usage information
4. Edit and delete functionality for existing API keys
5. Visual indicators for key status (active, expired, invalid)
6. Usage analytics and last used timestamps
7. Responsive design for mobile and desktop
8. Accessible design following WCAG 2.1 AA standards

**Status:** Draft

## Story 1.4: Secure Service Integration

As a system architect,
I want to establish secure communication between the Hono server and AI service with request-scoped API key passing,
so that users can use their own API keys securely and the system can handle per-user scenarios with proper authentication and authorization.

**Acceptance Criteria:**
1. Secure service-to-service authentication between Hono and AI service
2. Request-scoped API key passing from Hono to AI service
3. Proper API key validation and sanitization
4. Rate limiting per user/API key combination
5. Audit logging for all API key usage
6. Error handling that doesn't expose sensitive information
7. Support for multiple providers with different authentication schemes
8. Circuit breaker pattern for resilience

**Status:** Draft

## Story 1.5: Implement DSPy Framework Integration

As a developer,
I want to integrate DSPy framework for AI orchestration and prompt optimization,
so that the system can provide structured, reliable AI interactions for BMAD artifact generation.

**Acceptance Criteria:**
1. DSPy framework is properly installed and configured in the AI service
2. Basic DSPy modules are implemented for text generation and structured output
3. Prompt templates are created for initial BMAD artifact types (Project Brief, PRD)
4. DSPy optimization features are configured to improve response quality
5. Framework integration includes proper error handling and fallback mechanisms
6. DSPy modules can be easily extended for new artifact types
7. Performance metrics are captured for DSPy operations

**Status:** Draft

## Story 1.6: Establish AI Service Architecture Pattern

As a developer,
I want to establish the architectural pattern where AI service has no direct database access,
so that the server service remains the single source of truth for data management.

**Acceptance Criteria:**
1. AI service is configured to communicate only with server service, not directly with database
2. Server service exposes necessary API endpoints for AI service data requirements
3. Communication between services uses secure authentication and authorization
4. AI service can request and receive all necessary data through server service APIs
5. Error handling is implemented for service-to-service communication failures
6. Service architecture is documented with clear separation of responsibilities
7. Integration tests verify the architectural pattern works correctly

**Status:** Draft

## Story 1.7: Create Basic Model Information Retrieval

As a user,
I want to see basic information about available AI models,
so that I can understand what models are accessible through the system.

**Acceptance Criteria:**
1. System successfully retrieves and displays model names from OpenRouter API
2. Basic model attributes (provider, context window size) are shown
3. Model information is cached to reduce API calls and improve performance
4. Cache invalidation strategy ensures model information stays current
5. Error handling provides graceful fallback when model information is unavailable
6. Model data is structured for easy extension with additional attributes
7. Interface provides clear feedback during model information loading

**Status:** Draft

## Story 1.8: Implement Health Check and Monitoring

As a developer,
I want to implement health check endpoints and basic monitoring,
so that I can verify all services are running correctly and monitor system status.

**Acceptance Criteria:**
1. Health check endpoint returns status for all core services (web, server, AI)
2. OpenRouter API connectivity is verified as part of health check
3. Health check includes database connectivity verification for server service
4. Monitoring provides basic metrics (response times, error rates, API usage)
5. Health check results are logged with appropriate detail levels
6. System provides clear visual indicators when services are unhealthy
7. Monitoring data is structured for future analytics and alerting systems

**Status:** Draft

## Architecture Overview

### Per-User API Key Management Flow
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User A        │    │   User B        │    │   User C        │
│                 │    │                 │    │                 │
│ OpenRouter Key  │    │ OpenAI Key      │    │ Anthropic Key   │
│ sk-or-v1-...    │    │ sk-...          │    │ sk-ant-...      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Chiron App    │
                    │   (Single       │
                    │   Instance)     │
                    │                 │
                    │ ┌─────────────┐ │
                    │ │ Database    │ │
                    │ │ (Encrypted  │ │
                    │ │  API Keys)  │ │
                    │ └─────────────┘ │
                    └─────────────────┘
```

### Service Communication Pattern
```
Frontend → Hono Server → Database → AI Service → OpenRouter
    ↓           ↓            ↓         ↓           ↓
  UI Form    Get Encrypted   Pass Key   Use Key    Make Request
           Key from DB    in Header   per Request
```

## Key Technical Decisions

### 1. Per-User Authentication
- Each user manages their own API keys
- No shared API keys or credentials
- User data isolation and privacy
- Individual cost management per user

### 2. Database-Backed Storage
- API keys encrypted at rest
- No environment variables for sensitive data
- Audit trail for all key operations
- Support for key rotation and updates

### 3. Provider Abstraction
- Clean interface for multiple AI providers
- Easy addition of new providers (OpenAI, Anthropic, etc.)
- Consistent error handling across providers
- Provider-specific optimizations

### 4. Service Architecture
- AI service has no direct database access
- Secure service-to-service communication
- Request-scoped API key passing
- Comprehensive audit logging

## Implementation Phases

**Phase 1: Foundation (Stories 1.1-1.4)**
- Core API integration with provider abstraction
- Database-backed API key management
- User interface for key management
- Secure service integration

**Phase 2: Enhancement (Stories 1.5-1.8)**
- DSPy framework integration
- Architecture pattern establishment
- Model information and UI
- Health monitoring and observability

## Success Metrics

- Users can successfully add and use their own API keys
- No API key exposure in logs or client-side code
- Support for multiple AI providers
- Reliable service communication with proper error handling
- Comprehensive audit trail for compliance
- Performance meets latency and throughput targets