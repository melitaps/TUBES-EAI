// ============================================
// API Gateway - Main Entry Point
// ============================================
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const authRoutes = require('./routes/auth');
const { authenticateToken } = require('./middleware/auth');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Middleware
// ============================================
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ type: 'application/xml', limit: '10mb' }));

// ============================================
// Swagger Documentation
// ============================================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'EAI Retail - API Documentation'
}));

// ============================================
// Health Check
// ============================================
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'api-gateway', timestamp: new Date().toISOString() });
});

// ============================================
// Auth Routes (Public)
// ============================================
app.use('/auth', authRoutes);

// ============================================
// Service Discovery / Routing Table
// ============================================
const serviceRoutes = {
  '/api/pos': process.env.POS_SERVICE_URL || 'http://pos-service:3001',
  '/api/inventory': process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:3002',
  '/api/accounting': process.env.ACCOUNTING_SERVICE_URL || 'http://accounting-service:3003',
  '/api/crm': process.env.CRM_SERVICE_URL || 'http://crm-service:3004',
  '/api/ecommerce': process.env.ECOMMERCE_SERVICE_URL || 'http://ecommerce-service:3005',
  '/api/integration': process.env.INTEGRATION_SERVICE_URL || 'http://integration-service:3006',
  '/api/translator': process.env.MESSAGE_TRANSLATOR_URL || 'http://message-translator:3007',
  '/api/router': process.env.MESSAGE_ROUTER_URL || 'http://message-router:3008'
};

// ============================================
// Routing Table Endpoint
// ============================================
app.get('/api/gateway/routes', authenticateToken, (req, res) => {
  const routes = Object.entries(serviceRoutes).map(([path, target]) => ({
    path,
    target,
    status: 'active'
  }));
  res.json({ routes, timestamp: new Date().toISOString() });
});

// ============================================
// Service Health Aggregator
// ============================================
app.get('/api/gateway/health', async (req, res) => {
  const healthChecks = {};
  for (const [path, url] of Object.entries(serviceRoutes)) {
    const serviceName = path.replace('/api/', '');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`${url}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      healthChecks[serviceName] = response.ok ? 'healthy' : 'unhealthy';
    } catch {
      healthChecks[serviceName] = 'unreachable';
    }
  }
  res.json({ services: healthChecks, timestamp: new Date().toISOString() });
});

// ============================================
// Proxy Routes with Authentication
// ============================================
Object.entries(serviceRoutes).forEach(([path, target]) => {
  app.use(path, authenticateToken, createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (reqPath) => {
      return '/api' + reqPath;
    },
    onError: (err, req, res) => {
      console.error(`Proxy error for ${path}:`, err.message);
      res.status(502).json({
        error: 'Service unavailable',
        service: path,
        message: err.message
      });
    }
  }));
});

// ============================================
// 404 Handler
// ============================================
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// ============================================
// Error Handler
// ============================================
app.use((err, req, res, next) => {
  console.error('Gateway error:', err);
  res.status(500).json({ error: 'Internal gateway error', message: err.message });
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📚 Swagger docs: http://localhost:${PORT}/api-docs`);
  console.log('📋 Routing table:');
  Object.entries(serviceRoutes).forEach(([path, target]) => {
    console.log(`   ${path} → ${target}`);
  });
});
