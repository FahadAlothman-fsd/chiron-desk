
### 1. Response Time Optimization (<200ms)

**Caching Strategy:**
```typescript
interface CacheConfig {
    ttl: number; // Time to live in seconds
    maxSize: number;
    strategy: 'lru' | 'fifo' | 'lfu';
}

class ResponseCache {
    private cache: Map<string, CacheEntry> = new Map();
    private config: CacheConfig;
    
    constructor(config: CacheConfig) {
        this.config = config;
    }
    
    async get<T>(key: string): Promise<T | null> {
        const entry = this.cache.get(key);
        
        if (!entry) {
            return null;
        }
        
        // Check if entry is expired
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }
        
        return entry.data as T;
    }
    
    async set<T>(key: string, data: T): Promise<void> {
        // Implement cache eviction if needed
        if (this.cache.size >= this.config.maxSize) {
            this.evictEntry();
        }
        
        const entry: CacheEntry = {
            data,
            expiry: Date.now() + (this.config.ttl * 1000),
            accessCount: 0,
            lastAccessed: Date.now()
        };
        
        this.cache.set(key, entry);
    }
    
    private evictEntry(): void {
        // Implement cache eviction strategy
        switch (this.config.strategy) {
            case 'lru':
                this.evictLRU();
                break;
            case 'fifo':
                this.evictFIFO();
                break;
            case 'lfu':
                this.evictLFU();
                break;
        }
    }
    
    private evictLRU(): void {
        let oldestKey: string | null = null;
        let oldestTime = Date.now();
        
        this.cache.forEach((entry, key) => {
            if (entry.lastAccessed < oldestTime) {
                oldestTime = entry.lastAccessed;
                oldestKey = key;
            }
        });
        
        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }
}

// Model response caching
const modelResponseCache = new ResponseCache({
    ttl: 300, // 5 minutes
    maxSize: 1000,
    strategy: 'lru'
});

export async function getCachedModelResponse(
    messages: Message[],
    model: string
): Promise<string | null> {
    const cacheKey = `model:${model}:${JSON.stringify(messages)}`;
    return await modelResponseCache.get<string>(cacheKey);
}

export async function cacheModelResponse(
    messages: Message[],
    model: string,
    response: string
): Promise<void> {
    const cacheKey = `model:${model}:${JSON.stringify(messages)}`;
    await modelResponseCache.set(cacheKey, response);
}
```

**Database Query Optimization:**
```sql
-- Optimized indexes for common queries
CREATE INDEX CONCURRENTLY idx_messages_conversation_created 
ON messages(conversation_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_artifacts_project_type 
ON artifacts(project_id, type);

CREATE INDEX CONCURRENTLY idx_usage_metrics_user_date 
ON usage_metrics(user_id, created_at DESC);

-- Partial indexes for better performance
CREATE INDEX CONCURRENTLY idx_conversations_active 
ON conversations(project_id, updated_at DESC) 
WHERE status = 'active';

CREATE INDEX CONCURRENTLY idx_api_keys_active 
ON api_keys(user_id, provider) 
WHERE is_active = true;

-- Materialized view for usage analytics
CREATE MATERIALIZED VIEW usage_analytics AS
SELECT 
    user_id,
    DATE(created_at) as usage_date,
    provider,
    COUNT(*) as request_count,
    SUM(total_tokens) as total_tokens,
    SUM(cost_usd) as total_cost
FROM usage_metrics
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id, DATE(created_at), provider;

-- Refresh materialized view periodically
CREATE OR REPLACE FUNCTION refresh_usage_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY usage_analytics;
END;
$$ LANGUAGE plpgsql;
```

### 2. Large Artifact Handling (10,000+ lines)

**Virtual Scrolling Implementation:**
```typescript
interface VirtualScrollConfig {
    itemHeight: number;
    containerHeight: number;
    bufferSize: number;
}

class VirtualScroller {
    private config: VirtualScrollConfig;
    private visibleRange: { start: number; end: number };
    private scrollTop: number = 0;
    
    constructor(config: VirtualScrollConfig) {
        this.config = config;
        this.visibleRange = { start: 0, end: 0 };
    }
    
    calculateVisibleRange(totalItems: number, scrollTop: number): { start: number; end: number } {
        const { itemHeight, containerHeight, bufferSize } = this.config;
        
        // Calculate visible range with buffer
        const start = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
        const end = Math.min(
            totalItems,
            Math.ceil((scrollTop + containerHeight) / itemHeight) + bufferSize
        );
        
        return { start, end };
    }
    
    getVisibleItems<T>(items: T[], scrollTop: number): T[] {
        this.scrollTop = scrollTop;
        this.visibleRange = this.calculateVisibleRange(items.length, scrollTop);
        
        return items.slice(this.visibleRange.start, this.visibleRange.end);
    }
    
    getOffsetY(): number {
        return this.visibleRange.start * this.config.itemHeight;
    }
    
    getTotalHeight(totalItems: number): number {
        return totalItems * this.config.itemHeight;
    }
}

// React component for virtualized artifact viewer
interface VirtualizedArtifactViewerProps {
    content: string;
    language?: string;
    className?: string;
}

export const VirtualizedArtifactViewer: React.FC<VirtualizedArtifactViewerProps> = ({
    content,
    language = 'markdown',
    className
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(600);
    
    const lines = useMemo(() => content.split('\n'), [content]);
    
    const virtualScroller = useMemo(() => {
        return new VirtualScroller({
            itemHeight: 24, // Line height in pixels
            containerHeight,
            bufferSize: 10
        });
    }, [containerHeight]);
    
    const visibleLines = useMemo(() => {
        return virtualScroller.getVisibleItems(lines, scrollTop);
    }, [lines, scrollTop, virtualScroller]);
    
    const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(event.currentTarget.scrollTop);
    }, []);
    
    useEffect(() => {
        const updateHeight = () => {
            if (containerRef.current) {
                setContainerHeight(containerRef.current.clientHeight);
            }
        };
        
        updateHeight();
        window.addEventListener('resize', updateHeight);
        
        return () => window.removeEventListener('resize', updateHeight);
    }, []);
    
    return (
        <div 
            ref={containerRef}
            className={cn('overflow-auto', className)}
            onScroll={handleScroll}
            style={{ height: '100%' }}
        >
            <div 
                style={{ 
                    height: virtualScroller.getTotalHeight(lines.length),
                    position: 'relative'
                }}
            >
                <div
                    style={{
                        transform: `translateY(${virtualScroller.getOffsetY()}px)`,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0
                    }}
                >
                    {visibleLines.map((line, index) => (
                        <div 
                            key={virtualScroller.visibleRange.start + index}
                            className="font-mono text-sm leading-6"
                            style={{ height: '24px' }}
                        >
                            <SyntaxHighlighter
                                language={language}
                                style={oneDark}
                                customStyle={{
                                    margin: 0,
                                    padding: 0,
                                    background: 'transparent'
                                }}
                            >
                                {line || ' '}
                            </SyntaxHighlighter>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
```

**Progressive Loading for Large Files:**
```typescript
interface ProgressiveLoaderConfig {
    chunkSize: number; // Lines per chunk
    initialChunks: number;
    loadMoreThreshold: number; // Lines from bottom to trigger load
}

class ProgressiveArtifactLoader {
    private config: ProgressiveLoaderConfig;
    private loadedChunks: Set<number> = new Set();
    private totalLines: number = 0;
    private content: string[] = [];
    
    constructor(config: ProgressiveLoaderConfig) {
        this.config = config;
    }
    
    async loadArtifact(
        projectId: string, 
        artifactId: string,
        onProgress: (loaded: number, total: number) => void
    ): Promise<void> {
        // Get total file size first
        const metadata = await this.getArtifactMetadata(projectId, artifactId);
        this.totalLines = metadata.lineCount;
        
        // Load initial chunks
        await this.loadChunks(0, this.config.initialChunks, onProgress);
        
        // Set up scroll-based loading
        this.setupScrollLoading(onProgress);
    }
    
    private async loadChunks(
        startChunk: number, 
        count: number,
        onProgress: (loaded: number, total: number) => void
    ): Promise<void> {
        const promises = [];
        
        for (let i = 0; i < count; i++) {
            const chunkIndex = startChunk + i;
            
            if (this.loadedChunks.has(chunkIndex)) {
                continue; // Already loaded
            }
            
            promises.push(this.loadChunk(chunkIndex));
            this.loadedChunks.add(chunkIndex);
        }
        
        await Promise.all(promises);
        onProgress(this.loadedChunks.size * this.config.chunkSize, this.totalLines);
    }
    
    private async loadChunk(chunkIndex: number): Promise<void> {
        const startLine = chunkIndex * this.config.chunkSize;
        const endLine = Math.min(startLine + this.config.chunkSize, this.totalLines);
        
        // Fetch chunk from server
        const chunkContent = await trpc.artifacts.getChunk.query({
            artifactId: this.artifactId,
            startLine,
            endLine
        });
        
        // Store in content array
        for (let i = 0; i < chunkContent.lines.length; i++) {
            this.content[startLine + i] = chunkContent.lines[i];
        }
    }
    
    getVisibleContent(startLine: number, endLine: number): string[] {
        const visibleContent: string[] = [];
        
        for (let i = startLine; i < endLine; i++) {
            if (this.content[i] !== undefined) {
                visibleContent.push(this.content[i]);
            } else {
                // Line not loaded yet, show placeholder
                visibleContent.push('Loading...');
                
                // Trigger load if close to unloaded chunk
                const chunkIndex = Math.floor(i / this.config.chunkSize);
                if (!this.loadedChunks.has(chunkIndex)) {
                    this.loadChunk(chunkIndex).then(() => {
                        // Notify component to re-render
                        this.onContentUpdate?.();
                    });
                }
            }
        }
        
        return visibleContent;
    }
}
```

