// ============================================
// Inventory Products Routes - Full CRUD
// ============================================
const express = require('express');
const router = express.Router();

// GET /api/products - List all products
router.get('/', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const result = await pool.query('SELECT * FROM products ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/products/:id - Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/products - Create product
router.post('/', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const { id, name, description, stock, price, category } = req.body;
    const productId = id || `PROD${Date.now()}`;
    const result = await pool.query(
      'INSERT INTO products (id, name, description, stock, price, category) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [productId, name, description || '', stock || 0, price, category || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const { name, description, stock, price, category } = req.body;
    const result = await pool.query(
      `UPDATE products SET 
        name = COALESCE($1, name), 
        description = COALESCE($2, description),
        stock = COALESCE($3, stock), 
        price = COALESCE($4, price), 
        category = COALESCE($5, category),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 RETURNING *`,
      [name, description, stock, price, category, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const result = await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
