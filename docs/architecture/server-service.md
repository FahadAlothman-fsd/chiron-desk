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

### 3. Web Service (apps/web/)

**Technology Stack:**
- Framework: React 19 with TypeScript
- Routing: TanStack Router for type-safe navigation
- State Management: TanStack Query for server state
- Styling: TailwindCSS with Winter color palette
- Components: shadcn/ui with Radix UI primitives
- Desktop: Tauri for cross-platform desktop application
- Real-time: WebSocket client for live updates

**Core Responsibilities:**
- Enhanced chat interface with interactive elements
- Split-screen workspace with real-time synchronization
- Model selection and management UI
- Usage tracking and analytics display
- Artifact viewing and editing interface
- Kanban board for project management

**Component Architecture:**
```typescript
// Web Service Structure
src/
├── main.tsx               # React application entry
├── routeTree.gen.ts       # Generated type-safe routes
├── routes/
│   ├── __root.tsx         # Root layout component
│   ├── index.tsx          # Dashboard/home page
│   ├── projects/
│   │   ├── $projectId.tsx  # Project workspace
│   │   └── models.tsx     # Model management
│   └── settings.tsx       # User settings
├── components/
│   ├── chat/
│   │   ├── ChatInterface.tsx       # Main chat component
│   │   ├── MessageBubble.tsx       # Message display
│   │   ├── InteractiveList.tsx     # Interactive list items
│   │   ├── ModelSelector.tsx       # Model selection UI
│   │   └── UsageTracker.tsx        # Usage display
│   ├── workspace/
│   │   ├── SplitScreen.tsx         # Split-screen layout
│   │   ├── ArtifactViewer.tsx        # Artifact display
│   │   ├── ResizableDivider.tsx    # Panel resizing
│   │   └── WorkspaceHeader.tsx     # Workspace controls
│   ├── kanban/
│   │   ├── KanbanBoard.tsx         # Kanban board component
│   │   ├── TaskCard.tsx             # Task cards
│   │   └── BoardColumn.tsx          # Board columns
│   └── ui/                          # shadcn/ui components
├── lib/
│   ├── trpc.ts            # tRPC client configuration
│   ├── utils.ts           # Utility functions
│   └── constants.ts       # Application constants
├── hooks/
│   ├── useWebSocket.ts    # WebSocket connection hook
│   ├── useArtifacts.ts    # Artifact management hook
│   └── useModels.ts      # Model management hook
└── utils/
    ├── formatters.ts     # Data formatting utilities
    ├── validators.ts      # Client-side validation
    └── constants.ts       # Client constants
```

**Enhanced Chat Interface:**
```typescript
interface ChatInterfaceProps {
    conversationId: string;
    projectId: string;
    onArtifactUpdate: (artifact: Artifact) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
    conversationId,
    projectId,
    onArtifactUpdate
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const { selectedModel, setSelectedModel } = useModelSelection();
    const { tokenUsage, cost } = useUsageTracking();
    
    const trpc = useTrpc();
    const websocket = useWebSocket();
    
    // Real-time message streaming
    const handleSendMessage = async (content: string, attachments?: File[]) => {
        setIsStreaming(true);
        
        try {
            // Send message to server
            const message = await trpc.messages.create.mutate({
                conversationId,
                content,
                attachments,
                model: selectedModel
            });
            
            // Add user message to UI
            setMessages(prev => [...prev, message]);
            
            // Stream AI response
            const stream = await trpc.chat.stream.mutate({
                conversationId,
                messageId: message.id,
                model: selectedModel
            });
            
            // Handle streaming response
            for await (const chunk of stream) {
                if (chunk.type === 'content') {
                    updateStreamingMessage(chunk.content);
                } else if (chunk.type === 'artifact') {
                    onArtifactUpdate(chunk.artifact);
                }
            }
        } catch (error) {
            handleError(error);
        } finally {
            setIsStreaming(false);
        }
    };
    
    return (
        <div className="flex flex-col h-full">
            <ChatHeader 
                model={selectedModel}
                tokenUsage={tokenUsage}
                cost={cost}
                onModelChange={setSelectedModel}
            />
            <MessageList 
                messages={messages}
                isStreaming={isStreaming}
                onRegenerate={handleRegenerate}
            />
            <ChatInput 
                onSendMessage={handleSendMessage}
                isLoading={isStreaming}
                maxTokens={selectedModel.contextWindow}
                currentTokens={tokenUsage.input + tokenUsage.output}
            />
        </div>
    );
};
```

**Split-Screen Workspace:**
```typescript
interface SplitScreenWorkspaceProps {
    projectId: string;
    defaultSplit?: number;
}

const SplitScreenWorkspace: React.FC<SplitScreenWorkspaceProps> = ({
    projectId,
    defaultSplit = 0.5
}) => {
    const [splitPosition, setSplitPosition] = useState(defaultSplit);
    const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
    const [isResizing, setIsResizing] = useState(false);
    
    const handleResize = useCallback((newPosition: number) => {
        setSplitPosition(Math.max(0.2, Math.min(0.8, newPosition)));
    }, []);
    
    const handleArtifactUpdate = useCallback((artifact: Artifact) => {
        setActiveArtifact(artifact);
        // Auto-save to Git
        saveArtifactToGit(artifact);
    }, []);
    
    return (
        <div className="flex h-full bg-charcoal-black">
            {/* Left Panel - Artifacts */}
            <div 
                className="flex flex-col border-r border-slate-gray"
                style={{ width: `${splitPosition * 100}%` }}
            >
                <ArtifactViewer 
                    artifact={activeArtifact}
                    projectId={projectId}
                    onArtifactChange={setActiveArtifact}
                />
            </div>
            
            {/* Resizable Divider */}
            <ResizableDivider 
                isResizing={isResizing}
                onResize={handleResize}
                onResizeStart={() => setIsResizing(true)}
                onResizeEnd={() => setIsResizing(false)}
            />
            
            {/* Right Panel - Chat */}
            <div 
                className="flex flex-col"
                style={{ width: `${(1 - splitPosition) * 100}%` }}
            >
                <ChatInterface 
                    projectId={projectId}
                    onArtifactUpdate={handleArtifactUpdate}
                />
            </div>
        </div>
    );
};
```

## Service Communication Patterns
