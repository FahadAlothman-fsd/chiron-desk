import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm';
import apiKeysRouter from '../../routers/api-keys';
import usageAnalyticsRouter from '../../routers/usage-analytics';
import { apiGateway, rateLimit } from '../../middleware/api-gateway';
import * as schema from '../../db';
import { encryptApiKey, createKeyHash, createKeyPreview } from '../../utils/encryption';

// Mock environment variables
process.env.ENCRYPTION_MASTER_KEY = 'a'.repeat(64);
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock AI service URL
process.env.AI_SERVICE_URL = 'http://localhost:8000';

// Mock fetch for API gateway
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe.skip('API Key Lifecycle Integration Tests', () => {
  let app: Hono;
  let db: ReturnType<typeof drizzle>;
  let testUserId: string;

  beforeAll(async () => {
    // Setup test database
    db = drizzle(process.env.DATABASE_URL!, { schema });
    
    // Run migrations
    await migrate(db, { migrationsFolder: './src/db/migrations' });
    
    // Create test user
    const [user] = await db.insert(schema.users).values({
      email: 'test@example.com',
      name: 'Test User',
    }).returning();
    testUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup test database
    await db.delete(schema.apiKeyUsageLogs);
    await db.delete(schema.apiKeys);
    await db.delete(schema.users);
  });

  beforeEach(() => {
    // Setup test app
    app = new Hono();
    
    // Mock authentication middleware to set user ID
    app.use('*', async (c, next) => {
      (c as any).set('userId', testUserId);
      await next();
    });
    
    app.use('/api/*', rateLimit(100, 60000));
    app.use('/api/*', apiGateway);
    app.route('/api-keys', apiKeysRouter);
    app.route('/usage-analytics', usageAnalyticsRouter);
    
    jest.clearAllMocks();
  });

  describe('Complete API Key Lifecycle', () => {
    it('should handle full lifecycle: create -> use -> track -> analyze', async () => {
      const testApiKey = 'sk-or-v1-' + 'a'.repeat(64);
      const encryptedKey = encryptApiKey(testApiKey);
      const keyHash = createKeyHash(testApiKey);
      const keyPreview = createKeyPreview(testApiKey);

      // Step 1: Create API key
      const createResponse = await app.request('/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Integration Test Key',
          provider: 'openrouter',
          apiKey: testApiKey,
          usageLimit: 100,
        }),
      });

      expect(createResponse.status).toBe(200);
      const createResult = await createResponse.json();
      expect(createResult.success).toBe(true);
      expect(createResult.data.name).toBe('Integration Test Key');
      expect(createResult.data.provider).toBe('openrouter');
      expect(createResult.data.keyPreview).toBe(keyPreview);
      
      const apiKeyId = createResult.data.id;

      // Step 2: List API keys to verify creation
      const listResponse = await app.request('/api-keys');
      expect(listResponse.status).toBe(200);
      const listResult = await listResponse.json();
      expect(listResult.success).toBe(true);
      expect(listResult.data.keys).toHaveLength(1);
      expect(listResult.data.keys[0].id).toBe(apiKeyId);

      // Step 3: Get specific API key
      const getResponse = await app.request(`/api-keys/${apiKeyId}`);
      expect(getResponse.status).toBe(200);
      const getResult = await getResponse.json();
      expect(getResult.success).toBe(true);
      expect(getResult.data.id).toBe(apiKeyId);

      // Step 4: Simulate API usage through gateway
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        status: 200,
        text: () => Promise.resolve(JSON.stringify({
          id: 'chatcmpl-test',
          object: 'chat.completion',
          created: Date.now(),
          model: 'openai/gpt-3.5-turbo',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'Hello!' },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
        })),
        headers: new Headers({
          'content-type': 'application/json',
        }),
      } as Response);

      const usageResponse = await app.request('/api/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key-ID': apiKeyId,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello!' }],
          model: 'openai/gpt-3.5-turbo',
        }),
      });

      expect(usageResponse.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat/completions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-API-Key': testApiKey,
            'X-API-Provider': 'openrouter',
            'X-API-Key-ID': apiKeyId,
          }),
        })
      );

      // Step 5: Track usage manually (internal endpoint)
      const trackResponse = await app.request(`/internal/api-keys/${apiKeyId}/usage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKeyId,
          endpoint: '/api/chat/completions',
          success: true,
          tokensUsed: 15,
          costUsd: 0.00015,
          requestDuration: 1200,
        }),
      });

      expect(trackResponse.status).toBe(200);
      const trackResult = await trackResponse.json();
      expect(trackResult.success).toBe(true);

      // Step 6: Check usage analytics
      const statsResponse = await app.request('/usage-analytics/stats');
      expect(statsResponse.status).toBe(200);
      const statsResult = await statsResponse.json();
      expect(statsResult.success).toBe(true);
      expect(statsResult.data.stats).toHaveLength(1);
      expect(statsResult.data.stats[0].totalRequests).toBeGreaterThan(0);

      // Step 7: Get usage logs
      const logsResponse = await app.request('/usage-analytics/logs');
      expect(logsResponse.status).toBe(200);
      const logsResult = await logsResponse.json();
      expect(logsResult.success).toBe(true);
      expect(logsResult.data.logs.length).toBeGreaterThan(0);

      // Step 8: Update API key
      const updateResponse = await app.request(`/api-keys/${apiKeyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Test Key',
          usageLimit: 200,
        }),
      });

      expect(updateResponse.status).toBe(200);
      const updateResult = await updateResponse.json();
      expect(updateResult.success).toBe(true);
      expect(updateResult.data.name).toBe('Updated Test Key');
      expect(updateResult.data.usageLimit).toBe(200);

      // Step 9: Soft delete API key
      const deleteResponse = await app.request(`/api-keys/${apiKeyId}`, {
        method: 'DELETE',
      });

      expect(deleteResponse.status).toBe(200);
      const deleteResult = await deleteResponse.json();
      expect(deleteResult.success).toBe(true);
      expect(deleteResult.message).toBe('API key deleted successfully');

      // Step 10: Verify API key is no longer in active list
      const finalListResponse = await app.request('/api-keys');
      expect(finalListResponse.status).toBe(200);
      const finalListResult = await finalListResponse.json();
      expect(finalListResult.success).toBe(true);
      expect(finalListResult.data.keys).toHaveLength(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid API key creation', async () => {
      const response = await app.request('/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Invalid Key',
          provider: 'openrouter',
          apiKey: 'invalid-key-format',
        }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('should handle API gateway without API key ID', async () => {
      const response = await app.request('/api/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello!' }],
          model: 'openai/gpt-3.5-turbo',
        }),
      });

      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing X-API-Key-ID header');
    });

    it('should handle usage limit exceeded', async () => {
      // Create API key with low limit
      const testApiKey = 'sk-or-v1-' + 'b'.repeat(64);
      
      const createResponse = await app.request('/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Limited Key',
          provider: 'openrouter',
          apiKey: testApiKey,
          usageLimit: 1,
        }),
      });

      const createResult = await createResponse.json();
      const apiKeyId = createResult.data.id;

      // Use up the limit
      await db.update(schema.apiKeys).set({ usageCount: 1 }).where(eq(schema.apiKeys.id, apiKeyId));

      // Try to use again
      const response = await app.request('/api/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key-ID': apiKeyId,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello!' }],
          model: 'openai/gpt-3.5-turbo',
        }),
      });

      expect(response.status).toBe(429);
      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.error).toBe('API key usage limit exceeded');
    });

    it('should handle expired API keys', async () => {
      const testApiKey = 'sk-or-v1-' + 'c'.repeat(64);
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      
      const createResponse = await app.request('/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Expired Key',
          provider: 'openrouter',
          apiKey: testApiKey,
          expiresAt: pastDate.toISOString(),
        }),
      });

      const createResult = await createResponse.json();
      const apiKeyId = createResult.data.id;

      const response = await app.request('/api/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key-ID': apiKeyId,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello!' }],
          model: 'openai/gpt-3.5-turbo',
        }),
      });

      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.error).toBe('API key has expired');
    });
  });
});