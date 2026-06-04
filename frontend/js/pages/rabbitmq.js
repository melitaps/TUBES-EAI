// ============================================
// RabbitMQ Monitor Page
// ============================================
function renderRabbitmq() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header"><h1>RabbitMQ Monitor</h1><p>Monitor message queues and consumers</p></div>
    <div class="page-actions">
      <button class="btn btn-outline" onclick="loadQueues()">Refresh</button>
      <a href="http://localhost:15672" target="_blank" class="btn btn-outline">🔗 RabbitMQ Management UI</a>
    </div>
    <div class="card">
      <div class="card-header"><h3>Queue Status</h3></div>
      <div class="card-body" id="queue-list"><div class="loading"><div class="spinner"></div></div></div>
    </div>
    <div class="card">
      <div class="card-header"><h3>Queue Architecture</h3></div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px">
          <div class="stat-card stat-info">
            <div class="stat-icon">📤</div>
            <h4 style="margin:8px 0 4px">sales.exchange</h4>
            <p style="color:var(--text-muted);font-size:12px">Fanout Exchange → Broadcasts to all queues</p>
            <p style="color:var(--text-secondary);font-size:11px;margin-top:4px">EIP: Publish-Subscribe</p>
          </div>
          <div class="stat-card stat-success">
            <div class="stat-icon">📥</div>
            <h4 style="margin:8px 0 4px">stock.exchange</h4>
            <p style="color:var(--text-muted);font-size:12px">Direct Exchange → Routes by routing key</p>
            <p style="color:var(--text-secondary);font-size:11px;margin-top:4px">EIP: Content-Based Router</p>
          </div>
          <div class="stat-card stat-danger">
            <div class="stat-icon">☠️</div>
            <h4 style="margin:8px 0 4px">dlx.exchange</h4>
            <p style="color:var(--text-muted);font-size:12px">Dead Letter Exchange → Failed messages</p>
            <p style="color:var(--text-secondary);font-size:11px;margin-top:4px">EIP: Dead Letter Queue</p>
          </div>
        </div>
      </div>
    </div>
  `;
  loadQueues();
}

async function loadQueues() {
  const el = document.getElementById('queue-list');
  const res = await apiCall('/integration/queues');
  const queues = res.data || [];

  const expectedQueues = ['inventory.queue', 'accounting.queue', 'crm.queue', 'stock.success.queue', 'stock.rejection.queue', 'dlq.queue'];
  
  let html = '';
  const allQueues = queues.length > 0 ? queues : expectedQueues.map(q => ({ name: q, messages: 0, consumers: 0, state: 'running' }));

  allQueues.forEach(q => {
    html += `<div class="queue-item">
      <div class="queue-status-dot" style="${q.state !== 'running' ? 'background:var(--warning)' : ''}"></div>
      <div class="queue-name">${q.name}</div>
      <div class="queue-stats">
        <div class="queue-stat">
          <div class="queue-stat-value">${q.messages || 0}</div>
          <div class="queue-stat-label">Messages</div>
        </div>
        <div class="queue-stat">
          <div class="queue-stat-value">${q.consumers || 0}</div>
          <div class="queue-stat-label">Consumers</div>
        </div>
      </div>
      <span class="badge ${q.state === 'running' ? 'badge-success' : 'badge-warning'}">${q.state || 'active'}</span>
    </div>`;
  });

  el.innerHTML = html || '<p style="color:var(--text-muted)">No queues found</p>';
}
