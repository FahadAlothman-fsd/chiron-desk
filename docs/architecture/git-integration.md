
### 1. Git-Based Artifact Storage

**Repository Structure:**
```
chiron-projects/
├── .git/                    # Git repository metadata
├── .chiron/                 # Chiron-specific configuration
│   ├── config.json         # Project configuration
│   └── templates/          # BMAD templates
├── projects/                # Project directories
│   ├── project-1/          # Individual project
│   │   ├── project-brief.md
│   │   ├── prd.md
│   │   ├── frontend-spec.md
│   │   ├── architecture.md
│   │   ├── epics/
│   │   │   ├── epic-1.md
│   │   │   └── epic-2.md
│   │   └── stories/
│   │       ├── story-1.md
│   │       └── story-2.md
│   └── project-2/
└── archives/               # Archived projects
```

**Git Integration Service:**
```typescript
interface GitArtifactServiceConfig {
    basePath: string;
    autoCommit: boolean;
    commitMessageTemplate: string;
    userName: string;
    userEmail: string;
}

class GitArtifactService {
    private config: GitArtifactServiceConfig;
    private git: SimpleGit;
    
    constructor(config: GitArtifactServiceConfig) {
        this.config = config;
        this.git = simpleGit(config.basePath);
    }
    
    async initializeProjectRepository(projectId: string): Promise<void> {
        const projectPath = path.join(this.config.basePath, 'projects', projectId);
        
        // Ensure directory exists
        await fs.ensureDir(projectPath);
        
        // Initialize Git repository if needed
        if (!await this.git.checkIsRepo()) {
            await this.git.init();
            await this._configureGit();
        }
        
        // Create initial project structure
        await this._createProjectStructure(projectId);
        
        // Create initial commit
        await this._createInitialCommit(projectId);
    }
    
    async saveArtifact(
        projectId: string,
        artifact: Artifact,
        content: string,
        metadata?: ArtifactMetadata
    ): Promise<GitSaveResult> {
        const filePath = this._getArtifactPath(projectId, artifact);
        
        // Write content to file
        await fs.writeFile(filePath, content, 'utf-8');
        
        // Generate commit message
        const commitMessage = this._generateCommitMessage(artifact, metadata);
        
        // Stage and commit changes
        await this.git.add(filePath);
        const commitResult = await this.git.commit(commitMessage, {
            '--author': `${this.config.userName} <${this.config.userEmail}>`,
            '--date': new Date().toISOString()
        });
        
        // Create artifact version record
        const version: ArtifactVersion = {
            commitHash: commitResult.commit,
            timestamp: new Date(),
            artifactId: artifact.id,
            filePath: filePath,
            size: content.length,
            metadata: metadata
        };
        
        return {
            success: true,
            commitHash: commitResult.commit,
            version: version
        };
    }
    
    async getArtifactHistory(
        projectId: string, 
        artifactId: string,
        limit: number = 10
    ): Promise<ArtifactVersion[]> {
        const filePath = this._getArtifactPath(projectId, { id: artifactId } as Artifact);
        
        // Get Git log for the specific file
        const log = await this.git.log({ 
            file: filePath,
            maxCount: limit 
        });
        
        // Convert Git log to artifact versions
        return log.all.map(commit => ({
            commitHash: commit.hash,
            timestamp: new Date(commit.date),
            artifactId: artifactId,
            filePath: filePath,
            commitMessage: commit.message,
            author: commit.author_name,
            size: 0 // Will be populated when needed
        }));
    }
    
    async getArtifactContentAtVersion(
        projectId: string,
        artifactId: string,
        commitHash: string
    ): Promise<string> {
        const filePath = this._getArtifactPath(projectId, { id: artifactId } as Artifact);
        
        // Get file content at specific commit
        try {
            return await this.git.show([`${commitHash}:${filePath}`]);
        } catch (error) {
            throw new Error(`Failed to retrieve artifact content: ${error.message}`);
        }
    }
    
    private _generateCommitMessage(
        artifact: Artifact, 
        metadata?: ArtifactMetadata
    ): string {
        const template = this.config.commitMessageTemplate;
        const artifactType = artifact.type.replace('-', ' ').toUpperCase();
        
        return template
            .replace('{artifact_type}', artifactType)
            .replace('{artifact_name}', artifact.name)
            .replace('{timestamp}', new Date().toISOString())
            .replace('{user_action}', metadata?.userAction || 'generated')
            .replace('{ai_model}', metadata?.aiModel || 'unknown');
    }
    
    private async _createProjectStructure(projectId: string): Promise<void> {
        const projectPath = path.join(this.config.basePath, 'projects', projectId);
        
        // Create standard BMAD directories
        const directories = [
            'epics',
            'stories',
            'docs',
            'templates'
        ];
        
        for (const dir of directories) {
            await fs.ensureDir(path.join(projectPath, dir));
        }
        
        // Create initial README
        const readmeContent = `# ${projectId}\n\nGenerated by Chiron - AI-powered project management\n\n## BMAD Artifacts\n\n- [ ] Project Brief\n- [ ] Product Requirements Document (PRD)\n- [ ] Frontend Specification\n- [ ] Architecture Document\n- [ ] Epics\n- [ ] User Stories\n`;
        
        await fs.writeFile(
            path.join(projectPath, 'README.md'),
            readmeContent,
            'utf-8'
        );
    }
}
```

## WebSocket Real-Time Architecture

### 1. WebSocket Server Implementation

**Server-Side WebSocket Manager:**
```typescript
interface WebSocketConnection {
    id: string;
    userId: string;
    projectIds: string[];
    socket: WebSocket;
    lastPing: Date;
    subscriptions: Set<string>;
}

class WebSocketManager {
    private connections: Map<string, WebSocketConnection> = new Map();
    private eventBus: EventEmitter = new EventEmitter();
    
    constructor(private server: Server) {
        this.initializeWebSocketServer();
        this.setupEventHandlers();
    }
    
    private initializeWebSocketServer(): void {
        this.server.ws('/ws', {
            // Connection opened
            open: (ws, req) => {
                const connectionId = this.generateConnectionId();
                const userId = this.extractUserId(req);
                
                const connection: WebSocketConnection = {
                    id: connectionId,
                    userId,
                    projectIds: [],
                    socket: ws,
                    lastPing: new Date(),
                    subscriptions: new Set()
                };
                
                this.connections.set(connectionId, connection);
                this.send(connectionId, 'connection:established', { connectionId });
            },
            
            // Message received
            message: (ws, message) => {
                this.handleMessage(ws, message);
            },
            
            // Connection closed
            close: (ws, code, reason) => {
                this.handleDisconnection(ws);
            },
            
            // Ping/pong for connection health
            ping: (ws) => {
                const connection = this.getConnectionBySocket(ws);
                if (connection) {
                    connection.lastPing = new Date();
                }
            }
        });
        
        // Set up periodic ping to keep connections alive
        setInterval(() => this.pingConnections(), 30000);
    }
    
    private setupEventHandlers(): void {
        // Listen to system events and broadcast to relevant connections
        this.eventBus.on('artifact:updated', (artifact: Artifact) => {
            this.broadcastToProject(
                artifact.projectId,
                'artifact:updated',
                artifact
            );
        });
        
        this.eventBus.on('message:created', (message: Message) => {
            this.broadcastToConversation(
                message.conversationId,
                'message:created',
                message
            );
        });
        
        this.eventBus.on('usage:updated', (usage: UsageMetrics) => {
            this.broadcastToUser(
                usage.userId,
                'usage:updated',
                usage
            );
        });
    }
    
    private handleMessage(ws: WebSocket, message: RawData): void {
        try {
            const data = JSON.parse(message.toString());
            const { type, payload } = data;
            
            switch (type) {
                case 'subscribe:project':
                    this.handleProjectSubscription(ws, payload);
                    break;
                case 'subscribe:conversation':
                    this.handleConversationSubscription(ws, payload);
                    break;
                case 'subscribe:usage':
                    this.handleUsageSubscription(ws, payload);
                    break;
                case 'ping':
                    this.handlePing(ws);
                    break;
                default:
                    this.sendError(ws, 'Unknown message type');
            }
        } catch (error) {
            this.sendError(ws, 'Invalid message format');
        }
    }
    
    private handleProjectSubscription(ws: WebSocket, payload: any): void {
        const connection = this.getConnectionBySocket(ws);
        if (!connection) return;
        
        const { projectId } = payload;
        
        // Add project to connection's project list
        if (!connection.projectIds.includes(projectId)) {
            connection.projectIds.push(projectId);
        }
        
        // Subscribe to project events
        connection.subscriptions.add(`project:${projectId}`);
        
        // Send confirmation
        this.send(connection.id, 'subscribe:project:confirmed', { projectId });
        
        // Send current project state
        this.sendProjectState(connection.id, projectId);
    }
    
    broadcastToProject(projectId: string, event: string, data: any): void {
        this.connections.forEach((connection) => {
            if (connection.projectIds.includes(projectId)) {
                this.send(connection.id, event, data);
            }
        });
    }
    
    broadcastToConversation(conversationId: string, event: string, data: any): void {
        this.connections.forEach((connection) => {
            if (connection.subscriptions.has(`conversation:${conversationId}`)) {
                this.send(connection.id, event, data);
            }
        });
    }
    
    broadcastToUser(userId: string, event: string, data: any): void {
        this.connections.forEach((connection) => {
            if (connection.userId === userId) {
                this.send(connection.id, event, data);
            }
        });
    }
    
    private send(connectionId: string, event: string, data: any): void {
        const connection = this.connections.get(connectionId);
        if (!connection || connection.socket.readyState !== WebSocket.OPEN) {
            return;
        }
        
        try {
            connection.socket.send(JSON.stringify({ event, data }));
        } catch (error) {
            console.error('Failed to send WebSocket message:', error);
            this.removeConnection(connectionId);
        }
    }
}
```
