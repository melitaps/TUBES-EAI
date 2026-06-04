// ============================================
// POS Service - Main Entry Point
// ============================================
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const salesRoutes = require('./routes/sales');
const db = require('./models/db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(morgan('short'));
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'pos-service', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/sales', salesRoutes);

// Stats endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const [salesCount] = await db.query('SELECT COUNT(*) as count FROM sales');
    const [totalRevenue] = await db.query('SELECT COALESCE(SUM(total_amount), 0) as total FROM sales');
    res.json({
      totalSales: salesCount[0].count,
      totalRevenue: totalRevenue[0].total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start with retry for DB connection
const startServer = async () => {
  let retries = 10;
  while (retries > 0) {
    try {
      await db.query('SELECT 1');
      console.log('✅ POS Database connected');
      break;
    } catch (err) {
      retries--;
      console.log(`⏳ Waiting for database... (${retries} retries left)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🛒 POS Service running on port ${PORT}`);
  });
};

startServer();
