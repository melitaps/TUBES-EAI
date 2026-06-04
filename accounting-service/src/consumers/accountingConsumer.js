// ============================================
// Accounting RabbitMQ Consumer
// EIP: Message Endpoint, Idempotency
// Creates double-entry journal from SalesEvent
// ============================================
const amqp = require('amqplib');

const QUEUE = 'accounting.queue';

async function startConsumer(pool) {
  let retries = 15;
  let connection;

  while (retries > 0) {
    try {
      const url = process.env.RABBITMQ_URL || 'amqp://eai_admin:eai_secret_2024@rabbitmq:5672';
      connection = await amqp.connect(url);
      console.log('✅ Accounting Consumer connected to RabbitMQ');
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
      console.log(`📒 Processing accounting event: ${event.eventId}`);

      // Idempotency check
      const existing = await pool.query(
        'SELECT id FROM journals WHERE event_id = $1',
        [event.eventId]
      );

      if (existing.rows.length > 0) {
        console.log(`⚠️ Duplicate event ${event.eventId} - skipping`);
        channel.ack(msg);
        return;
      }

      const totalAmount = (event.quantity || 0) * (event.price || 0);
      const journalNo = `JRN-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      // Create journal
      const journalResult = await pool.query(
        `INSERT INTO journals (event_id, journal_no, description, total_amount, source)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [event.eventId, journalNo, 
         `Penjualan ${event.source?.toUpperCase()} - ${event.invoiceNo || event.productId}`,
         totalAmount, event.source || 'unknown']
      );

      const journalId = journalResult.rows[0].id;

      // Create double-entry: Debit Cash, Credit Sales Revenue
      await pool.query(
        `INSERT INTO journal_entries (journal_id, account_code, account_name, debit, credit) VALUES ($1, $2, $3, $4, $5)`,
        [journalId, '1100', 'Kas', totalAmount, 0]
      );

      await pool.query(
        `INSERT INTO journal_entries (journal_id, account_code, account_name, debit, credit) VALUES ($1, $2, $3, $4, $5)`,
        [journalId, '4100', 'Pendapatan Penjualan', 0, totalAmount]
      );

      console.log(`✅ Journal created: ${journalNo} - Rp ${totalAmount}`);
      channel.ack(msg);

    } catch (error) {
      console.error('❌ Error processing message:', error.message);
      channel.nack(msg, false, !msg.fields.redelivered);
    }
  });
}

module.exports = { startConsumer };
