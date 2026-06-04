// ============================================
// E-Commerce Page - Full CRUD
// ============================================
async function renderEcommerce() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header"><h1>E-Commerce</h1><p>Manage online orders</p></div>
    <div class="page-actions">
      <button class="btn btn-primary" onclick="showCreateOrderModal()">+ New Order</button>
      <button class="btn btn-outline" onclick="loadOrders()">Refresh</button>
    </div>
    <div class="card"><div class="card-body" id="orders-table"><div class="loading"><div class="spinner"></div></div></div></div>
  `;
  loadOrders();
}

async function loadOrders() {
  const el = document.getElementById('orders-table');
  const res = await apiCall('/ecommerce/orders');
  const orders = res.data || [];

  if (orders.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🛍️</div><h3>No orders</h3></div>';
    return;
  }

  let html = '<div class="table-container"><table><thead><tr><th>Order No</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody>';
  orders.forEach(o => {
    const badgeClass = o.status === 'completed' ? 'badge-success' : o.status === 'cancelled' ? 'badge-danger' : 'badge-warning';
    html += `<tr>
      <td><strong>${o.order_no}</strong></td>
      <td>${o.customer_name || o.customer_id || '-'}</td>
      <td>${formatCurrency(o.total_amount)}</td>
      <td><span class="badge ${badgeClass}">${o.status}</span></td>
      <td>${formatDate(o.created_at)}</td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="viewOrder(${o.id})">View</button>
        ${o.status !== 'cancelled' ? `<button class="btn btn-sm btn-danger" onclick="cancelOrder(${o.id})">Cancel</button>` : ''}
      </td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  el.innerHTML = html;
}

function showCreateOrderModal() {
  openModal('Create New Order', `
    <form onsubmit="return createOrder(event)">
      <div class="form-row">
        <div class="form-group"><label>Customer ID</label><input type="text" id="ord-customer" placeholder="e.g. CUST001" required></div>
        <div class="form-group"><label>Customer Name</label><input type="text" id="ord-cust-name" placeholder="Name"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Product ID</label><input type="text" id="ord-product" placeholder="e.g. PROD001" required></div>
        <div class="form-group"><label>Product Name</label><input type="text" id="ord-prod-name" placeholder="Product name"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Quantity</label><input type="number" id="ord-qty" min="1" value="1" required></div>
        <div class="form-group"><label>Unit Price</label><input type="number" id="ord-price" min="0" step="1000" required></div>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Create Order & Trigger Integration</button>
    </form>
  `);
}

async function createOrder(e) {
  e.preventDefault();
  const data = {
    customer_id: document.getElementById('ord-customer').value,
    customer_name: document.getElementById('ord-cust-name').value,
    items: [{
      product_id: document.getElementById('ord-product').value,
      product_name: document.getElementById('ord-prod-name').value,
      quantity: parseInt(document.getElementById('ord-qty').value),
      unit_price: parseFloat(document.getElementById('ord-price').value)
    }]
  };
  const res = await apiCall('/ecommerce/orders', { method: 'POST', body: data });
  if (res.ok) { closeModal(); showToast('Order created! Integration events sent.', 'success'); loadOrders(); }
  else showToast('Failed', 'error');
  return false;
}

async function viewOrder(id) {
  const res = await apiCall(`/ecommerce/orders/${id}`);
  if (!res.ok) return;
  const o = res.data;
  const items = o.items || [];
  let itemsHtml = items.map(i => `<tr><td>${i.product_id}</td><td>${i.product_name||'-'}</td><td>${i.quantity}</td><td>${formatCurrency(i.unit_price)}</td><td>${formatCurrency(i.subtotal)}</td></tr>`).join('');
  openModal(`Order ${o.order_no}`, `
    <p><strong>Customer:</strong> ${o.customer_name || o.customer_id}</p>
    <p><strong>Total:</strong> ${formatCurrency(o.total_amount)}</p>
    <p><strong>Status:</strong> <span class="badge ${o.status === 'completed' ? 'badge-success' : 'badge-warning'}">${o.status}</span></p>
    <p><strong>Date:</strong> ${formatDate(o.created_at)}</p>
    <h4 style="margin:16px 0 8px">Items</h4>
    <div class="table-container"><table><thead><tr><th>Product</th><th>Name</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead><tbody>${itemsHtml || '<tr><td colspan="5">No items</td></tr>'}</tbody></table></div>
  `);
}

async function cancelOrder(id) {
  if (!confirm('Cancel this order?')) return;
  const res = await apiCall(`/ecommerce/orders/${id}`, { method: 'DELETE' });
  if (res.ok) { showToast('Order cancelled', 'success'); loadOrders(); }
  else showToast('Failed', 'error');
}
