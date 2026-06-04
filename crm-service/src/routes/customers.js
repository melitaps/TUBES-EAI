// ============================================
// CRM Customer Routes - Full CRUD
// ============================================
const express = require('express');
const router = express.Router();

// GET /api/customers - List all customers
router.get('/', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const [rows] = await pool.query('SELECT * FROM customers ORDER BY name');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/customers/:id - Get customer by ID
router.get('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/customers/:id/history - Purchase history
router.get('/:id/history', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const [rows] = await pool.query(
      'SELECT * FROM purchase_history WHERE customer_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/customers - Create customer
router.post('/', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const { id, name, email, phone, address } = req.body;
    const customerId = id || `CUST${Date.now()}`;
    await pool.query(
      'INSERT INTO customers (id, name, email, phone, address) VALUES (?, ?, ?, ?, ?)',
      [customerId, name, email || '', phone || '', address || '']
    );
    const [created] = await pool.query('SELECT * FROM customers WHERE id = ?', [customerId]);
    res.status(201).json(created[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/customers/:id - Update customer
router.put('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const { name, email, phone, address } = req.body;
    await pool.query(
      'UPDATE customers SET name = COALESCE(?, name), email = COALESCE(?, email), phone = COALESCE(?, phone), address = COALESCE(?, address) WHERE id = ?',
      [name, email, phone, address, req.params.id]
    );
    const [updated] = await pool.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const [result] = await pool.query('DELETE FROM customers WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
