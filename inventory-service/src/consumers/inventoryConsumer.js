// ============================================
// Inventory RabbitMQ Consumer
// EIP: Message Endpoint, Idempotency
// ============================================
const amqp = require('amqplib');

const QUEUE = 'inventory.queue';

async function startConsumer(pool) {
  let retries = 15;
  let connection;

  while (retries > 0) {
    try {
      const url = process.env.RABBITMQ_URL || 'amqp://eai_admin:eai_secret_2024@rabbitmq:5672';
      connection = await amqp.connect(url);
      console.log('✅ Inventory Consumer connected to RabbitMQ');
      break;
    } catch (err) {
      retries--;
      console.log(`⏳ Waiting for RabbitMQ... (${retries} retries left)`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  if (!connection) {
    console.error('❌ Could not connect to RabbitMQ');
    return;
  }

  const channel = await connection.createChannel();
  await channel.assertQueue(QUEUE, { durable: true });
  channel.prefetch(1);

  console.log(`📥 Listening on queue: ${QUEUE}`);

  channel.consume(QUEUE, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());
      console.log(`📦 Processing inventory event: ${event.eventId}`);

      // Idempotency check - prevent duplicate processing
      const existing = await pool.query(
        'SELECT id FROM stock_movements WHERE event_id = $1',
        [event.eventId]
      );

      if (existing.rows.length > 0) {
        console.log(`⚠️ Duplicate event ${event.eventId} - skipping`);
        channel.ack(msg);
        return;
      }

      // Check current stock
      const product = await pool.query(
        'SELECT * FROM products WHERE id = $1',
        [event.productId]
      );

      if (product.rows.length === 0) {
        console.log(`⚠️ Product ${event.productId} not found - nacking`);
        channel.nack(msg, false, false); // Send to DLQ
        return;
      }

      const currentStock = product.rows[0].stock;
      const quantity = event.quantity || 0;

      // Content-Based Routing: check stock availability
      if (currentStock < quantity) {
        console.log(`❌ Insufficient stock for ${event.productId}: ${currentStock} < ${quantity}`);
        
        // Record failed movement
        await pool.query(
          `INSERT INTO stock_movements (product_id, event_id, movement_type, quantity, stock_before, stock_after, reference) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [event.productId, event.eventId, 'failed', quantity, currentStock, currentStock, 
           `Out of stock - ${event.invoiceNo || event.source}`]
        );

        // Publish to rejection queue via stock exchange
        try {
          await channel.publish('stock.exchange', 'rejection', Buffer.from(JSON.stringify({
            ...event,
            reason: 'insufficient_stock',
            currentStock,
            requestedQuantity: quantity
          })), { persistent: true });
        } catch (pubErr) {
          console.error('Failed to publish rejection:', pubErr.message);
        }

        channel.ack(msg);
        return;
      }

      // Reduce stock
      const newStock = currentStock - quantity;
      await pool.query(
        'UPDATE products SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newStock, event.productId]
      );

      // Record stock movement
      await pool.query(
        `INSERT INTO stock_movements (product_id, event_id, movement_type, quantity, stock_before, stock_after, reference)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [event.productId, event.eventId, 'out', quantity, currentStock, newStock,
         `Sale from ${event.source} - ${event.invoiceNo || ''}`]
      );

      // Publish success to stock exchange
      try {
        await channel.publish('stock.exchange', 'success', Buffer.from(JSON.stringify({
          ...event,
          previousStock: currentStock,
          newStock,
          status: 'stock_updated'
        })), { persistent: true });
      } catch (pubErr) {
        console.error('Failed to publish success:', pubErr.message);
      }

      console.log(`✅ Stock updated: ${event.productId} ${currentStock} → ${newStock}`);
      channel.ack(msg);

    } catch (error) {
      console.error('❌ Error processing message:', error.message);
      // Retry: requeue once, then send to DLQ
      channel.nack(msg, false, !msg.fields.redelivered);
    }
  });
}

module.exports = { startConsumer };
