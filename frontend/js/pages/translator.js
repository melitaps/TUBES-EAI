// ============================================
// Message Translator Page
// EIP: Message Translator, Canonical Data Model
// ============================================
function renderTranslator() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header"><h1>Message Translator</h1><p>XML to JSON and Canonical Data Model Transformation</p></div>
    <div class="page-actions">
      <button class="btn btn-outline" onclick="loadTranslatorHistory()">Refresh History</button>
    </div>
    
    <div class="card">
      <div class="card-header"><h3>Live Translation Test</h3></div>
      <div class="card-body">
        <div class="translator-grid">
          <div>
            <label style="display:block;margin-bottom:8px;font-weight:600">Raw Input (XML)</label>
            <textarea id="translator-input" class="form-group" style="width:100%;height:250px;background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border);border-radius:var(--radius);padding:12px;font-family:monospace;font-size:12px;">
<Sale>
  <InvoiceNo>INV-TEST-001</InvoiceNo>
  <CustomerId>CUST001</CustomerId>
  <TotalAmount>250000</TotalAmount>
  <Status>completed</Status>
  <Items>
    <Item>
      <ProductId>PROD001</ProductId>
      <ProductName>Laptop ASUS</ProductName>
      <Qty>1</Qty>
      <UnitPrice>250000</UnitPrice>
    </Item>
  </Items>
</Sale></textarea>
            <div style="display:flex;gap:8px;margin-top:12px">
              <button class="btn btn-primary" onclick="testTranslate('xml-to-json')">XML → JSON</button>
              <button class="btn btn-success" onclick="testTranslate('to-canonical')">To Canonical Model</button>
            </div>
          </div>
          
          <div class="translator-arrow">➔</div>
          
          <div>
            <label style="display:block;margin-bottom:8px;font-weight:600">Transformation Output</label>
            <div id="translator-output" class="code-block json" style="height:250px;">Output will appear here</div>
            <div id="translator-meta" style="margin-top:12px;font-size:12px;color:var(--text-muted)"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Transformation History</h3></div>
      <div class="card-body" id="translator-history"><div class="loading"><div class="spinner"></div></div></div>
    </div>
  `;
  loadTranslatorHistory();
}

async function testTranslate(type) {
  const inputEl = document.getElementById('translator-input');
  const outputEl = document.getElementById('translator-output');
  const metaEl = document.getElementById('translator-meta');
  
  const val = inputEl.value;
  if (!val) return showToast('Please enter input', 'warning');
  
  outputEl.textContent = 'Processing...';
  metaEl.textContent = '';
  
  let payload = val;
  if (type === 'to-canonical') {
    payload = { rawXml: val, source: 'pos_test', eventId: 'TEST-' + Date.now() };
  }

  const res = await rawApiCall('POST', `/api/translator/translate/${type}`, { 'Content-Type': type === 'xml-to-json' ? 'application/xml' : 'application/json' }, typeof payload === 'string' ? payload : JSON.stringify(payload));
  
  if (res.ok) {
    outputEl.textContent = JSON.stringify(res.data, null, 2);
    metaEl.innerHTML = `Translated in <strong>${res.duration}ms</strong> | Format: <strong>${type === 'to-canonical' ? 'Canonical SalesEvent' : 'JSON'}</strong>`;
    showToast('Translation successful', 'success');
    loadTranslatorHistory();
  } else {
    outputEl.textContent = typeof res.data === 'object' ? JSON.stringify(res.data, null, 2) : String(res.data);
    metaEl.textContent = 'Translation failed';
    showToast('Translation failed', 'error');
  }
}

async function loadTranslatorHistory() {
  const el = document.getElementById('translator-history');
  const res = await apiCall('/translator/translate/history');
  const history = res.data || [];
  
  if (history.length === 0) {
    el.innerHTML = '<p style="color:var(--text-muted)">No history available</p>';
    return;
  }
  
  let html = '<div class="table-container" style="max-height:400px;overflow:auto"><table><thead><tr><th>Time</th><th>Type</th><th>Input Snippet</th><th>Actions</th></tr></thead><tbody>';
  history.forEach(h => {
    const inputSnip = h.input.length > 50 ? h.input.substring(0, 50) + '...' : h.input;
    html += `<tr>
      <td>${formatDate(h.timestamp)}</td>
      <td><span class="badge badge-info">${h.type}</span></td>
      <td style="font-family:monospace;font-size:11px">${inputSnip}</td>
      <td><button class="btn btn-sm btn-outline" onclick='viewTranslationLog(${JSON.stringify(h).replace(/'/g, "&apos;")})'>Details</button></td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  el.innerHTML = html;
}

function viewTranslationLog(log) {
  openModal('Translation Details', `
    <div style="margin-bottom:16px">
      <p><strong>Time:</strong> ${formatDate(log.timestamp)}</p>
      <p><strong>Type:</strong> <span class="badge badge-info">${log.type}</span></p>
    </div>
    <div class="translator-grid" style="grid-template-columns:1fr 1fr">
      <div><label style="font-weight:600">Input</label><div class="code-block" style="margin-top:8px">${log.input}</div></div>
      <div><label style="font-weight:600">Output</label><div class="code-block json" style="margin-top:8px">${log.output}</div></div>
    </div>
  `);
}
