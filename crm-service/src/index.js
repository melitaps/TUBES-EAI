// ============================================
// CRM Service - Main Entry Point
// ============================================
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const customerRoutes = require('./routes/customers');
const { startConsumer } = require('./consumers/crmConsumer');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3004;

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'crm_user',
  password: process.env.DB_PASS || 'crm_secret_2024',
  database: process.env.DB_NAME || 'crm_database',
  waitForConnections: true,
  connectionLimit: 10
});

app.use(cors());
app.use(morgan('short'));
app.use(express.json());

app.locals.db = pool;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'crm-service', timestamp: new Date().toISOString() });
});

app.use('/api/customers', customerRoutes);

// Stats
app.get('/api/stats', async (req, res) => {
  try {
    const [custCount] = await pool.query('SELECT COUNT(*) as count FROM customers');
    const [histCount] = await pool.query('SELECT COUNT(*) as count FROM purchase_history');
    res.json({
      totalCustomers: custCount[0].count,
      totalPurchases: histCount[0].count
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
      console.log('✅ CRM Database connected');
      break;
    } catch (err) {
      retries--;
      console.log(`⏳ Waiting for database... (${retries} retries left)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`👥 CRM Service running on port ${PORT}`);
  });

  setTimeout(() => startConsumer(pool), 5000);
};

startServer();
