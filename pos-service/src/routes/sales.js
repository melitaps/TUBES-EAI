// ============================================
// POS Sales Routes - Full CRUD + XML Output
// ============================================
const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { v4: uuidv4 } = require('uuid');
const { create } = require('xmlbuilder2');

// GET /api/sales - List all sales
router.get('/', async (req, res) => {
  try {
    const [sales] = await db.query(`
      SELECT s.*, 
        JSON_ARRAYAGG(
          JSON_OBJECT('id', si.id, 'product_id', si.product_id, 'product_name', si.product_name,
            'quantity', si.quantity, 'unit_price', si.unit_price, 'subtotal', si.subtotal)
        ) as items
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sales/:id - Get sale by ID
router.get('/:id', async (req, res) => {
  try {
    const [sales] = await db.query('SELECT * FROM sales WHERE id = ?', [req.params.id]);
    if (sales.length === 0) return res.status(404).json({ error: 'Sale not found' });

    const [items] = await db.query('SELECT * FROM sale_items WHERE sale_id = ?', [req.params.id]);
    res.json({ ...sales[0], items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sales - Create sale (produces XML, triggers integration)
router.post('/', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { customer_id, items } = req.body;
    const invoice_no = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    let total_amount = 0;
    if (items && items.length > 0) {
      items.forEach(item => {
        total_amount += (item.quantity * item.unit_price);
      });
    }

    const [result] = await conn.query(
      'INSERT INTO sales (invoice_no, customer_id, total_amount, status) VALUES (?, ?, ?, ?)',
      [invoice_no, customer_id, total_amount, 'completed']
    );

    const saleId = result.insertId;

    if (items && items.length > 0) {
      for (const item of items) {
        const subtotal = item.quantity * item.unit_price;
        await conn.query(
          'INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)',
          [saleId, item.product_id, item.product_name || '', item.quantity, item.unit_price, subtotal]
        );
      }
    }

    await conn.commit();

    // Generate XML output (heterogeneity requirement)
    const xmlDoc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('Sale')
        .ele('InvoiceNo').txt(invoice_no).up()
        .ele('CustomerId').txt(customer_id || '').up()
        .ele('TotalAmount').txt(total_amount.toString()).up()
        .ele('Status').txt('completed').up()
        .ele('Items');

    if (items && items.length > 0) {
      items.forEach(item => {
        xmlDoc.ele('Item')
          .ele('ProductId').txt(item.product_id).up()
          .ele('ProductName').txt(item.product_name || '').up()
          .ele('Qty').txt(item.quantity.toString()).up()
          .ele('UnitPrice').txt(item.unit_price.toString()).up()
        .up();
      });
    }

    const xmlString = xmlDoc.up().up().end({ prettyPrint: true });

    // Send integration event for each item
    const integrationUrl = process.env.INTEGRATION_SERVICE_URL || 'http://integration-service:3006';
    
    if (items && items.length > 0) {
      for (const item of items) {
        const event = {
          eventId: `EVT-${uuidv4()}`,
          source: 'pos',
          type: 'sale',
          customerId: customer_id,
          productId: item.product_id,
          productName: item.product_name || '',
          quantity: item.quantity,
          price: item.unit_price,
          totalAmount: item.quantity * item.unit_price,
          invoiceNo: invoice_no,
          timestamp: new Date().toISOString(),
          rawXml: xmlString
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

    res.status(201).json({
      message: 'Sale created successfully',
      sale: { id: saleId, invoice_no, customer_id, total_amount, status: 'completed' },
      xml: xmlString,
      integration: 'Event sent to Integration Layer'
    });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    conn.release();
  }
});

// PUT /api/sales/:id - Update sale
router.put('/:id', async (req, res) => {
  try {
    const { customer_id, status } = req.body;
    await db.query(
      'UPDATE sales SET customer_id = COALESCE(?, customer_id), status = COALESCE(?, status) WHERE id = ?',
      [customer_id, status, req.params.id]
    );
    const [updated] = await db.query('SELECT * FROM sales WHERE id = ?', [req.params.id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Sale not found' });
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/sales/:id - Delete sale
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM sales WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Sale not found' });
    res.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
