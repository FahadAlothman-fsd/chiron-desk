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
