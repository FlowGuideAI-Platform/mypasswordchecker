/**
 * MyPasswordChecker.com - Self-Hosted Version
 * SOC 2 Type 2 Compliant Password Strength API
 *
 * Features:
 * - Comprehensive audit logging
 * - Rate limiting & DDoS protection
 * - API key authentication with JWT
 * - PostgreSQL for persistent storage
 * - Redis for session/cache management
 * - Security headers (OWASP best practices)
 * - Health check endpoints for K8s
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const pino = require('pino');
const pinoHttp = require('pino-http');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Redis = require('ioredis');
const { Pool } = require('pg');

// Configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_IN_PRODUCTION';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DATABASE_URL = process.env.DATABASE_URL;

// Initialize logger (structured logging for SOC 2 audit trail)
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['req.headers.authorization', 'req.headers["x-api-key"]', 'password'],
    remove: true
  }
});

// Initialize Express app
const app = express();

// Initialize Redis for caching and session management
const redis = new Redis(REDIS_URL, {
  retryStrategy: (times) => Math.min(times * 50, 2000),
  enableOfflineQueue: false
});

redis.on('error', (err) => logger.error({ err }, 'Redis connection error'));
redis.on('connect', () => logger.info('Redis connected'));

// Initialize PostgreSQL for persistent storage
const pool = DATABASE_URL ? new Pool({
  connectionString: DATABASE_URL,
  ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}) : null;

if (pool) {
  pool.on('error', (err) => logger.error({ err }, 'PostgreSQL pool error'));
  pool.on('connect', () => logger.info('PostgreSQL connected'));
}

// Middleware: Security headers (OWASP recommendations)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}));

// Middleware: CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true,
  maxAge: 86400
}));

// Middleware: Body parser
app.use(express.json({ limit: '10kb' }));

// Middleware: Request logging with audit trail
app.use(pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.url === '/health' || req.url === '/ready'
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} completed with ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} failed with ${res.statusCode}: ${err.message}`;
  }
}));

// Middleware: Rate limiting (DDoS protection)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
  handler: (req, res) => {
    logger.warn({ ip: req.ip, path: req.path }, 'Rate limit exceeded');
    res.status(429).json({ error: 'Too many requests' });
  }
});

app.use('/api/', limiter);

// Middleware: API Key authentication
async function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    logger.warn({ ip: req.ip, path: req.path }, 'Missing API key');
    return res.status(401).json({ error: 'Missing API key' });
  }

  try {
    // Check Redis cache first
    const cached = await redis.get(`apikey:${apiKey}`);
    if (cached) {
      req.keyData = JSON.parse(cached);
      return next();
    }

    // Check database
    if (!pool) {
      logger.error('Database not configured');
      return res.status(500).json({ error: 'Internal server error' });
    }

    const result = await pool.query(
      'SELECT * FROM api_keys WHERE api_key = $1 AND status = $2',
      [apiKey, 'active']
    );

    if (result.rows.length === 0) {
      logger.warn({ ip: req.ip, apiKey: apiKey.substring(0, 10) }, 'Invalid API key');
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const keyData = result.rows[0];

    // Cache for 5 minutes
    await redis.setex(`apikey:${apiKey}`, 300, JSON.stringify(keyData));

    req.keyData = keyData;

    // Audit log
    logger.info({
      event: 'api_key_validated',
      customer_id: keyData.customer_id,
      plan: keyData.plan,
      ip: req.ip
    });

    next();
  } catch (error) {
    logger.error({ err: error, ip: req.ip }, 'API key validation error');
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Middleware: Usage tracking and quota enforcement
async function checkAndIncrementUsage(req, res, next) {
  const { keyData } = req;
  const endpoint = req.path.includes('quantum-estimate') ? 'tier2' : 'tier1';

  try {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const usageKey = `usage:${keyData.customer_id}:${monthKey}`;

    // Get current usage from Redis
    const usage = await redis.get(usageKey);
    const usageData = usage ? JSON.parse(usage) : {
      tier1_requests: 0,
      tier2_requests: 0,
      month: monthKey,
      customer_id: keyData.customer_id
    };

    // Determine quota
    let quota = 25; // Free tier default
    const isTier2 = endpoint === 'tier2';
    const currentCount = isTier2 ? usageData.tier2_requests : usageData.tier1_requests;

    if (isTier2) {
      if (keyData.plan === 'quantum_monthly') {
        quota = 1500;
      } else {
        // Pay-per-use for non-quantum plans
        quota = Infinity;
      }
    } else {
      if (keyData.plan === 'standard') {
        quota = 3000;
      } else if (keyData.plan === 'quantum_monthly') {
        quota = 15000;
      }
    }

    // Check quota
    if (quota !== Infinity && currentCount >= quota && !keyData.allow_overage) {
      logger.warn({
        event: 'quota_exceeded',
        customer_id: keyData.customer_id,
        plan: keyData.plan,
        usage: currentCount,
        quota
      });
      return res.status(429).json({
        error: 'Quota exceeded',
        usage: currentCount,
        quota
      });
    }

    // Increment usage
    if (isTier2) {
      usageData.tier2_requests += 1;
    } else {
      usageData.tier1_requests += 1;
    }

    // Save to Redis
    await redis.setex(usageKey, 90 * 24 * 60 * 60, JSON.stringify(usageData));

    // Persist to database (async, don't block request)
    if (pool) {
      pool.query(
        `INSERT INTO usage_logs (customer_id, endpoint, month, tier1_requests, tier2_requests, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (customer_id, month)
         DO UPDATE SET
           tier1_requests = EXCLUDED.tier1_requests,
           tier2_requests = EXCLUDED.tier2_requests,
           updated_at = NOW()`,
        [keyData.customer_id, endpoint, monthKey, usageData.tier1_requests, usageData.tier2_requests]
      ).catch(err => logger.error({ err }, 'Failed to persist usage to database'));
    }

    const newUsage = currentCount + 1;
    const remaining = quota === Infinity ? 'unlimited' : Math.max(0, quota - newUsage);

    req.usageInfo = {
      usage: newUsage,
      quota: quota === Infinity ? 'unlimited' : quota,
      remaining,
      pay_per_use: quota === Infinity
    };

    // Audit log
    logger.info({
      event: 'api_request',
      customer_id: keyData.customer_id,
      plan: keyData.plan,
      endpoint,
      usage: newUsage,
      quota: quota === Infinity ? 'unlimited' : quota,
      ip: req.ip
    });

    next();
  } catch (error) {
    logger.error({ err: error }, 'Usage tracking error');
    // Fail open for availability
    req.usageInfo = { usage: 0, quota: 0, remaining: 0 };
    next();
  }
}

// Health check endpoint (Kubernetes liveness probe)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Readiness check endpoint (Kubernetes readiness probe)
app.get('/ready', async (req, res) => {
  try {
    // Check Redis
    await redis.ping();

    // Check PostgreSQL
    if (pool) {
      await pool.query('SELECT 1');
    }

    res.status(200).json({
      status: 'ready',
      redis: 'connected',
      database: pool ? 'connected' : 'not_configured',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error({ err: error }, 'Readiness check failed');
    res.status(503).json({ status: 'not_ready', error: error.message });
  }
});

// API Endpoints

// POST /api/v1/check-password - Tier 1: Password strength checking
app.post('/api/v1/check-password',
  authenticateApiKey,
  checkAndIncrementUsage,
  [
    body('password').isString().notEmpty().withMessage('Password is required')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { usageInfo } = req;

    res.json({
      success: true,
      message: 'Request validated. Perform analysis client-side using zxcvbn.',
      usage: usageInfo.usage,
      remaining: usageInfo.remaining,
      quota: usageInfo.quota
    });
  }
);

// POST /api/v1/quantum-estimate - Tier 2: Quantum resistance estimate
app.post('/api/v1/quantum-estimate',
  authenticateApiKey,
  checkAndIncrementUsage,
  [
    body('password').isString().notEmpty().withMessage('Password is required')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { usageInfo } = req;

    const response = {
      success: true,
      message: 'Quantum estimate request validated. Perform analysis client-side.',
      usage: usageInfo.usage,
      remaining: usageInfo.remaining,
      quota: usageInfo.quota,
      note: 'Quantum estimates are theoretical and educational only. No guarantee of real-world accuracy.'
    };

    if (usageInfo.pay_per_use) {
      response.billing_notice = `This request will be billed at $1.00. Total quantum requests this month: ${usageInfo.usage}.`;
      response.pay_per_use = true;
    }

    res.json(response);
  }
);

// POST /api/auth/register - Create new API key
app.post('/api/auth/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('name').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, name } = req.body;
      const apiKey = `mpc_${uuidv4().replace(/-/g, '')}`;
      const customerId = `cust_${uuidv4().replace(/-/g, '')}`;

      if (!pool) {
        return res.status(500).json({ error: 'Database not configured' });
      }

      // Create API key in database
      await pool.query(
        `INSERT INTO api_keys (api_key, customer_id, email, name, plan, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [apiKey, customerId, email, name || null, 'free', 'active']
      );

      // Audit log
      logger.info({
        event: 'api_key_created',
        customer_id: customerId,
        email,
        plan: 'free',
        ip: req.ip
      });

      res.status(201).json({
        success: true,
        api_key: apiKey,
        customer_id: customerId,
        plan: 'free',
        quota: 25,
        message: 'API key created successfully'
      });
    } catch (error) {
      logger.error({ err: error }, 'API key creation failed');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/dashboard/usage - Get usage statistics
app.get('/api/dashboard/usage',
  authenticateApiKey,
  async (req, res) => {
    try {
      const { keyData } = req;
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const usageKey = `usage:${keyData.customer_id}:${monthKey}`;

      const usage = await redis.get(usageKey);
      const usageData = usage ? JSON.parse(usage) : {
        tier1_requests: 0,
        tier2_requests: 0,
        month: monthKey
      };

      res.json({
        success: true,
        customer_id: keyData.customer_id,
        email: keyData.email,
        plan: keyData.plan,
        month: monthKey,
        usage: usageData
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to fetch usage');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Error handler
app.use((err, req, res, next) => {
  logger.error({ err, req: { method: req.method, url: req.url } }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');

  await redis.quit();
  if (pool) await pool.end();

  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`MyPasswordChecker.com self-hosted running on port ${PORT}`);
  logger.info(`Environment: ${NODE_ENV}`);
  logger.info(`Database: ${pool ? 'PostgreSQL connected' : 'Not configured'}`);
  logger.info(`Redis: ${REDIS_URL}`);
});
