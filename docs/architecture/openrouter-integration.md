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

## Git Integration Architecture

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
