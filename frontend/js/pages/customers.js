// ============================================
// CRM Customers Page - Full CRUD
// ============================================
async function renderCustomers() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header"><h1>CRM - Customer Management</h1><p>Manage customers and view purchase history</p></div>
    <div class="page-actions">
      <button class="btn btn-primary" onclick="showCreateCustomerModal()">+ Add Customer</button>
      <button class="btn btn-outline" onclick="loadCustomers()">Refresh</button>
    </div>
    <div class="card"><div class="card-body" id="customers-table"><div class="loading"><div class="spinner"></div></div></div></div>
  `;
  loadCustomers();
}

async function loadCustomers() {
  const el = document.getElementById('customers-table');
  const res = await apiCall('/crm/customers');
  const customers = res.data || [];

  if (customers.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><h3>No customers</h3></div>';
    return;
  }

  let html = '<div class="table-container"><table><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Actions</th></tr></thead><tbody>';
  customers.forEach(c => {
    html += `<tr>
      <td><code>${c.id}</code></td>
      <td><strong>${c.name}</strong></td>
      <td>${c.email || '-'}</td>
      <td>${c.phone || '-'}</td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="showEditCustomerModal('${c.id}')">Edit</button>
        <button class="btn btn-sm btn-outline" onclick="showCustomerHistory('${c.id}')">History</button>
        <button class="btn btn-sm btn-danger" onclick="deleteCustomer('${c.id}')">Delete</button>
      </td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  el.innerHTML = html;
}

function showCreateCustomerModal() {
  openModal('Add Customer', `
    <form onsubmit="return createCustomer(event)">
      <div class="form-group"><label>Customer ID</label><input type="text" id="cust-id" placeholder="e.g. CUST006" required></div>
      <div class="form-group"><label>Name</label><input type="text" id="cust-name" required></div>
      <div class="form-row">
        <div class="form-group"><label>Email</label><input type="email" id="cust-email"></div>
        <div class="form-group"><label>Phone</label><input type="text" id="cust-phone"></div>
      </div>
      <div class="form-group"><label>Address</label><textarea id="cust-address" rows="2"></textarea></div>
      <button type="submit" class="btn btn-primary btn-block">Add Customer</button>
    </form>
  `);
}

async function createCustomer(e) {
  e.preventDefault();
  const data = {
    id: document.getElementById('cust-id').value,
    name: document.getElementById('cust-name').value,
    email: document.getElementById('cust-email').value,
    phone: document.getElementById('cust-phone').value,
    address: document.getElementById('cust-address').value
  };
  const res = await apiCall('/crm/customers', { method: 'POST', body: data });
  if (res.ok) { closeModal(); showToast('Customer added', 'success'); loadCustomers(); }
  else showToast('Failed', 'error');
  return false;
}

async function showEditCustomerModal(id) {
  const res = await apiCall(`/crm/customers/${id}`);
  if (!res.ok) return;
  const c = res.data;
  openModal('Edit Customer', `
    <form onsubmit="return updateCustomer(event, '${id}')">
      <div class="form-group"><label>Name</label><input type="text" id="ecust-name" value="${c.name}" required></div>
      <div class="form-row">
        <div class="form-group"><label>Email</label><input type="email" id="ecust-email" value="${c.email || ''}"></div>
        <div class="form-group"><label>Phone</label><input type="text" id="ecust-phone" value="${c.phone || ''}"></div>
      </div>
      <div class="form-group"><label>Address</label><textarea id="ecust-address" rows="2">${c.address || ''}</textarea></div>
      <button type="submit" class="btn btn-primary btn-block">Update Customer</button>
    </form>
  `);
}

async function updateCustomer(e, id) {
  e.preventDefault();
  const data = {
    name: document.getElementById('ecust-name').value,
    email: document.getElementById('ecust-email').value,
    phone: document.getElementById('ecust-phone').value,
    address: document.getElementById('ecust-address').value
  };
  const res = await apiCall(`/crm/customers/${id}`, { method: 'PUT', body: data });
  if (res.ok) { closeModal(); showToast('Customer updated', 'success'); loadCustomers(); }
  else showToast('Failed', 'error');
  return false;
}

async function deleteCustomer(id) {
  if (!confirm('Delete this customer?')) return;
  const res = await apiCall(`/crm/customers/${id}`, { method: 'DELETE' });
  if (res.ok) { showToast('Customer deleted', 'success'); loadCustomers(); }
  else showToast('Failed', 'error');
}

async function showCustomerHistory(id) {
  const res = await apiCall(`/crm/customers/${id}/history`);
  const history = res.data || [];
  let html = history.length === 0 ? '<p style="color:var(--text-muted)">No purchase history</p>' :
    '<div class="table-container"><table><thead><tr><th>Product</th><th>Qty</th><th>Amount</th><th>Source</th><th>Date</th></tr></thead><tbody>' +
    history.map(h => `<tr><td>${h.product_name || h.product_id}</td><td>${h.quantity}</td><td>${formatCurrency(h.total_amount)}</td><td><span class="badge badge-info">${h.source}</span></td><td>${formatDate(h.created_at)}</td></tr>`).join('') +
    '</tbody></table></div>';
  openModal(`Purchase History - ${id}`, html);
}
