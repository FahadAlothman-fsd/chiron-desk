## Environment Configuration

Based on your Vite + tRPC + OpenRouter stack, here's the comprehensive environment configuration for your frontend.

### Environment Variables

Here's the updated list of required environment variables focused on local development:

```bash
# .env.example - Environment variables template (Local Development)

# API Configuration
VITE_API_URL=http://localhost:3001
VITE_WEBSOCKET_URL=ws://localhost:3001

# OpenRouter Configuration (API key stored in DB, not here)
# VITE_OPENROUTER_API_KEY=  # Removed - stored securely in database

# Feature Flags
VITE_ENABLE_DEBUG_MODE=true
VITE_ENABLE_MOCK_API=false
VITE_ENABLE_WORKFLOW_VISUALIZATION=false

# UI Configuration
VITE_DEFAULT_THEME=light  # light, dark, system
VITE_MAX_ARTIFACT_SIZE=10000  # lines
VITE_CHAT_RESPONSE_TIMEOUT=30000  # milliseconds

# Development Settings
VITE_ENABLE_DEVTOOLS=true

# Production Settings (for future use)
VITE_APP_URL=http://localhost:3000
```

**Updated Environment Variable Categories:**

**API and Service Configuration:**
- `VITE_API_URL`: Backend API endpoint for tRPC communication
- `VITE_WEBSOCKET_URL`: WebSocket endpoint for real-time updates
- `VITE_APP_URL`: Application URL for CORS and redirects (local for now)

**Feature Flags:**
- `VITE_ENABLE_DEBUG_MODE`: Enable debug logging and development tools
- `VITE_ENABLE_MOCK_API`: Use mock API responses for development
- `VITE_ENABLE_WORKFLOW_VISUALIZATION`: Enable React Flow visualization (future feature)

**UI and User Experience:**
- `VITE_DEFAULT_THEME`: Default theme (light/dark/system)
- `VITE_MAX_ARTIFACT_SIZE`: Maximum artifact size in lines
- `VITE_CHAT_RESPONSE_TIMEOUT`: Timeout for chat responses in milliseconds

**Development:**
- `VITE_ENABLE_DEVTOOLS`: Enable development tools in development

**Environment-Specific Files:**
```bash
# .env.local - Local development (gitignored)
VITE_API_URL=http://localhost:3001
VITE_WEBSOCKET_URL=ws://localhost:3001
VITE_ENABLE_DEBUG_MODE=true
VITE_ENABLE_DEVTOOLS=true

# .env.production - Future production (when needed)
VITE_API_URL=https://api.your-domain.com
VITE_WEBSOCKET_URL=wss://api.your-domain.com
VITE_APP_URL=https://your-domain.com
VITE_ENABLE_DEBUG_MODE=false
VITE_ENABLE_DEVTOOLS=false
```

**Usage in Application:**
```typescript
// lib/config.ts - Updated environment configuration
export const config = {
  apiUrl: import.meta.env.VITE_API_URL,
  websocketUrl: import.meta.env.VITE_WEBSOCKET_URL,
  features: {
    debugMode: import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true',
    mockApi: import.meta.env.VITE_ENABLE_MOCK_API === 'true',
    workflowVisualization: import.meta.env.VITE_ENABLE_WORKFLOW_VISUALIZATION === 'true',
  },
  ui: {
    defaultTheme: import.meta.env.VITE_DEFAULT_THEME,
    maxArtifactSize: parseInt(import.meta.env.VITE_MAX_ARTIFACT_SIZE || '10000'),
    chatTimeout: parseInt(import.meta.env.VITE_CHAT_RESPONSE_TIMEOUT || '30000'),
  },
  dev: {
    devtools: import.meta.env.VITE_ENABLE_DEVTOOLS === 'true',
  },
  appUrl: import.meta.env.VITE_APP_URL,
} as const;

// Type-safe environment variable access
export type Config = typeof config;
```

**Detailed Rationale:**
This updated configuration provides:
- **Local Focus**: Simplified for local development without unnecessary production concerns
- **Security**: API keys handled through database storage as you specified
- **No Auth Overhead**: Removed JWT and authentication since no login system is needed
- **Essential Features**: Only variables necessary for current development phase
- **Future-Ready**: Structure allows easy addition of production variables when needed

Trade-offs include minimal configuration for now, but it keeps the setup simple and focused on your local development needs while maintaining scalability for future enhancements.
