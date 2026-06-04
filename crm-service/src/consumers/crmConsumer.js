// ============================================
// CRM RabbitMQ Consumer
// EIP: Message Endpoint, Idempotency
// ============================================
const amqp = require('amqplib');

const QUEUE = 'crm.queue';

async function startConsumer(pool) {
  let retries = 15;
  let connection;

  while (retries > 0) {
    try {
      const url = process.env.RABBITMQ_URL || 'amqp://eai_admin:eai_secret_2024@rabbitmq:5672';
      connection = await amqp.connect(url);
      console.log('✅ CRM Consumer connected to RabbitMQ');
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
      console.log(`👥 Processing CRM event: ${event.eventId}`);

      // Idempotency check
      const [existing] = await pool.query(
        'SELECT id FROM purchase_history WHERE event_id = ?',
        [event.eventId]
      );

      if (existing.length > 0) {
        console.log(`⚠️ Duplicate event ${event.eventId} - skipping`);
        channel.ack(msg);
        return;
      }

      const customerId = event.customerId;
      if (!customerId) {
        console.log('⚠️ No customer ID in event - skipping');
        channel.ack(msg);
        return;
      }

      // Check if customer exists, create if not
      const [customers] = await pool.query('SELECT id FROM customers WHERE id = ?', [customerId]);
      if (customers.length === 0) {
        await pool.query(
          'INSERT INTO customers (id, name, email, phone) VALUES (?, ?, ?, ?)',
          [customerId, `Customer ${customerId}`, '', '']
        );
        console.log(`👤 Auto-created customer: ${customerId}`);
      }

      // Add purchase history
      const totalAmount = (event.quantity || 0) * (event.price || 0);
      await pool.query(
        `INSERT INTO purchase_history (customer_id, event_id, product_id, product_name, quantity, total_amount, source)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [customerId, event.eventId, event.productId, event.productName || '',
         event.quantity, totalAmount, event.source || 'unknown']
      );

      console.log(`✅ Purchase history added for customer ${customerId}`);
      channel.ack(msg);

    } catch (error) {
      console.error('❌ Error processing message:', error.message);
      channel.nack(msg, false, !msg.fields.redelivered);
    }
  });
}

module.exports = { startConsumer };
