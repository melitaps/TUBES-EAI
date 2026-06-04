// ============================================
// Accounting Service - Main Entry Point
// ============================================
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const journalRoutes = require('./routes/journals');
const { startConsumer } = require('./consumers/accountingConsumer');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3003;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'accounting_user',
  password: process.env.DB_PASS || 'accounting_secret_2024',
  database: process.env.DB_NAME || 'accounting_database'
});

app.use(cors());
app.use(morgan('short'));
app.use(express.json());

app.locals.db = pool;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'accounting-service', timestamp: new Date().toISOString() });
});

app.use('/api/journals', journalRoutes);

// Stats
app.get('/api/stats', async (req, res) => {
  try {
    const count = await pool.query('SELECT COUNT(*) as count FROM journals');
    const total = await pool.query('SELECT COALESCE(SUM(total_amount), 0) as total FROM journals');
    res.json({
      totalJournals: parseInt(count.rows[0].count),
      totalAmount: parseFloat(total.rows[0].total)
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
      console.log('✅ Accounting Database connected');
      break;
    } catch (err) {
      retries--;
      console.log(`⏳ Waiting for database... (${retries} retries left)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`📒 Accounting Service running on port ${PORT}`);
  });

  setTimeout(() => startConsumer(pool), 5000);
};

startServer();
