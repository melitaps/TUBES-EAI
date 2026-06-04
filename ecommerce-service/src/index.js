// ============================================
// E-Commerce Service - Main Entry Point
// ============================================
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const orderRoutes = require('./routes/orders');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3005;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'ecommerce_user',
  password: process.env.DB_PASS || 'ecommerce_secret_2024',
  database: process.env.DB_NAME || 'ecommerce_database'
});

app.use(cors());
app.use(morgan('short'));
app.use(express.json());

app.locals.db = pool;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'ecommerce-service', timestamp: new Date().toISOString() });
});

app.use('/api/orders', orderRoutes);

// Stats
app.get('/api/stats', async (req, res) => {
  try {
    const count = await pool.query('SELECT COUNT(*) as count FROM orders');
    const total = await pool.query('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders');
    res.json({
      totalOrders: parseInt(count.rows[0].count),
      totalRevenue: parseFloat(total.rows[0].total)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const startServer = async () => {
  let retries = 10;
  while (retries > 0) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ E-Commerce Database connected');
      break;
    } catch (err) {
      retries--;
      console.log(`⏳ Waiting for database... (${retries} retries left)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🛍️ E-Commerce Service running on port ${PORT}`);
  });
};

startServer();
