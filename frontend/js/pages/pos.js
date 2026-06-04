// ============================================
// POS Management Page - Full CRUD
// ============================================
async function renderPos() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header"><h1>POS Management</h1><p>Point of Sale - Create and manage transactions</p></div>
    <div class="page-actions">
      <button class="btn btn-primary" onclick="showCreateSaleModal()">+ New Sale</button>
      <button class="btn btn-outline" onclick="loadSales()">Refresh</button>
    </div>
    <div class="card"><div class="card-body" id="sales-table"><div class="loading"><div class="spinner"></div></div></div></div>
  `;
  loadSales();
}

async function loadSales() {
  const el = document.getElementById('sales-table');
  const res = await apiCall('/pos/sales');
  const sales = res.data || [];

  if (sales.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🛒</div><h3>No sales yet</h3><p>Create your first sale</p></div>';
    return;
  }

  let html = '<div class="table-container"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody>';
  sales.forEach(s => {
    html += `<tr>
      <td><strong>${s.invoice_no}</strong></td>
      <td>${s.customer_id || '-'}</td>
      <td>${formatCurrency(s.total_amount)}</td>
      <td><span class="badge ${s.status === 'completed' ? 'badge-success' : 'badge-warning'}">${s.status}</span></td>
      <td>${formatDate(s.created_at)}</td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="viewSale(${s.id})">View</button>
        <button class="btn btn-sm btn-danger" onclick="deleteSale(${s.id})">Delete</button>
      </td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  el.innerHTML = html;
}

function showCreateSaleModal() {
  openModal('Create New Sale', `
    <form onsubmit="return createSale(event)">
      <div class="form-group">
        <label>Customer ID</label>
        <input type="text" id="sale-customer" placeholder="e.g. CUST001" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Product ID</label>
          <input type="text" id="sale-product" placeholder="e.g. PROD001" required>
        </div>
        <div class="form-group">
          <label>Product Name</label>
          <input type="text" id="sale-product-name" placeholder="Product name">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Quantity</label>
          <input type="number" id="sale-qty" min="1" value="1" required>
        </div>
        <div class="form-group">
          <label>Unit Price</label>
          <input type="number" id="sale-price" min="0" step="1000" placeholder="e.g. 250000" required>
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Create Sale & Trigger Integration</button>
    </form>
  `);
}

async function createSale(e) {
  e.preventDefault();
  const data = {
    customer_id: document.getElementById('sale-customer').value,
    items: [{
      product_id: document.getElementById('sale-product').value,
      product_name: document.getElementById('sale-product-name').value,
      quantity: parseInt(document.getElementById('sale-qty').value),
      unit_price: parseFloat(document.getElementById('sale-price').value)
    }]
  };

  const res = await apiCall('/pos/sales', { method: 'POST', body: data });
  if (res.ok) {
    closeModal();
    showToast('Sale created! Integration events sent.', 'success');
    loadSales();
  } else {
    showToast('Failed to create sale: ' + (res.data?.error || 'Unknown error'), 'error');
  }
  return false;
}

async function viewSale(id) {
  const res = await apiCall(`/pos/sales/${id}`);
  if (!res.ok) return showToast('Failed to load sale', 'error');
  const s = res.data;
  const items = s.items || [];
  let itemsHtml = items.map(i => `<tr><td>${i.product_id}</td><td>${i.product_name || '-'}</td><td>${i.quantity}</td><td>${formatCurrency(i.unit_price)}</td><td>${formatCurrency(i.subtotal)}</td></tr>`).join('');
  
  openModal(`Sale ${s.invoice_no}`, `
    <div style="margin-bottom:16px">
      <p><strong>Customer:</strong> ${s.customer_id || '-'}</p>
      <p><strong>Total:</strong> ${formatCurrency(s.total_amount)}</p>
      <p><strong>Status:</strong> <span class="badge badge-success">${s.status}</span></p>
      <p><strong>Date:</strong> ${formatDate(s.created_at)}</p>
    </div>
    <h4 style="margin-bottom:8px">Items</h4>
    <div class="table-container"><table><thead><tr><th>Product</th><th>Name</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead><tbody>${itemsHtml || '<tr><td colspan="5">No items</td></tr>'}</tbody></table></div>
  `);
}

async function deleteSale(id) {
  if (!confirm('Delete this sale?')) return;
  const res = await apiCall(`/pos/sales/${id}`, { method: 'DELETE' });
  if (res.ok) {
    showToast('Sale deleted', 'success');
    loadSales();
  } else {
    showToast('Failed to delete sale', 'error');
  }
}
