// ============================================
// Message Translator Service
// EIP: Message Translator, Canonical Data Model
// Transforms XML → JSON and maps to Canonical Model
// ============================================
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const xml2js = require('xml2js');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3007;

app.use(cors());
app.use(morgan('short'));
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ type: ['application/xml', 'text/xml'], limit: '10mb' }));

// Transformation history
const transformationHistory = [];
const MAX_HISTORY = 200;

function addHistory(type, input, output) {
  const entry = {
    id: uuidv4(),
    type,
    input: typeof input === 'string' ? input : JSON.stringify(input),
    output: typeof output === 'string' ? output : JSON.stringify(output),
    timestamp: new Date().toISOString()
  };
  transformationHistory.unshift(entry);
  if (transformationHistory.length > MAX_HISTORY) transformationHistory.pop();
  return entry;
}

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'message-translator', timestamp: new Date().toISOString() });
});

// ============================================
// POST /api/translate/xml-to-json
// Transforms raw XML to JSON
// ============================================
app.post('/api/translate/xml-to-json', async (req, res) => {
  try {
    let xmlString = req.body;
    if (typeof xmlString === 'object') {
      xmlString = req.body.xml || req.body.rawXml || '';
    }

    if (!xmlString) {
      return res.status(400).json({ error: 'XML content required' });
    }

    const parser = new xml2js.Parser({ 
      explicitArray: false, 
      trim: true,
      explicitRoot: false 
    });
    
    const result = await parser.parseStringPromise(xmlString);
    
    addHistory('xml-to-json', xmlString, result);

    res.json({
      original_format: 'XML',
      translated_format: 'JSON',
      original: xmlString,
      translated: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({ error: `XML parsing failed: ${error.message}` });
  }
});

// ============================================
// POST /api/translate/to-canonical
// Transforms any event to Canonical Data Model (SalesEvent)
// ============================================
app.post('/api/translate/to-canonical', async (req, res) => {
  try {
    const event = req.body;
    let parsedXml = null;

    // If has raw XML, parse it first
    if (event.rawXml) {
      try {
        const parser = new xml2js.Parser({ explicitArray: false, trim: true, explicitRoot: false });
        parsedXml = await parser.parseStringPromise(event.rawXml);
      } catch (e) {
        console.log('XML parse skipped:', e.message);
      }
    }

    // Map to Canonical Data Model: SalesEvent
    const canonical = {
      eventId: event.eventId || `EVT-${uuidv4()}`,
      source: event.source || (parsedXml ? 'pos' : 'unknown'),
      type: event.type || 'sale',
      customerId: event.customerId || (parsedXml && parsedXml.CustomerId) || '',
      productId: event.productId || (parsedXml && parsedXml.ProductId) || '',
      productName: event.productName || (parsedXml && parsedXml.ProductName) || '',
      quantity: parseInt(event.quantity || (parsedXml && parsedXml.Qty) || 0),
      price: parseFloat(event.price || (parsedXml && parsedXml.UnitPrice) || 0),
      totalAmount: parseFloat(event.totalAmount || 0),
      invoiceNo: event.invoiceNo || (parsedXml && parsedXml.InvoiceNo) || '',
      timestamp: event.timestamp || new Date().toISOString()
    };

    if (!canonical.totalAmount && canonical.quantity && canonical.price) {
      canonical.totalAmount = canonical.quantity * canonical.price;
    }

    addHistory('to-canonical', event, canonical);

    res.json({
      original: event,
      canonical,
      parsedXml,
      model: 'SalesEvent (Canonical Data Model)',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// POST /api/translate/json-to-xml
// Transforms JSON back to XML
// ============================================
app.post('/api/translate/json-to-xml', (req, res) => {
  try {
    const json = req.body;
    const builder = new xml2js.Builder({ rootName: 'Sale', headless: false });
    const xml = builder.buildObject(json);

    addHistory('json-to-xml', json, xml);

    res.type('application/xml').send(xml);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET /api/translate/history
// ============================================
app.get('/api/translate/history', (req, res) => {
  res.json(transformationHistory);
});

// Stats
app.get('/api/stats', (req, res) => {
  res.json({
    totalTransformations: transformationHistory.length,
    xmlToJson: transformationHistory.filter(h => h.type === 'xml-to-json').length,
    toCanonical: transformationHistory.filter(h => h.type === 'to-canonical').length,
    jsonToXml: transformationHistory.filter(h => h.type === 'json-to-xml').length
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔄 Message Translator running on port ${PORT}`);
});
