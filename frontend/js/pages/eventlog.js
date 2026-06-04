// ============================================
// Event Log Page
// ============================================
function renderEventlog() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header"><h1>Global Event Log</h1><p>Real-time audit trail of all system events</p></div>
    <div class="page-actions">
      <button class="btn btn-outline" onclick="loadAllEvents()">Refresh Log</button>
      <span class="badge badge-success" style="margin-left:12px">Recording Live</span>
    </div>
    <div class="card">
      <div class="card-body" id="full-event-log"><div class="loading"><div class="spinner"></div></div></div>
    </div>
  `;
  loadAllEvents();
}

async function loadAllEvents() {
  const el = document.getElementById('full-event-log');
  const res = await apiCall('/integration/events');
  const events = res.data || [];
  
  if (events.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><h3>No events</h3></div>';
    return;
  }
  
  let html = '<div class="table-container"><table><thead><tr><th>Time</th><th>Event ID</th><th>Type</th><th>Message</th><th>Actions</th></tr></thead><tbody>';
  events.forEach(evt => {
    const typeColor = evt.type?.includes('ERROR') ? 'danger' : evt.type?.includes('PUBLISH') ? 'success' : evt.type?.includes('TRANSLAT') ? 'warning' : evt.type?.includes('ROUT') ? 'primary' : 'info';
    html += `<tr>
      <td style="white-space:nowrap">${formatDate(evt.timestamp)}</td>
      <td><code>${evt.id.substring(0,8)}...</code></td>
      <td><span class="badge badge-${typeColor}">${evt.type}</span></td>
      <td>${evt.message}</td>
      <td><button class="btn btn-sm btn-outline" onclick='viewEventData(${JSON.stringify(evt).replace(/'/g, "&apos;")})'>Payload</button></td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  el.innerHTML = html;
}

function viewEventData(evt) {
  openModal('Event Payload', `
    <div style="margin-bottom:12px">
      <span class="badge badge-info">${evt.type}</span>
      <span style="color:var(--text-muted);font-size:12px;margin-left:8px">${formatDate(evt.timestamp)}</span>
    </div>
    <p style="margin-bottom:16px">${evt.message}</p>
    <div class="code-block json">${JSON.stringify(evt.data, null, 2)}</div>
  `);
}
