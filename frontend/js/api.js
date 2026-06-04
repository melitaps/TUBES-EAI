// ============================================
// API Client - Fetch wrapper with JWT
// ============================================
const API_BASE = '/api';

async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('eai_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const duration = Date.now() - startTime;
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('eai_token');
      localStorage.removeItem('eai_user');
      window.location.reload();
    }

    return { data, status: response.status, duration, ok: response.ok };
  } catch (error) {
    console.error('API Error:', error);
    return { data: null, status: 0, duration: Date.now() - startTime, ok: false, error: error.message };
  }
}

async function rawApiCall(method, url, headers = {}, body = null) {
  const startTime = Date.now();
  try {
    const config = { method, headers };
    if (body) config.body = body;
    
    const response = await fetch(url, config);
    const duration = Date.now() - startTime;
    
    let data;
    try { data = await response.json(); } 
    catch { data = await response.text().catch(() => 'No response body'); }
    
    return { data, status: response.status, duration, ok: response.ok };
  } catch (error) {
    return { data: error.message, status: 0, duration: Date.now() - startTime, ok: false };
  }
}

// Toast notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Modal helpers
function openModal(title, bodyHtml) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('modal-overlay').style.display = 'none';
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}
