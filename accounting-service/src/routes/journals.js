// ============================================
// Accounting Journal Routes
// ============================================
const express = require('express');
const router = express.Router();

// GET /api/journals - List all journals
router.get('/', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const { source, startDate, endDate } = req.query;
    
    let query = 'SELECT * FROM journals';
    const params = [];
    const conditions = [];

    if (source) {
      params.push(source);
      conditions.push(`source = $${params.length}`);
    }
    if (startDate) {
      params.push(startDate);
      conditions.push(`created_at >= $${params.length}`);
    }
    if (endDate) {
      params.push(endDate);
      conditions.push(`created_at <= $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/journals/:id - Get journal with entries
router.get('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const journal = await pool.query('SELECT * FROM journals WHERE id = $1', [req.params.id]);
    if (journal.rows.length === 0) return res.status(404).json({ error: 'Journal not found' });

    const entries = await pool.query(
      'SELECT * FROM journal_entries WHERE journal_id = $1 ORDER BY id',
      [req.params.id]
    );

    res.json({ ...journal.rows[0], entries: entries.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
