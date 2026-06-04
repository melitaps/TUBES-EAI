// ============================================
// Dashboard Page
// ============================================
async function renderDashboard() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <h1>Dashboard</h1>
      <p>Enterprise Integration Platform Overview</p>
    </div>
    <div class="stats-grid" id="dashboard-stats">
      <div class="stat-card stat-info"><div class="stat-icon">🛒</div><div class="stat-value" id="ds-sales">-</div><div class="stat-label">Total Sales</div></div>
      <div class="stat-card stat-success"><div class="stat-icon">🛍️</div><div class="stat-value" id="ds-orders">-</div><div class="stat-label">Total Orders</div></div>
      <div class="stat-card stat-warning"><div class="stat-icon">👥</div><div class="stat-value" id="ds-customers">-</div><div class="stat-label">Customers</div></div>
      <div class="stat-card"><div class="stat-icon">📦</div><div class="stat-value" id="ds-products">-</div><div class="stat-label">Products</div></div>
      <div class="stat-card stat-info"><div class="stat-icon">📨</div><div class="stat-value" id="ds-events">-</div><div class="stat-label">Events Processed</div></div>
      <div class="stat-card stat-danger"><div class="stat-icon">⚠️</div><div class="stat-value" id="ds-failed">-</div><div class="stat-label">Failed Messages</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
      <div class="card">
        <div class="card-header"><h3>Service Health</h3><button class="btn btn-sm btn-outline" onclick="refreshHealth()">Refresh</button></div>
        <div class="card-body" id="health-list"><div class="loading"><div class="spinner"></div></div></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Recent Events</h3></div>
        <div class="card-body" id="recent-events"><div class="loading"><div class="spinner"></div></div></div>
      </div>
    </div>
  `;

  // Load stats
  loadDashboardStats();
  refreshHealth();
  loadRecentEvents();
}

async function loadDashboardStats() {
  try {
    const [pos, inv, crm, eco, intg] = await Promise.all([
      apiCall('/pos/stats'),
      apiCall('/inventory/stats'),
      apiCall('/crm/stats'),
      apiCall('/ecommerce/stats'),
      apiCall('/integration/events/stats')
    ]);

    document.getElementById('ds-sales').textContent = pos.data?.totalSales || 0;
    document.getElementById('ds-orders').textContent = eco.data?.totalOrders || 0;
    document.getElementById('ds-customers').textContent = crm.data?.totalCustomers || 0;
    document.getElementById('ds-products').textContent = inv.data?.totalProducts || 0;
    document.getElementById('ds-events').textContent = intg.data?.totalEvents || 0;
    document.getElementById('ds-failed').textContent = intg.data?.failed || 0;
  } catch (e) {
    console.error('Stats error:', e);
  }
}

async function refreshHealth() {
  const el = document.getElementById('health-list');
  try {
    const res = await fetch('/api/gateway/health', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('eai_token')}` }
    });
    const data = await res.json();
    
    let html = '';
    Object.entries(data.services || {}).forEach(([name, status]) => {
      const badgeClass = status === 'healthy' ? 'badge-success' : status === 'unhealthy' ? 'badge-warning' : 'badge-danger';
      html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);">
        <span style="font-weight:500;text-transform:capitalize;">${name}</span>
        <span class="badge ${badgeClass}">${status}</span>
      </div>`;
    });
    el.innerHTML = html || '<p style="color:var(--text-muted)">No services found</p>';
  } catch {
    el.innerHTML = '<p style="color:var(--text-muted)">Could not fetch health status</p>';
  }
}

async function loadRecentEvents() {
  const el = document.getElementById('recent-events');
  try {
    const res = await apiCall('/integration/events');
    const events = (res.data || []).slice(0, 10);
    
    if (events.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><h3>No events yet</h3><p>Create a sale or order to see events</p></div>';
      return;
    }
    
    let html = '<div class="event-log-list">';
    events.forEach(evt => {
      const dotClass = evt.type?.includes('ERROR') ? 'error' : evt.type?.includes('PUBLISH') ? 'published' : evt.type?.includes('TRANSLAT') ? 'translated' : 'received';
      html += `<div class="event-item">
        <div class="event-dot ${dotClass}"></div>
        <div class="event-content">
          <div class="event-type" style="color:var(--text-secondary)">${evt.type || 'EVENT'}</div>
          <div class="event-message">${evt.message || ''}</div>
        </div>
        <div class="event-time">${formatDate(evt.timestamp)}</div>
      </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
  } catch {
    el.innerHTML = '<p style="color:var(--text-muted)">Could not load events</p>';
  }
}
