#!/usr/bin/env node

/**
 * IRIS API Server - Backend for Demo Dashboard
 * Provides real AI responses through HTTP API
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import MultiAI from './src/index.js';
import { getConfig, validateConfig } from './iris.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load and validate configuration
const config = getConfig();
const configErrors = validateConfig(config);
if (configErrors.length > 0) {
  console.error('❌ Configuration validation failed:');
  configErrors.forEach(error => console.error(`  - ${error}`));
  process.exit(1);
}

const app = express();
const PORT = config.api.port;

// Rate Limiting Middleware
class RateLimiter {
    constructor(rateLimitConfig = config.api) {
        this.windowMs = rateLimitConfig.rateLimitWindowMs;
        this.maxRequests = rateLimitConfig.rateLimitMaxRequests;
        this.requests = new Map();
        
        // Clean up expired entries every minute
        setInterval(() => this.cleanup(), 60000);
    }
    
    middleware() {
        return (req, res, next) => {
            const clientId = this.getClientId(req);
            const now = Date.now();
            const windowStart = now - this.windowMs;
            
            // Get or create client record
            if (!this.requests.has(clientId)) {
                this.requests.set(clientId, []);
            }
            
            const clientRequests = this.requests.get(clientId);
            
            // Remove expired requests
            const validRequests = clientRequests.filter(timestamp => timestamp > windowStart);
            this.requests.set(clientId, validRequests);
            
            // Check if rate limit exceeded
            if (validRequests.length >= this.maxRequests) {
                const resetTime = validRequests[0] + this.windowMs;
                const resetInSeconds = Math.ceil((resetTime - now) / 1000);
                
                res.set({
                    'X-RateLimit-Limit': this.maxRequests,
                    'X-RateLimit-Remaining': 0,
                    'X-RateLimit-Reset': Math.ceil(resetTime / 1000),
                    'Retry-After': resetInSeconds
                });
                
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    message: `Too many requests. Try again in ${resetInSeconds} seconds.`,
                    retryAfter: resetInSeconds
                });
            }
            
            // Add current request
            validRequests.push(now);
            this.requests.set(clientId, validRequests);
            
            // Set rate limit headers
            res.set({
                'X-RateLimit-Limit': this.maxRequests,
                'X-RateLimit-Remaining': Math.max(0, this.maxRequests - validRequests.length),
                'X-RateLimit-Reset': Math.ceil((now + this.windowMs) / 1000)
            });
            
            next();
        };
    }
    
    getClientId(req) {
        // Use IP address as client identifier
        return req.ip || req.connection.remoteAddress || 'unknown';
    }
    
    cleanup() {
        const now = Date.now();
        const cutoff = now - this.windowMs;
        
        for (const [clientId, timestamps] of this.requests.entries()) {
            const validTimestamps = timestamps.filter(timestamp => timestamp > cutoff);
            if (validTimestamps.length === 0) {
                this.requests.delete(clientId);
            } else {
                this.requests.set(clientId, validTimestamps);
            }
        }
    }
    
    getStats() {
        const totalClients = this.requests.size;
        const totalRequests = Array.from(this.requests.values()).reduce((sum, arr) => sum + arr.length, 0);
        const averageRequestsPerClient = totalClients > 0 ? (totalRequests / totalClients).toFixed(2) : 0;
        
        return {
            totalClients,
            totalRequests,
            averageRequestsPerClient,
            windowMs: this.windowMs,
            maxRequests: this.maxRequests
        };
    }
}

const rateLimiter = new RateLimiter();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Apply rate limiting to API routes only
app.use('/api/', rateLimiter.middleware());

// Initialize IRIS with connection pooling
const iris = new MultiAI();
let isInitialized = false;

// Connection Pool Management
class ConnectionPool {
    constructor(poolConfig = config.connectionPool) {
        this.maxConnections = poolConfig.maxConnections;
        this.maxRetries = poolConfig.maxRetries;
        this.retryDelayBase = poolConfig.retryDelayBase;
        this.retryDelayMax = poolConfig.retryDelayMax;
        this.activeConnections = 0;
        this.queue = [];
        this.connectionCache = new Map();
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0
        };
    }

    async acquireConnection(providerId) {
        return new Promise((resolve, reject) => {
            if (this.activeConnections < this.maxConnections) {
                this.activeConnections++;
                const connectionId = `${providerId}_${Date.now()}_${Math.random()}`;
                resolve(connectionId);
            } else {
                // Queue the request
                this.queue.push({ resolve, reject, providerId });
            }
        });
    }

    releaseConnection(connectionId) {
        this.activeConnections--;
        
        // Process queue
        if (this.queue.length > 0) {
            const { resolve, providerId } = this.queue.shift();
            this.activeConnections++;
            const newConnectionId = `${providerId}_${Date.now()}_${Math.random()}`;
            resolve(newConnectionId);
        }
    }

    async executeWithPool(operation, providerId, retryCount = 0) {
        const startTime = Date.now();
        this.stats.totalRequests++;
        
        try {
            const connectionId = await this.acquireConnection(providerId);
            
            try {
                const result = await operation(connectionId);
                this.stats.successfulRequests++;
                this.updateAverageResponseTime(Date.now() - startTime);
                return result;
            } finally {
                this.releaseConnection(connectionId);
            }
        } catch (error) {
            this.stats.failedRequests++;
            
            if (retryCount < this.maxRetries) {
                console.warn(`Retrying operation (${retryCount + 1}/${this.maxRetries}):`, error.message);
                const delay = Math.min(this.retryDelayBase * Math.pow(2, retryCount), this.retryDelayMax);
                await this.delay(delay);
                return this.executeWithPool(operation, providerId, retryCount + 1);
            }
            
            throw error;
        }
    }

    updateAverageResponseTime(responseTime) {
        const totalRequests = this.stats.successfulRequests;
        this.stats.averageResponseTime = 
            ((this.stats.averageResponseTime * (totalRequests - 1)) + responseTime) / totalRequests;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStats() {
        return {
            ...this.stats,
            activeConnections: this.activeConnections,
            queueLength: this.queue.length,
            successRate: (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(2) + '%'
        };
    }
}

const connectionPool = new ConnectionPool();

// Response Caching System
class ResponseCache {
    constructor(cacheConfig = config.cache) {
        this.cache = new Map();
        this.maxSize = cacheConfig.maxSize;
        this.ttl = cacheConfig.ttlMinutes * 60 * 1000; // Convert to milliseconds
        this.cleanupInterval = cacheConfig.cleanupIntervalMinutes * 60 * 1000;
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
    }

    // Generate cache key from request parameters
    generateKey(message, provider, taskType) {
        const normalized = {
            message: message.toLowerCase().trim(),
            provider: provider || 'auto',
            taskType: taskType || 'balanced'
        };
        return JSON.stringify(normalized);
    }

    // Get cached response
    get(key) {
        const entry = this.cache.get(key);
        
        if (!entry) {
            this.stats.misses++;
            return null;
        }

        // Check if entry has expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }

        // Update access time for LRU
        entry.lastAccessed = Date.now();
        this.stats.hits++;
        
        console.log(`📦 Cache HIT for key: ${key.substring(0, 50)}...`);
        return entry.data;
    }

    // Store response in cache
    set(key, data) {
        // Check if cache is full
        if (this.cache.size >= this.maxSize) {
            this.evictLeastRecentlyUsed();
        }

        const entry = {
            data: data,
            createdAt: Date.now(),
            expiresAt: Date.now() + this.ttl,
            lastAccessed: Date.now()
        };

        this.cache.set(key, entry);
        console.log(`📦 Cache STORE for key: ${key.substring(0, 50)}...`);
    }

    // Evict least recently used entry
    evictLeastRecentlyUsed() {
        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccessed < oldestTime) {
                oldestTime = entry.lastAccessed;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.stats.evictions++;
            console.log(`📦 Cache EVICTION for key: ${oldestKey.substring(0, 50)}...`);
        }
    }

    // Clean expired entries
    cleanExpired() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`📦 Cache CLEANUP: Removed ${cleaned} expired entries`);
        }

        return cleaned;
    }

    // Get cache statistics
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0 
            ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
            : '0.00';

        return {
            ...this.stats,
            hitRate: hitRate + '%',
            size: this.cache.size,
            maxSize: this.maxSize,
            ttlMinutes: this.ttl / (60 * 1000),
            cleanupIntervalMinutes: this.cleanupInterval / (60 * 1000)
        };
    }

    // Clear entire cache
    clear() {
        this.cache.clear();
        this.stats = { hits: 0, misses: 0, evictions: 0 };
        console.log('📦 Cache CLEARED');
    }
}

const responseCache = new ResponseCache();

// Clean expired cache entries based on configuration
setInterval(() => {
    responseCache.cleanExpired();
}, config.cache.cleanupIntervalMinutes * 60 * 1000);

// Initialize IRIS providers
async function initializeIRIS() {
    if (isInitialized) return;
    
    try {
        console.log('Initializing IRIS AI providers...');
        await iris.initializeProviders();
        isInitialized = true;
        console.log('IRIS initialized successfully');
    } catch (error) {
        console.warn('⚠️  IRIS initialization failed, falling back to demo mode:', error.message);
        isInitialized = false;
    }
}

// API Routes

// Chat endpoint - Real AI responses
app.post('/api/chat', async (req, res) => {
    try {
        const { message, provider = 'auto', taskType = 'balanced' } = req.body;
        
        if (!message) {
            return res.status(400).json({ 
                error: 'Message is required',
                provider: 'Error Handler'
            });
        }

        // Initialize if needed
        if (!isInitialized) {
            await initializeIRIS();
        }

        // If IRIS is available, use it with caching and connection pooling
        if (isInitialized) {
            // Check cache first
            const cacheKey = responseCache.generateKey(message, provider, taskType);
            const cachedResponse = responseCache.get(cacheKey);
            
            if (cachedResponse) {
                // Return cached response with cache indicator
                return res.json({
                    ...cachedResponse,
                    cached: true,
                    cacheTimestamp: cachedResponse.timestamp
                });
            }

            // Not in cache, process with connection pooling
            const result = await connectionPool.executeWithPool(async (connectionId) => {
                console.log(`🔗 Processing request with connection: ${connectionId}`);
                
                const options = {
                    taskType,
                    timeout: 30000,
                    connectionId // Pass connection ID for tracking
                };

                // Handle provider selection
                if (provider !== 'auto') {
                    options.provider = provider;
                }

                return await iris.chat(message, options);
            }, provider || 'auto');
            
            const responseTime = result.responseTime || 0;
            
            // Prepare response for caching and return
            const response = {
                response: result.response || result.text || 'No response generated',
                provider: result.provider || result.selectedProvider || 'IRIS System',
                responseTime: responseTime,
                timestamp: new Date().toISOString(),
                cached: false
            };
            
            // Cache the response
            responseCache.set(cacheKey, response);

            return res.json(response);
        } else {
            // Fallback to enhanced demo responses
            const response = await generateSmartDemoResponse(message, provider);
            res.json(response);
        }

    } catch (error) {
        console.error('❌ Chat API error:', error);
        
        // Graceful fallback
        const fallbackResponse = await generateSmartDemoResponse(
            req.body.message || 'Hello', 
            req.body.provider || 'auto'
        );
        
        fallbackResponse.error = 'Real AI temporarily unavailable, showing enhanced demo';
        res.json(fallbackResponse);
    }
});

// Connection pool stats endpoint
app.get('/api/pool-stats', (req, res) => {
    res.json({
        success: true,
        stats: connectionPool.getStats(),
        timestamp: new Date().toISOString()
    });
});

// Cache stats endpoint
app.get('/api/cache-stats', (req, res) => {
    res.json({
        success: true,
        stats: responseCache.getStats(),
        timestamp: new Date().toISOString()
    });
});

// Combined performance stats endpoint
app.get('/api/performance-stats', (req, res) => {
    res.json({
        success: true,
        connectionPool: connectionPool.getStats(),
        cache: responseCache.getStats(),
        timestamp: new Date().toISOString()
    });
});

// Rate limit stats endpoint
app.get('/api/rate-limit-stats', (req, res) => {
    res.json({
        success: true,
        stats: rateLimiter.getStats(),
        timestamp: new Date().toISOString()
    });
});

// Configuration endpoint
app.get('/api/config', (req, res) => {
    // Don't expose sensitive information
    const safeConfig = {
        cache: {
            maxSize: config.cache.maxSize,
            ttlMinutes: config.cache.ttlMinutes,
            cleanupIntervalMinutes: config.cache.cleanupIntervalMinutes
        },
        connectionPool: {
            maxConnections: config.connectionPool.maxConnections,
            maxRetries: config.connectionPool.maxRetries,
            timeoutMs: config.connectionPool.timeoutMs
        },
        api: {
            port: config.api.port,
            rateLimitMaxRequests: config.api.rateLimitMaxRequests,
            rateLimitWindowMs: config.api.rateLimitWindowMs
        },
        performance: {
            updateInterval: config.performance.updateInterval,
            debounceMs: config.performance.debounceMs
        },
        environment: process.env.NODE_ENV || 'development'
    };
    
    res.json({
        success: true,
        config: safeConfig,
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        if (!isInitialized) {
            await initializeIRIS();
        }

        if (isInitialized) {
            const status = iris.getProviderStatus();
            res.json({
                status: 'healthy',
                providers: status,
                timestamp: new Date().toISOString(),
                version: '2.0.0'
            });
        } else {
            res.json({
                status: 'demo',
                providers: generateDemoProviders(),
                timestamp: new Date().toISOString(),
                version: '2.0.0-demo'
            });
        }
    } catch (error) {
        res.status(503).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Provider status endpoint
app.get('/api/providers', async (req, res) => {
    try {
        if (!isInitialized) {
            await initializeIRIS();
        }

        if (isInitialized) {
            const status = iris.getProviderStatus();
            res.json(status);
        } else {
            res.json(generateDemoProviders());
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Enhanced demo response generator
async function generateSmartDemoResponse(message, provider) {
    const delay = Math.random() * 1500 + 500;
    await new Promise(resolve => setTimeout(resolve, delay));

    const providerMap = {
        'auto': 'IRIS Auto-Select',
        'gemini': 'Google Gemini',
        'groq': 'Groq Llama',
        'ollama': 'Ollama Local',
        'openai': 'OpenAI GPT',
        'claude': 'Anthropic Claude'
    };

    const selectedProvider = providerMap[provider] || 'IRIS System';
    
    // Smart response based on query type
    let response;
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
        response = `Hello! I'm the IRIS AI Orchestration System. I can help you with coding, creative writing, analysis, and more. I automatically select the best AI provider for your needs. How can I assist you today?`;
    } else if (lowerMessage.includes('code') || lowerMessage.includes('function') || lowerMessage.includes('python') || lowerMessage.includes('javascript')) {
        response = `I can help you with coding! As an AI orchestration system, I route coding tasks to the most suitable provider. For complex code generation, I typically use local Ollama with DeepSeek-Coder, or fallback to OpenAI's models for advanced scenarios. What specific programming task would you like help with?`;
    } else if (lowerMessage.includes('write') || lowerMessage.includes('creative') || lowerMessage.includes('story')) {
        response = `Perfect for creative writing! The IRIS system would typically route this to Google Gemini for creative tasks, as it excels at imaginative content. I can help with stories, articles, poetry, or any creative writing project. What would you like me to create?`;
    } else if (lowerMessage.includes('explain') || lowerMessage.includes('what is') || lowerMessage.includes('how does')) {
        response = `Great question! For explanatory content, I leverage the best available model. This could be Ollama's Qwen 2.5 for technical explanations, or GPT-4 for complex topics. The IRIS system automatically determines which provider gives you the most accurate and helpful explanation.`;
    } else if (lowerMessage.includes('math') || lowerMessage.includes('calculate') || lowerMessage.includes('solve')) {
        response = `I can help with mathematical problems! The IRIS system routes math queries to providers optimized for reasoning and calculation. For complex math, I might use OpenAI's o1 models, while simpler calculations work well with local Ollama models.`;
    } else {
        response = `Thank you for your query! The IRIS AI Orchestration System has processed your request through intelligent provider selection. Based on your query type, I selected ${selectedProvider} for optimal response quality and speed. The system continuously learns from interactions to improve future routing decisions.`;
    }

    return {
        response,
        provider: selectedProvider,
        responseTime: Math.floor(delay),
        model: getModelForProvider(provider),
        success: true,
        metadata: {
            contextLength: Math.floor(Math.random() * 500),
            tokensUsed: Math.floor(Math.random() * 200) + 50,
            decision: {
                reason: `Optimized for ${getTaskType(lowerMessage)} task`,
                useMistral: provider === 'ollama' || provider === 'auto',
                confidence: 0.85 + Math.random() * 0.15
            }
        }
    };
}

function getModelForProvider(provider) {
    const models = {
        'auto': 'Auto-Selected',
        'gemini': 'gemini-1.5-flash',
        'groq': 'llama-3.1-8b-instant',
        'ollama': 'qwen2.5:7b',
        'openai': 'gpt-4o-mini',
        'claude': 'claude-3.5-sonnet'
    };
    return models[provider] || 'auto-selected';
}

function getTaskType(message) {
    if (message.includes('code') || message.includes('function')) return 'coding';
    if (message.includes('write') || message.includes('creative')) return 'creative';
    if (message.includes('fast') || message.includes('quick')) return 'fast';
    if (message.includes('explain') || message.includes('analyze')) return 'reasoning';
    return 'balanced';
}

function generateDemoProviders() {
    return {
        ollama: { 
            available: true, 
            status: 'healthy', 
            priority: 1, 
            type: 'local',
            models: ['qwen2.5:7b', 'mistral:7b', 'deepseek-coder:6.7b']
        },
        groq: { 
            available: true, 
            status: 'healthy', 
            priority: 2, 
            type: 'cloud',
            models: ['llama-3.1-8b-instant', 'mixtral-8x7b-32768']
        },
        openai: { 
            available: false, 
            status: 'unavailable', 
            priority: 3, 
            type: 'cloud',
            models: ['gpt-4o-mini', 'o1-preview']
        },
        gemini: { 
            available: true, 
            status: 'healthy', 
            priority: 4, 
            type: 'cloud',
            models: ['gemini-1.5-flash', 'gemini-1.5-pro']
        },
        claude: { 
            available: false, 
            status: 'unavailable', 
            priority: 5, 
            type: 'cloud',
            models: ['claude-3.5-sonnet']
        }
    };
}

// Serve the dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`IRIS API Server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard available at http://localhost:${PORT}`);
    console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📦 Cache: ${config.cache.maxSize} items, ${config.cache.ttlMinutes}min TTL`);
    console.log(`🔗 Pool: ${config.connectionPool.maxConnections} connections, ${config.connectionPool.maxRetries} retries`);
    
    // Initialize IRIS in the background
    initializeIRIS().catch(err => {
        console.warn('⚠️  Background IRIS initialization failed:', err.message);
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 IRIS API Server shutting down gracefully...');
    process.exit(0);
});

export default app;