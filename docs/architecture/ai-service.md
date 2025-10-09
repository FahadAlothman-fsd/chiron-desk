
**Technology Stack:**
- Framework: FastAPI (Python)
- AI Framework: DSPy for prompt optimization
- API Integration: OpenRouter API with rate limiting
- Communication: HTTP/WebSocket with Server Service

**Core Responsibilities:**
- OpenRouter API integration and management
- DSPy framework orchestration and prompt optimization
- Model selection and configuration
- AI response generation and streaming
- Usage tracking and metrics collection
- Error handling and retry logic

**Key Components:**
```python
# Core AI Service Structure
app/
├── main.py                 # FastAPI application entry
├── config.py              # Configuration management
├── routers/
│   ├── health.py          # Health check endpoints
│   ├── models.py          # Model management
│   ├── chat.py            # Chat processing
│   └── usage.py           # Usage tracking
├── services/
│   ├── openrouter.py      # OpenRouter API client
│   ├── dspy_framework.py  # DSPy integration
│   ├── prompt_optimizer.py # Prompt optimization
│   └── rate_limiter.py    # Rate limiting logic
├── models/
│   ├── requests.py         # Request schemas
│   ├── responses.py        # Response schemas
│   └── entities.py         # Domain entities
└── utils/
    ├── security.py         # Security utilities
    ├── logging.py          # Logging configuration
    └── validators.py       # Input validation
```

**OpenRouter Integration Architecture:**
```python
class OpenRouterClient:
    """OpenRouter API client with rate limiting and error handling"""
    
    def __init__(self, api_key: str, base_url: str = "https://openrouter.ai/api/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.session = self._create_session()
        self.rate_limiter = RateLimiter()
        
    async def generate_response(
        self, 
        messages: List[Dict], 
        model: str, 
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> AsyncGenerator[str, None]:
        """Generate streaming response with rate limiting"""
        
        # Rate limiting check
        if not await self.rate_limiter.allow_request():
            raise RateLimitExceededError("Rate limit exceeded")
            
        # DSPy optimization
        optimized_messages = await self.dspy_optimizer.optimize(messages)
        
        # API request with retry logic
        async for chunk in self._stream_with_retry(optimized_messages, model):
            yield chunk
```

### 2. Server Service (apps/server/)

**Technology Stack:**
- Framework: Hono (TypeScript)
- Database: PostgreSQL with Drizzle ORM
- Authentication: JWT-based with API key management
- Communication: tRPC for type-safe API, WebSocket for real-time updates
- File Storage: Git-based artifact storage

**Core Responsibilities:**
- Database operations and data management
- API key management and security
- Git integration and artifact versioning
- WebSocket orchestration for real-time updates
- Business logic and validation
- OpenCode integration endpoints

**Database Schema:**
```sql
-- Core Entities
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    git_repo_path VARCHAR(500),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    provider VARCHAR(50) NOT NULL, -- 'openrouter', 'anthropic', etc.
    key_hash VARCHAR(255) NOT NULL,
    key_preview VARCHAR(8), -- Last 4 characters for identification
    name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    title VARCHAR(255),
    model_used VARCHAR(100),
    context_tokens INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id),
    role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    model VARCHAR(100),
    token_count INTEGER,
    artifacts JSONB, -- Array of artifact references
    attachments JSONB, -- Array of attachment metadata
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    conversation_id UUID REFERENCES conversations(id),
    type VARCHAR(50) NOT NULL, -- 'project-brief', 'prd', 'architecture', etc.
    name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL, -- Git repository path
    content_hash VARCHAR(64), -- SHA-256 hash for versioning
    size_bytes INTEGER,
    metadata JSONB, -- Type-specific metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    api_key_id UUID REFERENCES api_keys(id),
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    request_type VARCHAR(50), -- 'chat', 'completion', 'embedding'
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    cost_usd DECIMAL(10,6) DEFAULT 0,
    response_time_ms INTEGER,
    status VARCHAR(20), -- 'success', 'error', 'rate_limited'
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_conversations_project_id ON conversations(project_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_artifacts_project_id ON artifacts(project_id);
CREATE INDEX idx_usage_metrics_user_id ON usage_metrics(user_id);
CREATE INDEX idx_usage_metrics_created_at ON usage_metrics(created_at);
```

**Service Structure:**
```typescript
// Server Service Architecture
src/
├── index.ts               # Hono application entry
├── config.ts              # Configuration management
├── db/
│   ├── index.ts           # Database connection
│   ├── schema.ts          # Drizzle schema definitions
│   └── migrations/          # Database migrations
├── routers/
│   ├── auth.ts            # Authentication endpoints
│   ├── projects.ts        # Project management
│   ├── conversations.ts   # Chat history management
│   ├── artifacts.ts       # Artifact management
│   ├── api-keys.ts        # API key management
│   ├── usage.ts           # Usage tracking
│   └── opencode.ts        # OpenCode integration
├── services/
│   ├── git.ts             # Git integration service
│   ├── websocket.ts       # WebSocket management
│   ├── security.ts        # Security and encryption
│   ├── rate-limiting.ts   # Rate limiting logic
│   └── validation.ts      # Input validation
├── middleware/
│   ├── auth.ts            # Authentication middleware
│   ├── cors.ts            # CORS handling
│   ├── error.ts           # Error handling
│   └── logging.ts         # Request logging
└── utils/
    ├── encryption.ts      # Encryption utilities
    ├── validators.ts     # Validation helpers
    └── constants.ts       # Application constants
```

**Git Integration Service:**
```typescript
class GitArtifactService {
    private repoPath: string;
    private git: SimpleGit;
    
    constructor(projectPath: string) {
        this.repoPath = projectPath;
        this.git = simpleGit(projectPath);
    }
    
    async initializeRepository(): Promise<void> {
        // Initialize Git repo if it doesn't exist
        if (!await this.git.checkIsRepo()) {
            await this.git.init();
            await this._createInitialCommit();
        }
    }
    
    async saveArtifact(
        artifact: Artifact,
        content: string,
        commitMessage: string
    ): Promise<string> {
        // Save artifact to file system
        const filePath = this._getArtifactPath(artifact);
        await fs.writeFile(filePath, content, 'utf-8');
        
        // Stage and commit changes
        await this.git.add(filePath);
        const commit = await this.git.commit(commitMessage, {
            '--author': `Chiron <chiron@local>`,
            '--date': new Date().toISOString()
        });
        
        return commit.commit;
    }
    
    async getArtifactHistory(artifactId: string): Promise<GitLogResult[]> {
        const filePath = this._getArtifactPathById(artifactId);
        return await this.git.log({ file: filePath });
    }
    
    async getArtifactContentAtCommit(
        artifactId: string, 
        commitHash: string
    ): Promise<string> {
        const filePath = this._getArtifactPathById(artifactId);
        return await this.git.show([`${commitHash}:${filePath}`]);
    }
}
```
