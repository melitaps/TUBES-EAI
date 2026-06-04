// ============================================
// Message Router Service
// EIP: Message Router, Content-Based Router
// Routes messages based on content analysis
// ============================================
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3008;

app.use(cors());
app.use(morgan('short'));
app.use(express.json());

// Routing log
const routingLog = [];
const MAX_LOG = 200;

// ============================================
// Routing Rules (Content-Based Router)
// ============================================
const routingRules = [
  {
    id: 'RULE001',
    name: 'POS Sale → All Services',
    condition: 'source === "pos" && type === "sale"',
    description: 'Route POS sales to inventory, accounting, and CRM',
    targets: ['inventory.queue', 'accounting.queue', 'crm.queue'],
    priority: 1
  },
  {
    id: 'RULE002',
    name: 'E-Commerce Order → All Services',
    condition: 'source === "ecommerce" && type === "order"',
    description: 'Route e-commerce orders to inventory, accounting, and CRM',
    targets: ['inventory.queue', 'accounting.queue', 'crm.queue'],
    priority: 1
  },
  {
    id: 'RULE003',
    name: 'Stock Check → Route by Availability',
    condition: 'type === "stock_check"',
    description: 'Route to success or rejection based on stock',
    targets: ['stock.success.queue', 'stock.rejection.queue'],
    priority: 2
  },
  {
    id: 'RULE004',
    name: 'Failed Messages → Dead Letter Queue',
    condition: 'status === "failed" || retryCount > 3',
    description: 'Route failed messages to DLQ after max retries',
    targets: ['dlq.queue'],
    priority: 10
  }
];

function addRoutingLog(eventId, decision, rule, targets) {
  const entry = {
    id: uuidv4(),
    eventId,
    decision,
    rule,
    targets,
    timestamp: new Date().toISOString()
  };
  routingLog.unshift(entry);
  if (routingLog.length > MAX_LOG) routingLog.pop();
  return entry;
}

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'message-router', timestamp: new Date().toISOString() });
});

// ============================================
// POST /api/route - Content-Based Routing
// ============================================
app.post('/api/route', async (req, res) => {
  try {
    const event = req.body;
    let decision = 'route_to_all';
    let matchedRule = null;
    let targets = ['inventory.queue', 'accounting.queue', 'crm.queue'];

    // Content-Based Routing Logic
    if (event.source === 'pos' && (event.type === 'sale' || !event.type)) {
      decision = 'route_pos_sale';
      matchedRule = routingRules[0];
      targets = ['inventory.queue', 'accounting.queue', 'crm.queue'];
    } else if (event.source === 'ecommerce' && (event.type === 'order' || !event.type)) {
      decision = 'route_ecommerce_order';
      matchedRule = routingRules[1];
      targets = ['inventory.queue', 'accounting.queue', 'crm.queue'];
    }

    // Stock availability check (Content-Based)
    if (event.type === 'stock_check' || event.checkStock) {
      try {
        const inventoryUrl = process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:3002';
        const stockResponse = await fetch(`${inventoryUrl}/api/products/${event.productId}`);
        
        if (stockResponse.ok) {
          const product = await stockResponse.json();
          if (product.stock >= (event.quantity || 0)) {
            decision = 'stock_sufficient';
            targets = ['stock.success.queue'];
          } else {
            decision = 'stock_insufficient';
            targets = ['stock.rejection.queue'];
          }
          matchedRule = routingRules[2];
        }
      } catch (err) {
        console.log('Stock check failed:', err.message);
      }
    }

    // Failed message routing
    if (event.status === 'failed' || (event.retryCount && event.retryCount > 3)) {
      decision = 'route_to_dlq';
      matchedRule = routingRules[3];
      targets = ['dlq.queue'];
    }

    addRoutingLog(event.eventId, decision, matchedRule?.name || 'default', targets);

    res.json({
      eventId: event.eventId,
      decision,
      rule: matchedRule?.name || 'Default Route',
      targets,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET /api/route/rules - List routing rules
// ============================================
app.get('/api/route/rules', (req, res) => {
  res.json(routingRules);
});

// ============================================
// GET /api/route/log - Routing history
// ============================================
app.get('/api/route/log', (req, res) => {
  res.json(routingLog);
});

// Stats
app.get('/api/stats', (req, res) => {
  res.json({
    totalRouted: routingLog.length,
    rules: routingRules.length
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔀 Message Router running on port ${PORT}`);
});
