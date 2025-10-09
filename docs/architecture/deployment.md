
### 1. Container Configuration

**Docker Compose Setup:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: chiron
      POSTGRES_USER: chiron
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U chiron"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  ai-service:
    build:
      context: ./apps/ai-service
      dockerfile: Dockerfile
    environment:
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - DSPY_OPTIMIZATION_ENABLED=true
      - RATE_LIMIT_REQUESTS_PER_MINUTE=60
      - LOG_LEVEL=info
    ports:
      - "8001:8001"
    depends_on:
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  server:
    build:
      context: ./apps/server
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgresql://chiron:${DB_PASSWORD}@postgres:5432/chiron
      - REDIS_URL=redis://redis:6379
      - MASTER_ENCRYPTION_KEY=${MASTER_ENCRYPTION_KEY}
      - AI_SERVICE_URL=http://ai-service:8001
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ORIGIN=${CORS_ORIGIN:-http://localhost:3001}
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
      - ai-service
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
    environment:
      - VITE_API_URL=http://server:8000
      - VITE_WEBSOCKET_URL=ws://server:8000
      - VITE_ENVIRONMENT=production
    ports:
      - "3001:3001"
    depends_on:
      - server
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - web
      - server
      - ai-service
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    driver: bridge
```

**Nginx Configuration:**
```nginx
events {
    worker_connections 1024;
}

http {
    upstream web {
        server web:3001;
    }
    
    upstream server {
        server server:8000;
    }
    
    upstream ai_service {
        server ai-service:8001;
    }
    
    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=ai:10m rate=5r/s;
    
    server {
        listen 80;
        server_name chiron.local;
        
        # Redirect to HTTPS in production
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl http2;
        server_name chiron.local;
        
        ssl_certificate /etc/nginx/ssl/chiron.crt;
        ssl_certificate_key /etc/nginx/ssl/chiron.key;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
        
        # Web application
        location / {
            proxy_pass http://web;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # API server
        location /api {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://server;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
        
        # AI service
        location /ai-api {
            limit_req zone=ai burst=10 nodelay;
            
            proxy_pass http://ai_service;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Static assets with caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            proxy_pass http://web;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

## Monitoring and Observability

### 1. Health Check System

**Comprehensive Health Monitoring:**
```typescript
interface HealthCheck {
    name: string;
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    responseTime?: number;
    lastChecked: Date;
}

interface SystemHealth {
    overall: 'healthy' | 'unhealthy' | 'degraded';
    services: HealthCheck[];
    timestamp: Date;
    version: string;
}

class HealthCheckService {
    private checks: Map<string, () => Promise<HealthCheck>> = new Map();
    
    constructor() {
        this.registerChecks();
    }
    
    private registerChecks(): void {
        // Database health check
        this.checks.set('database', async () => {
            const start = Date.now();
            try {
                await db.execute(sql`SELECT 1`);
                return {
                    name: 'database',
                    status: 'healthy',
                    responseTime: Date.now() - start,
                    lastChecked: new Date()
                };
            } catch (error) {
                return {
                    name: 'database',
                    status: 'unhealthy',
                    message: error.message,
                    lastChecked: new Date()
                };
            }
        });
        
        // Redis health check
        this.checks.set('redis', async () => {
            const start = Date.now();
            try {
                await redis.ping();
                return {
                    name: 'redis',
                    status: 'healthy',
                    responseTime: Date.now() - start,
                    lastChecked: new Date()
                };
            } catch (error) {
                return {
                    name: 'redis',
                    status: 'unhealthy',
                    message: error.message,
                    lastChecked: new Date()
                };
            }
        });
        
        // AI service health check
        this.checks.set('ai-service', async () => {
            const start = Date.now();
            try {
                const response = await fetch(`${process.env.AI_SERVICE_URL}/health`);
                const data = await response.json();
                
                return {
                    name: 'ai-service',
                    status: data.status === 'healthy' ? 'healthy' : 'unhealthy',
                    responseTime: Date.now() - start,
                    lastChecked: new Date()
                };
            } catch (error) {
                return {
                    name: 'ai-service',
                    status: 'unhealthy',
                    message: error.message,
                    lastChecked: new Date()
                };
            }
        });
        
        // OpenRouter API health check
        this.checks.set('openrouter', async () => {
            const start = Date.now();
            try {
                const response = await fetch('https://openrouter.ai/api/v1/models', {
                    method: 'HEAD',
                    timeout: 5000
                });
                
                return {
                    name: 'openrouter',
                    status: response.ok ? 'healthy' : 'unhealthy',
                    responseTime: Date.now() - start,
                    lastChecked: new Date()
                };
            } catch (error) {
                return {
                    name: 'openrouter',
                    status: 'unhealthy',
                    message: error.message,
                    lastChecked: new Date()
                };
            }
        });
    }
    
    async getSystemHealth(): Promise<SystemHealth> {
        const checks = await Promise.all(
            Array.from(this.checks.values()).map(check => check())
        );
        
        const unhealthyChecks = checks.filter(check => check.status === 'unhealthy');
        const degradedChecks = checks.filter(check => check.status === 'degraded');
        
        let overall: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
        
        if (unhealthyChecks.length > 0) {
            overall = 'unhealthy';
        } else if (degradedChecks.length > 0) {
            overall = 'degraded';
        }
        
        return {
            overall,
            services: checks,
            timestamp: new Date(),
            version: process.env.npm_package_version || 'unknown'
        };
    }
}

// Health check endpoint
app.get('/health', async (c) => {
    const healthService = new HealthCheckService();
    const health = await healthService.getSystemHealth();
    
    const statusCode = health.overall === 'healthy' ? 200 : 503;
    
    return c.json(health, statusCode);
});
```

### 2. Metrics and Analytics

**Performance Metrics Collection:**
```typescript
interface PerformanceMetrics {
    requestDuration: number;
    responseSize: number;
    statusCode: number;
    endpoint: string;
    method: string;
    userId?: string;
    timestamp: Date;
}

class MetricsCollector {
    private metrics: PerformanceMetrics[] = [];
    private flushInterval: number = 60000; // 1 minute
    
    constructor() {
        this.startPeriodicFlush();
    }
    
    recordRequest(metrics: PerformanceMetrics): void {
        this.metrics.push(metrics);
        
        // Flush if buffer is getting large
        if (this.metrics.length > 1000) {
            this.flushMetrics();
        }
    }
    
    private startPeriodicFlush(): void {
        setInterval(() => {
            this.flushMetrics();
        }, this.flushInterval);
    }
    
    private async flushMetrics(): Promise<void> {
        if (this.metrics.length === 0) return;
        
        const metricsToFlush = [...this.metrics];
        this.metrics = [];
        
        try {
            // Send metrics to analytics service
            await this.sendMetricsToAnalytics(metricsToFlush);
        } catch (error) {
            console.error('Failed to flush metrics:', error);
            // Put metrics back in queue for retry
            this.metrics.unshift(...metricsToFlush);
        }
    }
    
    private async sendMetricsToAnalytics(metrics: PerformanceMetrics[]): Promise<void> {
        // Implementation depends on your analytics service
        // Could be Google Analytics, Mixpanel, or custom service
        
        const aggregatedMetrics = this.aggregateMetrics(metrics);
        
        // Store in database for internal analytics
        await db.insert(performanceMetrics).values(
            aggregatedMetrics.map(metric => ({
                endpoint: metric.endpoint,
                avgResponseTime: metric.avgResponseTime,
                p95ResponseTime: metric.p95ResponseTime,
                errorRate: metric.errorRate,
                requestCount: metric.requestCount,
                timestamp: new Date()
            }))
        );
    }
    
    private aggregateMetrics(metrics: PerformanceMetrics[]): AggregatedMetrics[] {
        const grouped = new Map<string, PerformanceMetrics[]>();
        
        metrics.forEach(metric => {
            const key = `${metric.method}:${metric.endpoint}`;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key)!.push(metric);
        });
        
        return Array.from(grouped.entries()).map(([key, group]) => {
            const responseTimes = group.map(m => m.requestDuration).sort((a, b) => a - b);
            const p95Index = Math.floor(responseTimes.length * 0.95);
            
            return {
                endpoint: key,
                avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
                p95ResponseTime: responseTimes[p95Index],
                errorRate: group.filter(m => m.statusCode >= 400).length / group.length,
                requestCount: group.length
            };
        });
    }
}

// Middleware to collect metrics
export function metricsMiddleware(): Middleware {
    return async (c, next) => {
        const start = Date.now();
        
        await next();
        
        const end = Date.now();
        const duration = end - start;
        
        const metrics: PerformanceMetrics = {
            requestDuration: duration,
            responseSize: Number(c.res.headers.get('content-length') || 0),
            statusCode: c.res.status,
            endpoint: c.req.path,
            method: c.req.method,
            userId: c.get('userId'),
            timestamp: new Date()
        };
        
        const collector = new MetricsCollector();
        collector.recordRequest(metrics);
    };
}
```
