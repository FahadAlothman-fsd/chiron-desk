## Security Architecture

### 1. API Key Management

**Secure API Key Storage:**
```typescript
import crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);

class SecureKeyManager {
    private encryptionKey: Buffer;
    private algorithm = 'aes-256-gcm';
    
    constructor(masterKey: string) {
        // Derive encryption key from master key
        this.encryptionKey = crypto.pbkdf2Sync(
            masterKey, 
            'chiron-salt', 
            100000, 
            32, 
            'sha256'
        );
    }
    
    async encryptApiKey(apiKey: string): Promise<EncryptedData> {
        // Generate random IV
        const iv = crypto.randomBytes(16);
        
        // Create cipher
        const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
        cipher.setAAD(Buffer.from('chiron-api-key'));
        
        // Encrypt the API key
        let encrypted = cipher.update(apiKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        // Get authentication tag
        const authTag = cipher.getAuthTag();
        
        return {
            encryptedData: encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }
    
    async decryptApiKey(encryptedData: EncryptedData): Promise<string> {
        const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
        decipher.setAAD(Buffer.from('chiron-api-key'));
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
        
        let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }
    
    generateKeyPreview(apiKey: string): string {
        // Only store last 4 characters for identification
        return apiKey.slice(-4);
    }
    
    async validateApiKey(apiKey: string, provider: string): Promise<boolean> {
        try {
            // Test the API key with a simple request
            switch (provider) {
                case 'openrouter':
                    return await this.validateOpenRouterKey(apiKey);
                case 'anthropic':
                    return await this.validateAnthropicKey(apiKey);
                default:
                    throw new Error(`Unsupported provider: ${provider}`);
            }
        } catch (error) {
            console.error(`API key validation failed for ${provider}:`, error);
            return false;
        }
    }
    
    private async validateOpenRouterKey(apiKey: string): Promise<boolean> {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://chiron.local',
                'X-Title': 'Chiron'
            }
        });
        
        return response.ok;
    }
}

// Usage in API key management
export async function createApiKey(
    userId: string,
    provider: string,
    apiKey: string,
    name?: string
): Promise<ApiKey> {
    const keyManager = new SecureKeyManager(process.env.MASTER_ENCRYPTION_KEY!);
    
    // Validate the API key first
    const isValid = await keyManager.validateApiKey(apiKey, provider);
    if (!isValid) {
        throw new Error('Invalid API key for the specified provider');
    }
    
    // Encrypt the API key
    const encryptedData = await keyManager.encryptApiKey(apiKey);
    
    // Create database record
    const apiKeyRecord = await db.insert(apiKeys).values({
        userId,
        provider,
        keyHash: encryptedData.encryptedData,
        keyPreview: keyManager.generateKeyPreview(apiKey),
        name: name || `${provider}-key`,
        isActive: true
    }).returning();
    
    return apiKeyRecord[0];
}
```

### 2. Service-to-Service Authentication

**Secure Service Communication:**
```typescript
interface ServiceAuthConfig {
    serviceId: string;
    sharedSecret: string;
    tokenExpiry: number; // seconds
}

class ServiceAuthenticator {
    private services: Map<string, ServiceAuthConfig> = new Map();
    
    constructor() {
        // Register known services
        this.services.set('ai-service', {
            serviceId: 'ai-service',
            sharedSecret: process.env.AI_SERVICE_SECRET!,
            tokenExpiry: 3600 // 1 hour
        });
        
        this.services.set('web-service', {
            serviceId: 'web-service',
            sharedSecret: process.env.WEB_SERVICE_SECRET!,
            tokenExpiry: 3600
        });
    }
    
    generateServiceToken(serviceId: string): string {
        const service = this.services.get(serviceId);
        if (!service) {
            throw new Error(`Unknown service: ${serviceId}`);
        }
        
        const payload = {
            serviceId,
            timestamp: Date.now(),
            expiry: Date.now() + (service.tokenExpiry * 1000)
        };
        
        // Create signature
        const signature = crypto
            .createHmac('sha256', service.sharedSecret)
            .update(JSON.stringify(payload))
            .digest('hex');
        
        return Buffer.from(JSON.stringify({ ...payload, signature })).toString('base64');
    }
    
    validateServiceToken(token: string): boolean {
        try {
            const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
            const { serviceId, timestamp, expiry, signature } = decoded;
            
            const service = this.services.get(serviceId);
            if (!service) {
                return false;
            }
            
            // Check expiry
            if (Date.now() > expiry) {
                return false;
            }
            
            // Verify signature
            const expectedSignature = crypto
                .createHmac('sha256', service.sharedSecret)
                .update(JSON.stringify({ serviceId, timestamp, expiry }))
                .digest('hex');
            
            return signature === expectedSignature;
        } catch (error) {
            console.error('Service token validation failed:', error);
            return false;
        }
    }
}

// Middleware for service authentication
export function requireServiceAuth(req: Request, res: Response, next: NextFunction) {
    const serviceToken = req.headers['x-service-token'];
    
    if (!serviceToken) {
        return res.status(401).json({ error: 'Service token required' });
    }
    
    const authenticator = new ServiceAuthenticator();
    if (!authenticator.validateServiceToken(serviceToken as string)) {
        return res.status(401).json({ error: 'Invalid service token' });
    }
    
    next();
}
```

