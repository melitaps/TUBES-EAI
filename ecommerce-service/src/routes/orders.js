// ============================================
// E-Commerce Order Routes - Full CRUD
// ============================================
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// GET /api/orders
router.get('/', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const result = await pool.query(`
      SELECT o.*, 
        COALESCE(json_agg(
          json_build_object('id', oi.id, 'product_id', oi.product_id, 'product_name', oi.product_name,
            'quantity', oi.quantity, 'unit_price', oi.unit_price, 'subtotal', oi.subtotal)
        ) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const order = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (order.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [req.params.id]);
    res.json({ ...order.rows[0], items: items.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/orders - Create order (triggers integration)
router.post('/', async (req, res) => {
  const pool = req.app.locals.db;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { customer_id, customer_name, items } = req.body;
    const order_no = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    let total_amount = 0;
    if (items && items.length > 0) {
      items.forEach(item => { total_amount += item.quantity * item.unit_price; });
    }

    const orderResult = await client.query(
      'INSERT INTO orders (order_no, customer_id, customer_name, status, total_amount) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [order_no, customer_id, customer_name || '', 'pending', total_amount]
    );
    const orderId = orderResult.rows[0].id;

    if (items && items.length > 0) {
      for (const item of items) {
        const subtotal = item.quantity * item.unit_price;
        await client.query(
          'INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal) VALUES ($1, $2, $3, $4, $5, $6)',
          [orderId, item.product_id, item.product_name || '', item.quantity, item.unit_price, subtotal]
        );
      }
    }

    await client.query('COMMIT');

    // Send integration events
    const integrationUrl = process.env.INTEGRATION_SERVICE_URL || 'http://integration-service:3006';
    
    if (items && items.length > 0) {
      for (const item of items) {
        const event = {
          eventId: `EVT-${uuidv4()}`,
          source: 'ecommerce',
          type: 'order',
          customerId: customer_id,
          productId: item.product_id,
          productName: item.product_name || '',
          quantity: item.quantity,
          price: item.unit_price,
          totalAmount: item.quantity * item.unit_price,
          orderNo: order_no,
          timestamp: new Date().toISOString()
        };

        try {
          await fetch(`${integrationUrl}/api/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event)
          });
        } catch (err) {
          console.error('Integration event failed:', err.message);
        }
      }
    }

    // Update status to completed
    await pool.query('UPDATE orders SET status = $1 WHERE id = $2', ['completed', orderId]);

    res.status(201).json({
      message: 'Order created successfully',
      order: { ...orderResult.rows[0], items },
      integration: 'Event sent to Integration Layer'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// PUT /api/orders/:id
router.put('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const { status, customer_name } = req.body;
    const result = await pool.query(
      'UPDATE orders SET status = COALESCE($1, status), customer_name = COALESCE($2, customer_name), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [status, customer_name, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/orders/:id - Cancel order
router.delete('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      ['cancelled', req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order cancelled', order: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
