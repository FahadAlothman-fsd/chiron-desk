# Chiron Technical Architecture - Overview

## Executive Summary

This document presents the comprehensive technical architecture for Chiron, an AI-powered project management tool that transforms individual developer planning through the BMAD methodology. The architecture implements a monorepo structure with three core services: AI Service (Python/FastAPI), Server Service (TypeScript/Hono), and Web Service (React/TypeScript), following a local-first architecture with Git-based artifact storage and OpenRouter API integration.

## Architecture Overview

### System Architecture Pattern
Chiron implements a **Microservices within Monorepo** pattern with clear service separation:

- **AI Service**: Isolated LLM interactions with no database access
- **Server Service**: Single source of truth for data management and business logic
- **Web Service**: React-based frontend with real-time WebSocket communication
- **Git Integration**: Local-first artifact storage with automatic versioning
- **OpenRouter API**: Primary AI provider with DSPy framework orchestration

### Core Architectural Principles

1. **Service Isolation**: AI service has no direct database access
2. **Local-First**: Git-based storage with optional cloud synchronization
3. **Real-Time Synchronization**: WebSocket-based updates across all services
4. **Security by Design**: Encrypted API key storage and secure service communication
5. **Performance Optimization**: Sub-200ms response times and 10,000-line artifact support
6. **Scalability**: Horizontal scaling capabilities for all services
7. **Developer Experience**: TypeScript strict mode and comprehensive tooling
