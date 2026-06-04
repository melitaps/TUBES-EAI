// ============================================
// API Tester Page - Postman-like
// ============================================
function renderApitester() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header"><h1>API Tester</h1><p>Test API endpoints like Postman</p></div>
    <div class="api-tester">
      <div class="api-tester-request">
        <div class="card">
          <div class="card-header"><h3>Request</h3></div>
          <div class="card-body">
            <div class="method-url-row">
              <select class="method-select" id="api-method">
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
              <input type="text" class="url-input form-group" id="api-url" placeholder="http://localhost:3000/api/pos/sales" style="margin:0;flex:1;padding:10px 14px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);color:var(--text-primary);font-family:var(--font);">
            </div>
            <div class="form-group">
              <label>Headers (JSON)</label>
              <textarea id="api-headers" rows="3">{"Content-Type": "application/json", "Authorization": "Bearer ${localStorage.getItem('eai_token') || 'YOUR_TOKEN'}"}</textarea>
            </div>
            <div class="form-group">
              <label>Body (JSON)</label>
              <textarea id="api-body" rows="6">{}</textarea>
            </div>
            <button class="btn btn-primary btn-block" onclick="sendApiRequest()">🚀 Send Request</button>
            <div style="margin-top:16px">
              <p style="color:var(--text-muted);font-size:12px;margin-bottom:8px">Quick URLs:</p>
              <div style="display:flex;flex-wrap:wrap;gap:6px">
                <button class="btn btn-sm btn-outline" onclick="setApiUrl('GET', '/api/pos/sales')">POS Sales</button>
                <button class="btn btn-sm btn-outline" onclick="setApiUrl('GET', '/api/inventory/products')">Products</button>
                <button class="btn btn-sm btn-outline" onclick="setApiUrl('GET', '/api/crm/customers')">Customers</button>
                <button class="btn btn-sm btn-outline" onclick="setApiUrl('GET', '/api/ecommerce/orders')">Orders</button>
                <button class="btn btn-sm btn-outline" onclick="setApiUrl('GET', '/api/accounting/journals')">Journals</button>
                <button class="btn btn-sm btn-outline" onclick="setApiUrl('GET', '/api/integration/events')">Events</button>
                <button class="btn btn-sm btn-outline" onclick="setApiUrl('GET', '/api/gateway/health')">Health</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="api-tester-response">
        <div class="card">
          <div class="card-header"><h3>Response</h3></div>
          <div class="card-body">
            <div class="response-meta" id="api-response-meta" style="display:none">
              <span class="response-status" id="api-response-status">200</span>
              <span style="color:var(--text-muted)" id="api-response-time">0ms</span>
            </div>
            <div class="response-body" id="api-response-body">Send a request to see the response</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function setApiUrl(method, path) {
  document.getElementById('api-method').value = method;
  document.getElementById('api-url').value = path;
}

async function sendApiRequest() {
  const method = document.getElementById('api-method').value;
  let url = document.getElementById('api-url').value;
  const headersStr = document.getElementById('api-headers').value;
  const bodyStr = document.getElementById('api-body').value;

  if (!url) return showToast('Enter a URL', 'warning');

  // Auto-prepend base if relative path
  if (url.startsWith('/')) {
    url = window.location.origin + url;
  }

  let headers = {};
  try { headers = JSON.parse(headersStr); } catch { headers = {}; }

  const body = method !== 'GET' && bodyStr.trim() ? bodyStr : null;
  const result = await rawApiCall(method, url, headers, body);

  const meta = document.getElementById('api-response-meta');
  const statusEl = document.getElementById('api-response-status');
  const timeEl = document.getElementById('api-response-time');
  const bodyEl = document.getElementById('api-response-body');

  meta.style.display = 'flex';
  statusEl.textContent = result.status || 'ERR';
  statusEl.className = `response-status ${result.ok ? 'success' : 'error'}`;
  timeEl.textContent = `${result.duration}ms`;
  
  try {
    bodyEl.textContent = typeof result.data === 'object' ? JSON.stringify(result.data, null, 2) : result.data;
  } catch {
    bodyEl.textContent = String(result.data);
  }
}
