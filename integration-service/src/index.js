// ============================================
// Integration Service - Central Orchestrator
// EIP: Message Channel, Publish-Subscribe, 
//      Canonical Data Model, Retry Mechanism
// ============================================
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3006;

app.use(cors());
app.use(morgan('short'));
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ type: 'application/xml', limit: '10mb' }));

// In-memory event log
const eventLog = [];
const MAX_LOG = 500;

let rabbitChannel = null;

// ============================================
// Connect to RabbitMQ with retry
// ============================================
async function connectRabbitMQ() {
  let retries = 20;
  while (retries > 0) {
    try {
      const url = process.env.RABBITMQ_URL || 'amqp://eai_admin:eai_secret_2024@rabbitmq:5672';
      const connection = await amqp.connect(url);
      rabbitChannel = await connection.createChannel();
      
      // Ensure exchanges exist
      await rabbitChannel.assertExchange('sales.exchange', 'fanout', { durable: true });
      await rabbitChannel.assertExchange('stock.exchange', 'direct', { durable: true });
      await rabbitChannel.assertExchange('dlx.exchange', 'fanout', { durable: true });
      
      console.log('✅ Integration Service connected to RabbitMQ');
      return;
    } catch (err) {
      retries--;
      console.log(`⏳ Waiting for RabbitMQ... (${retries} retries left)`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  console.error('❌ Could not connect to RabbitMQ');
}

// ============================================
// Add event to log
// ============================================
function addLog(type, message, data = {}) {
  const logEntry = {
    id: uuidv4(),
    type,
    message,
    data,
    timestamp: new Date().toISOString()
  };
  eventLog.unshift(logEntry);
  if (eventLog.length > MAX_LOG) eventLog.pop();
  return logEntry;
}

// ============================================
// Health Check
// ============================================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'integration-service',
    rabbitmq: rabbitChannel ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString() 
  });
});

// ============================================
// POST /api/events - Receive and process event
// Central integration endpoint
// ============================================
app.post('/api/events', async (req, res) => {
  try {
    const event = req.body;
    
    addLog('EVENT_RECEIVED', `Event received from ${event.source}`, { eventId: event.eventId, source: event.source });

    // Step 1: Translate if needed (XML → JSON via Message Translator)
    let canonicalEvent = event;
    if (event.rawXml) {
      try {
        const translatorUrl = process.env.MESSAGE_TRANSLATOR_URL || 'http://message-translator:3007';
        const translateResponse = await fetch(`${translatorUrl}/api/translate/to-canonical`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event)
        });
        const translated = await translateResponse.json();
        canonicalEvent = { ...event, ...translated.canonical };
        addLog('MESSAGE_TRANSLATED', `Event translated to canonical format`, { eventId: event.eventId });
      } catch (err) {
        console.error('Translation failed, using original:', err.message);
        addLog('TRANSLATION_FAILED', `Translation failed: ${err.message}`, { eventId: event.eventId });
      }
    }

    // Step 2: Route via Message Router
    try {
      const routerUrl = process.env.MESSAGE_ROUTER_URL || 'http://message-router:3008';
      const routeResponse = await fetch(`${routerUrl}/api/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(canonicalEvent)
      });
      const routeResult = await routeResponse.json();
      addLog('MESSAGE_ROUTED', `Message routed: ${routeResult.decision}`, { eventId: event.eventId, decision: routeResult.decision });
    } catch (err) {
      console.error('Routing check failed:', err.message);
      addLog('ROUTING_FAILED', `Routing failed: ${err.message}`, { eventId: event.eventId });
    }

    // Step 3: Publish to RabbitMQ (Publish-Subscribe via fanout exchange)
    if (rabbitChannel) {
      const messageBuffer = Buffer.from(JSON.stringify(canonicalEvent));
      
      // Publish to sales.exchange (fanout) → broadcasts to all queues
      rabbitChannel.publish('sales.exchange', '', messageBuffer, {
        persistent: true,
        messageId: event.eventId,
        timestamp: Date.now(),
        headers: {
          source: event.source,
          type: event.type || 'sale'
        }
      });

      addLog('MESSAGE_PUBLISHED', `Event published to sales.exchange`, { 
        eventId: event.eventId, 
        exchange: 'sales.exchange',
        queues: ['inventory.queue', 'accounting.queue', 'crm.queue']
      });

      console.log(`📤 Event ${event.eventId} published to sales.exchange`);
    } else {
      addLog('PUBLISH_FAILED', 'RabbitMQ not connected', { eventId: event.eventId });
    }

    res.status(201).json({
      message: 'Event processed successfully',
      eventId: event.eventId,
      status: 'published',
      targets: ['inventory.queue', 'accounting.queue', 'crm.queue']
    });

  } catch (error) {
    addLog('ERROR', `Error processing event: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET /api/events - List processed events
// ============================================
app.get('/api/events', (req, res) => {
  res.json(eventLog);
});

// GET /api/events/log - Same as above for compatibility
app.get('/api/events/log', (req, res) => {
  res.json(eventLog);
});

// GET /api/events/stats
app.get('/api/events/stats', (req, res) => {
  const stats = {
    totalEvents: eventLog.length,
    published: eventLog.filter(e => e.type === 'MESSAGE_PUBLISHED').length,
    failed: eventLog.filter(e => e.type === 'ERROR' || e.type === 'PUBLISH_FAILED').length,
    translated: eventLog.filter(e => e.type === 'MESSAGE_TRANSLATED').length
  };
  res.json(stats);
});

// ============================================
// GET /api/queues - RabbitMQ queue info
// ============================================
app.get('/api/queues', async (req, res) => {
  try {
    const rabbitMgmt = `http://rabbitmq:15672`;
    const auth = Buffer.from(`${process.env.RABBITMQ_USER || 'eai_admin'}:${process.env.RABBITMQ_PASS || 'eai_secret_2024'}`).toString('base64');
    
    const response = await fetch(`${rabbitMgmt}/api/queues`, {
      headers: { 'Authorization': `Basic ${auth}` }
    });
    
    if (response.ok) {
      const queues = await response.json();
      const queueInfo = queues.map(q => ({
        name: q.name,
        messages: q.messages || 0,
        consumers: q.consumers || 0,
        state: q.state || 'unknown',
        messageRate: q.message_stats?.publish_details?.rate || 0
      }));
      res.json(queueInfo);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.json([]);
  }
});

// ============================================
// Start
// ============================================
const startServer = async () => {
  await connectRabbitMQ();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🔗 Integration Service running on port ${PORT}`);
  });
};

startServer();
