// ============================================
// Integration Monitor Page - Flow Visualization
// ============================================
let integrationInterval = null;

function renderIntegration() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header"><h1>Integration Monitor</h1><p>Visualize real-time integration event flow</p></div>
    <div class="page-actions">
      <button class="btn btn-primary" onclick="triggerTestEvent()">🧪 Send Test Event</button>
      <button class="btn btn-outline" onclick="refreshIntegrationFlow()">Refresh</button>
    </div>
    <div class="card">
      <div class="card-header"><h3>Integration Flow</h3><span class="badge badge-success" id="flow-status">Live</span></div>
      <div class="card-body">
        <div class="flow-container" id="flow-visual">
          <div class="flow-node" id="fn-source"><div class="node-title">📱 POS / E-Commerce</div><div class="node-status">Source Services</div></div>
          <div class="flow-arrow" id="fa-1">↓</div>
          <div class="flow-node" id="fn-gateway"><div class="node-title">🌐 API Gateway</div><div class="node-status">Request Router</div></div>
          <div class="flow-arrow" id="fa-2">↓</div>
          <div class="flow-node" id="fn-integration"><div class="node-title">🔗 Integration Layer</div><div class="node-status">Orchestrator</div></div>
          <div class="flow-arrow" id="fa-3">↓</div>
          <div class="flow-node" id="fn-translator"><div class="node-title">🔄 Message Translator</div><div class="node-status">XML → JSON → Canonical</div></div>
          <div class="flow-arrow" id="fa-4">↓</div>
          <div class="flow-node" id="fn-router"><div class="node-title">🔀 Message Router</div><div class="node-status">Content-Based Routing</div></div>
          <div class="flow-arrow" id="fa-5">↓</div>
          <div class="flow-node" id="fn-rabbitmq"><div class="node-title">🐰 RabbitMQ</div><div class="node-status">Publish-Subscribe</div></div>
          <div class="flow-arrow" id="fa-6">↓</div>
          <div class="flow-branches">
            <div class="flow-node" id="fn-inventory"><div class="node-title">📦 Inventory</div><div class="node-status" id="inv-status">Waiting...</div></div>
            <div class="flow-node" id="fn-accounting"><div class="node-title">📒 Accounting</div><div class="node-status" id="acc-status">Waiting...</div></div>
            <div class="flow-node" id="fn-crm"><div class="node-title">👥 CRM</div><div class="node-status" id="crm-status">Waiting...</div></div>
          </div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3>Event Processing Log</h3></div>
      <div class="card-body" id="integration-log"><div class="empty-state"><div class="empty-icon">📋</div><h3>No events processed yet</h3></div></div>
    </div>
  `;
  refreshIntegrationFlow();
}

async function refreshIntegrationFlow() {
  try {
    const res = await apiCall('/integration/events');
    const events = res.data || [];
    
    const el = document.getElementById('integration-log');
    if (events.length === 0) return;

    let html = '<div class="event-log-list" style="max-height:300px">';
    events.slice(0, 20).forEach(evt => {
      const dotClass = evt.type?.includes('ERROR') ? 'error' : evt.type?.includes('PUBLISH') ? 'published' : evt.type?.includes('TRANSLAT') ? 'translated' : evt.type?.includes('ROUT') ? 'routed' : 'received';
      html += `<div class="event-item">
        <div class="event-dot ${dotClass}"></div>
        <div class="event-content">
          <div class="event-type" style="color:var(--${dotClass === 'error' ? 'danger' : dotClass === 'published' ? 'success' : dotClass === 'translated' ? 'warning' : 'info'})">${evt.type}</div>
          <div class="event-message">${evt.message}</div>
        </div>
        <div class="event-time">${formatDate(evt.timestamp)}</div>
      </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
  } catch (e) {
    console.error(e);
  }
}

async function triggerTestEvent() {
  showToast('Go to POS or E-Commerce page to create a real transaction!', 'info');
}
