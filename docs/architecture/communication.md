## Service Communication Patterns

### 1. Inter-Service Communication

**AI Service ↔ Server Service:**
```typescript
// Server-to-AI Service Communication
interface AIChatRequest {
    messages: Message[];
    model: string;
    temperature?: number;
    maxTokens?: number;
    projectId: string;
    conversationId: string;
}

interface AIChatResponse {
    content: string;
    model: string;
    usage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        cost: number;
    };
    artifacts?: Artifact[];
}

// AI Service API Endpoints
POST /api/v1/chat/stream      # Streaming chat completion
POST /api/v1/models/list      # List available models
GET  /api/v1/models/{id}       # Get model details
POST /api/v1/usage/track      # Track usage metrics
GET  /api/v1/health           # Health check
```

**Web Service ↔ Server Service:**
```typescript
// tRPC Router Definitions
export const appRouter = router({
    auth: authRouter,
    projects: projectsRouter,
    conversations: conversationsRouter,
    messages: messagesRouter,
    artifacts: artifactsRouter,
    apiKeys: apiKeysRouter,
    usage: usageRouter,
    opencode: opencodeRouter,
});

// WebSocket Events
interface WebSocketEvents {
    'artifact:updated': (artifact: Artifact) => void;
    'message:created': (message: Message) => void;
    'conversation:updated': (conversation: Conversation) => void;
    'project:updated': (project: Project) => void;
    'usage:updated': (usage: UsageMetrics) => void;
}
```

### 2. WebSocket Implementation

**Real-Time Synchronization:**
```typescript
class WebSocketManager {
    private connections: Map<string, WebSocket> = new Map();
    private eventHandlers: Map<string, Function[]> = new Map();
    
    constructor(private server: Server) {
        this.initializeWebSocketServer();
    }
    
    private initializeWebSocketServer(): void {
        this.server.ws('/ws', {
            message: (ws, message) => this.handleMessage(ws, message),
            open: (ws) => this.handleConnection(ws),
            close: (ws) => this.handleDisconnection(ws),
        });
    }
    
    broadcast(event: string, data: any, projectId?: string): void {
        this.connections.forEach((ws, connectionId) => {
            if (projectId && this.getProjectId(connectionId) !== projectId) {
                return; // Only broadcast to relevant project connections
            }
            
            ws.send(JSON.stringify({ event, data }));
        });
    }
    
    emit(event: string, data: any): void {
        const handlers = this.eventHandlers.get(event) || [];
        handlers.forEach(handler => handler(data));
    }
    
    on(event: string, handler: Function): void {
        const handlers = this.eventHandlers.get(event) || [];
        handlers.push(handler);
        this.eventHandlers.set(event, handlers);
    }
}

// Usage in Server Service
trpcRouter.on('artifact:created', (artifact) => {
    websocketManager.broadcast('artifact:updated', artifact, artifact.projectId);
});
```

## OpenRouter API Integration

### 1. API Client Architecture

**OpenRouter Client Implementation:**
```python
import httpx
from typing import AsyncGenerator, Dict, List, Optional
from tenacity import retry, stop_after_attempt, wait_exponential

class OpenRouterClient:
    """OpenRouter API client with comprehensive error handling and rate limiting"""
    
    def __init__(self, api_key: str, base_url: str = "https://openrouter.ai/api/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=10.0),
            limits=httpx.Limits(max_connections=100, max_keepalive_connections=20)
        )
        self.rate_limiter = RateLimiter(requests_per_minute=60)
        
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    async def stream_chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        stream: bool = True
    ) -> AsyncGenerator[str, None]:
        """Stream chat completion with retry logic and error handling"""
        
        # Rate limiting check
        if not await self.rate_limiter.allow_request():
            raise RateLimitExceededError("Rate limit exceeded")
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://chiron.local",
            "X-Title": "Chiron",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream
        }
        
        try:
            async with self.client.stream(
                "POST", 
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload
            ) as response:
                
                if response.status_code == 429:
                    raise RateLimitExceededError("OpenRouter rate limit exceeded")
                elif response.status_code != 200:
                    error_data = await response.aread()
                    raise OpenRouterAPIError(f"API error: {error_data}")
                
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]  # Remove "data: " prefix
                        if data == "[DONE]":
                            break
                        yield data
                            
        except httpx.TimeoutException:
            raise OpenRouterAPIError("Request timeout - OpenRouter API is slow")
        except httpx.ConnectError:
            raise OpenRouterAPIError("Connection error - Unable to reach OpenRouter")
        except Exception as e:
            raise OpenRouterAPIError(f"Unexpected error: {str(e)}")
    
    async def list_models(self) -> List[Dict]:
        """List available models from OpenRouter"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://chiron.local",
            "X-Title": "Chiron"
        }
        
        response = await self.client.get(
            f"{self.base_url}/models",
            headers=headers
        )
        
        if response.status_code != 200:
            raise OpenRouterAPIError(f"Failed to list models: {response.text}")
        
        return response.json()["data"]
```

### 2. DSPy Framework Integration

**DSPy Module Implementation:**
```python
import dspy
from typing import List, Dict, Optional

class ChironDSPyModule(dspy.Module):
    """DSPy module for BMAD artifact generation and optimization"""
    
    def __init__(self):
        super().__init__()
        
        # Initialize DSPy signatures for different artifact types
        self.project_brief_signature = dspy.Signature(
            "project_idea, requirements -> project_brief",
            "Generate a comprehensive project brief from the given idea and requirements"
        )
        
        self.prd_signature = dspy.Signature(
            "project_brief -> prd",
            "Generate a detailed Product Requirements Document from the project brief"
        )
        
        self.architecture_signature = dspy.Signature(
            "prd, frontend_spec -> architecture",
            "Generate a technical architecture document from PRD and frontend specifications"
        )
        
        # Initialize DSPy modules
        self.project_brief_generator = dspy.ChainOfThought(self.project_brief_signature)
        self.prd_generator = dspy.ChainOfThought(self.prd_signature)
        self.architecture_generator = dspy.ChainOfThought(self.architecture_signature)
    
    async def generate_project_brief(
        self, 
        project_idea: str, 
        requirements: List[str],
        model: str = "openrouter/meta-llama/llama-3.1-8b-instruct"
    ) -> Dict:
        """Generate project brief with DSPy optimization"""
        
        # Configure DSPy to use the specified model
        dspy.settings.configure(
            lm=dspy.OpenAI(
                model=model,
                api_key=self._get_openrouter_key(),
                api_base="https://openrouter.ai/api/v1"
            )
        )
        
        # Generate project brief
        result = self.project_brief_generator(
            project_idea=project_idea,
            requirements=requirements
        )
        
        return {
            "project_brief": result.project_brief,
            "metadata": {
                "model_used": model,
                "optimization_applied": True,
                "generation_time": result.metadata.get("generation_time"),
                "token_usage": result.metadata.get("token_usage")
            }
        }
    
    async def optimize_prompt(
        self, 
        prompt: str, 
        context: Dict,
        optimization_type: str = "general"
    ) -> str:
        """Optimize prompts using DSPy techniques"""
        
        if optimization_type == "bmad_artifact":
            return await self._optimize_bmad_prompt(prompt, context)
        elif optimization_type == "chat":
            return await self._optimize_chat_prompt(prompt, context)
        else:
            return await self._optimize_general_prompt(prompt, context)
    
    async def _optimize_bmad_prompt(self, prompt: str, context: Dict) -> str:
        """Optimize prompts for BMAD artifact generation"""
        
        # Add BMAD-specific context and structure
        optimized_prompt = f"""
        You are generating a {context.get('artifact_type')} for a software project using the BMAD methodology.
        
        Context:
        - Project: {context.get('project_name')}
        - Previous artifacts: {context.get('previous_artifacts', [])}
        - Target audience: Individual developers
        
        Requirements:
        1. Follow the BMAD template structure exactly
        2. Use clear, actionable language
        3. Include specific examples where appropriate
        4. Maintain consistency with previous artifacts
        5. Focus on implementation-ready details
        
        Original prompt: {prompt}
        
        Generate the {context.get('artifact_type')} following these guidelines:
        """
        
        return optimized_prompt
```

