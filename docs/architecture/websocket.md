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

### 2. Client-Side WebSocket Integration

**React Hook for WebSocket:**
```typescript
interface UseWebSocketOptions {
    projectId?: string;
    conversationId?: string;
    onArtifactUpdate?: (artifact: Artifact) => void;
    onMessageUpdate?: (message: Message) => void;
    onUsageUpdate?: (usage: UsageMetrics) => void;
    autoConnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions) {
    const {
        projectId,
        conversationId,
        onArtifactUpdate,
        onMessageUpdate,
        onUsageUpdate,
        autoConnect = true
    } = options;
    
    const [connectionState, setConnectionState] = useState<WebSocketState>('disconnected');
    const [lastMessage, setLastMessage] = useState<any>(null);
    const [error, setError] = useState<Error | null>(null);
    
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    
    const connect = useCallback(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            return; // Already connected
        }
        
        const websocketUrl = `${import.meta.env.VITE_WEBSOCKET_URL}/ws`;
        
        try {
            ws.current = new WebSocket(websocketUrl);
            
            ws.current.onopen = () => {
                console.log('WebSocket connected');
                setConnectionState('connected');
                setError(null);
                reconnectAttempts.current = 0;
                
                // Subscribe to relevant channels
                if (projectId) {
                    subscribeToProject(projectId);
                }
                if (conversationId) {
                    subscribeToConversation(conversationId);
                }
            };
            
            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleWebSocketMessage(data);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };
            
            ws.current.onclose = () => {
                console.log('WebSocket disconnected');
                setConnectionState('disconnected');
                ws.current = null;
                
                // Attempt reconnection
                if (reconnectAttempts.current < maxReconnectAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
                    reconnectAttempts.current++;
                    
                    reconnectTimeout.current = setTimeout(() => {
                        console.log(`Attempting reconnection ${reconnectAttempts.current}/${maxReconnectAttempts}`);
                        connect();
                    }, delay);
                }
            };
            
            ws.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                setError(new Error('WebSocket connection failed'));
                setConnectionState('error');
            };
            
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            setError(error as Error);
            setConnectionState('error');
        }
    }, [projectId, conversationId]);
    
    const handleWebSocketMessage = useCallback((data: any) => {
        const { event, data: messageData } = data;
        
        setLastMessage(data);
        
        switch (event) {
            case 'artifact:updated':
                onArtifactUpdate?.(messageData);
                break;
            case 'message:created':
                onMessageUpdate?.(messageData);
                break;
            case 'usage:updated':
                onUsageUpdate?.(messageData);
                break;
            case 'connection:established':
                console.log('Connection established:', messageData);
                break;
            default:
                console.log('Unknown WebSocket event:', event);
        }
    }, [onArtifactUpdate, onMessageUpdate, onUsageUpdate]);
    
    const subscribeToProject = useCallback((projectId: string) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: 'subscribe:project',
                payload: { projectId }
            }));
        }
    }, []);
    
    const subscribeToConversation = useCallback((conversationId: string) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: 'subscribe:conversation',
                payload: { conversationId }
            }));
        }
    }, []);
    
    const disconnect = useCallback(() => {
        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = null;
        }
        
        if (ws.current) {
            ws.current.close();
            ws.current = null;
        }
        
        setConnectionState('disconnected');
    }, []);
    
    const sendMessage = useCallback((type: string, payload: any) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type, payload }));
        } else {
            console.warn('WebSocket is not connected');
        }
    }, []);
    
    // Auto-connect on mount
    useEffect(() => {
        if (autoConnect) {
            connect();
        }
        
        return () => {
            disconnect();
        };
    }, [autoConnect, connect, disconnect]);
    
    return {
        connectionState,
        lastMessage,
        error,
        connect,
        disconnect,
        sendMessage,
        isConnected: connectionState === 'connected'
    };
}
```
