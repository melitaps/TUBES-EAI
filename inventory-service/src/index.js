// ============================================
// Inventory Service - Main Entry Point
// ============================================
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const productsRoutes = require('./routes/products');
const { startConsumer } = require('./consumers/inventoryConsumer');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3002;

// Database Pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'inventory_user',
  password: process.env.DB_PASS || 'inventory_secret_2024',
  database: process.env.DB_NAME || 'inventory_database'
});

app.use(cors());
app.use(morgan('short'));
app.use(express.json());

// Make pool available to routes
app.locals.db = pool;

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'inventory-service', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/products', productsRoutes);

// Stock movements endpoint
app.get('/api/stock-movements', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT sm.*, p.name as product_name FROM stock_movements sm LEFT JOIN products p ON sm.product_id = p.id ORDER BY sm.created_at DESC LIMIT 100'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stats endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const products = await pool.query('SELECT COUNT(*) as count FROM products');
    const lowStock = await pool.query('SELECT COUNT(*) as count FROM products WHERE stock < 10');
    res.json({
      totalProducts: parseInt(products.rows[0].count),
      lowStockProducts: parseInt(lowStock.rows[0].count)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server with retry
const startServer = async () => {
  let retries = 10;
  while (retries > 0) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ Inventory Database connected');
      break;
    } catch (err) {
      retries--;
      console.log(`⏳ Waiting for database... (${retries} retries left)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`📦 Inventory Service running on port ${PORT}`);
  });

  // Start RabbitMQ consumer
  setTimeout(() => startConsumer(pool), 5000);
};

startServer();
