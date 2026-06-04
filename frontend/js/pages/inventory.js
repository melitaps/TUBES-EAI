// ============================================
// Inventory Page - Full CRUD
// ============================================
async function renderInventory() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header"><h1>Inventory Management</h1><p>Manage products and track stock movements</p></div>
    <div class="page-actions">
      <button class="btn btn-primary" onclick="showCreateProductModal()">+ Add Product</button>
      <button class="btn btn-outline" onclick="loadProducts()">Refresh</button>
      <button class="btn btn-outline" onclick="showStockMovements()">📊 Stock Movements</button>
    </div>
    <div class="card"><div class="card-body" id="products-table"><div class="loading"><div class="spinner"></div></div></div></div>
  `;
  loadProducts();
}

async function loadProducts() {
  const el = document.getElementById('products-table');
  const res = await apiCall('/inventory/products');
  const products = res.data || [];

  if (products.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><h3>No products</h3></div>';
    return;
  }

  let html = '<div class="table-container"><table><thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Stock</th><th>Price</th><th>Actions</th></tr></thead><tbody>';
  products.forEach(p => {
    const stockClass = p.stock < 10 ? 'badge-danger' : p.stock < 50 ? 'badge-warning' : 'badge-success';
    html += `<tr>
      <td><code>${p.id}</code></td>
      <td><strong>${p.name}</strong></td>
      <td>${p.category || '-'}</td>
      <td><span class="badge ${stockClass}">${p.stock}</span></td>
      <td>${formatCurrency(p.price)}</td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="showEditProductModal('${p.id}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p.id}')">Delete</button>
      </td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  el.innerHTML = html;
}

function showCreateProductModal() {
  openModal('Add New Product', `
    <form onsubmit="return createProduct(event)">
      <div class="form-row">
        <div class="form-group"><label>Product ID</label><input type="text" id="prod-id" placeholder="e.g. PROD011" required></div>
        <div class="form-group"><label>Category</label><input type="text" id="prod-cat" placeholder="e.g. Accessories"></div>
      </div>
      <div class="form-group"><label>Product Name</label><input type="text" id="prod-name" placeholder="Product name" required></div>
      <div class="form-row">
        <div class="form-group"><label>Stock</label><input type="number" id="prod-stock" min="0" value="0" required></div>
        <div class="form-group"><label>Price</label><input type="number" id="prod-price" min="0" step="1000" required></div>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Add Product</button>
    </form>
  `);
}

async function createProduct(e) {
  e.preventDefault();
  const data = {
    id: document.getElementById('prod-id').value,
    name: document.getElementById('prod-name').value,
    category: document.getElementById('prod-cat').value,
    stock: parseInt(document.getElementById('prod-stock').value),
    price: parseFloat(document.getElementById('prod-price').value)
  };
  const res = await apiCall('/inventory/products', { method: 'POST', body: data });
  if (res.ok) { closeModal(); showToast('Product added', 'success'); loadProducts(); }
  else showToast('Failed: ' + (res.data?.error || ''), 'error');
  return false;
}

async function showEditProductModal(id) {
  const res = await apiCall(`/inventory/products/${id}`);
  if (!res.ok) return;
  const p = res.data;
  openModal('Edit Product', `
    <form onsubmit="return updateProduct(event, '${id}')">
      <div class="form-group"><label>Name</label><input type="text" id="edit-name" value="${p.name}" required></div>
      <div class="form-row">
        <div class="form-group"><label>Stock</label><input type="number" id="edit-stock" value="${p.stock}" required></div>
        <div class="form-group"><label>Price</label><input type="number" id="edit-price" value="${p.price}" step="1000" required></div>
      </div>
      <div class="form-group"><label>Category</label><input type="text" id="edit-cat" value="${p.category || ''}"></div>
      <button type="submit" class="btn btn-primary btn-block">Update Product</button>
    </form>
  `);
}

async function updateProduct(e, id) {
  e.preventDefault();
  const data = {
    name: document.getElementById('edit-name').value,
    stock: parseInt(document.getElementById('edit-stock').value),
    price: parseFloat(document.getElementById('edit-price').value),
    category: document.getElementById('edit-cat').value
  };
  const res = await apiCall(`/inventory/products/${id}`, { method: 'PUT', body: data });
  if (res.ok) { closeModal(); showToast('Product updated', 'success'); loadProducts(); }
  else showToast('Failed', 'error');
  return false;
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  const res = await apiCall(`/inventory/products/${id}`, { method: 'DELETE' });
  if (res.ok) { showToast('Product deleted', 'success'); loadProducts(); }
  else showToast('Failed', 'error');
}

async function showStockMovements() {
  const res = await apiCall('/inventory/stock-movements');
  const movements = res.data || [];
  let html = movements.length === 0 ? '<p style="color:var(--text-muted)">No stock movements yet</p>' :
    '<div class="table-container" style="max-height:400px;overflow:auto"><table><thead><tr><th>Product</th><th>Type</th><th>Qty</th><th>Before</th><th>After</th><th>Reference</th><th>Date</th></tr></thead><tbody>' +
    movements.map(m => `<tr>
      <td>${m.product_name || m.product_id}</td>
      <td><span class="badge ${m.movement_type === 'out' ? 'badge-danger' : m.movement_type === 'failed' ? 'badge-warning' : 'badge-success'}">${m.movement_type}</span></td>
      <td>${m.quantity}</td><td>${m.stock_before ?? '-'}</td><td>${m.stock_after ?? '-'}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${m.reference || '-'}</td>
      <td>${formatDate(m.created_at)}</td>
    </tr>`).join('') + '</tbody></table></div>';
  openModal('Stock Movements', html);
}
