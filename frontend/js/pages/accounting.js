// ============================================
// Accounting Page - View Journals
// ============================================
async function renderAccounting() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header"><h1>Accounting</h1><p>View journal entries and financial records</p></div>
    <div class="page-actions">
      <button class="btn btn-outline" onclick="loadJournals()">Refresh</button>
      <select id="journal-source-filter" onchange="loadJournals()" style="padding:8px 12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);color:var(--text-primary);font-family:var(--font);">
        <option value="">All Sources</option>
        <option value="pos">POS</option>
        <option value="ecommerce">E-Commerce</option>
      </select>
    </div>
    <div class="card"><div class="card-body" id="journals-table"><div class="loading"><div class="spinner"></div></div></div></div>
  `;
  loadJournals();
}

async function loadJournals() {
  const el = document.getElementById('journals-table');
  const source = document.getElementById('journal-source-filter')?.value || '';
  const endpoint = source ? `/accounting/journals?source=${source}` : '/accounting/journals';
  const res = await apiCall(endpoint);
  const journals = res.data || [];

  if (journals.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📒</div><h3>No journals</h3><p>Journals are automatically created when sales occur</p></div>';
    return;
  }

  let html = '<div class="table-container"><table><thead><tr><th>Journal No</th><th>Description</th><th>Amount</th><th>Source</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody>';
  journals.forEach(j => {
    html += `<tr>
      <td><strong>${j.journal_no}</strong></td>
      <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis">${j.description || '-'}</td>
      <td>${formatCurrency(j.total_amount)}</td>
      <td><span class="badge badge-info">${j.source || '-'}</span></td>
      <td><span class="badge badge-success">${j.status || 'posted'}</span></td>
      <td>${formatDate(j.created_at)}</td>
      <td><button class="btn btn-sm btn-outline" onclick="viewJournal(${j.id})">Details</button></td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  el.innerHTML = html;
}

async function viewJournal(id) {
  const res = await apiCall(`/accounting/journals/${id}`);
  if (!res.ok) return showToast('Failed to load journal', 'error');
  const j = res.data;
  const entries = j.entries || [];

  let html = `
    <div style="margin-bottom:16px">
      <p><strong>Journal No:</strong> ${j.journal_no}</p>
      <p><strong>Description:</strong> ${j.description}</p>
      <p><strong>Total:</strong> ${formatCurrency(j.total_amount)}</p>
      <p><strong>Source:</strong> ${j.source}</p>
    </div>
    <h4 style="margin-bottom:8px">Journal Entries (Double-Entry)</h4>
    <div class="table-container"><table><thead><tr><th>Account Code</th><th>Account Name</th><th>Debit</th><th>Credit</th></tr></thead><tbody>`;
  entries.forEach(e => {
    html += `<tr><td>${e.account_code}</td><td>${e.account_name}</td><td>${e.debit > 0 ? formatCurrency(e.debit) : '-'}</td><td>${e.credit > 0 ? formatCurrency(e.credit) : '-'}</td></tr>`;
  });
  html += '</tbody></table></div>';
  openModal(`Journal ${j.journal_no}`, html);
}
