// ============================================
// Authentication Module
// ============================================

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const btn = document.getElementById('login-btn');
  const errorEl = document.getElementById('login-error');
  
  btn.disabled = true;
  btn.innerHTML = '<span>Signing in...</span>';
  errorEl.textContent = '';

  try {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('eai_token', data.token);
      localStorage.setItem('eai_user', JSON.stringify(data.user));
      showMainApp(data.user);
      showToast(`Welcome back, ${data.user.name}!`, 'success');
    } else {
      errorEl.textContent = data.error || 'Login failed';
    }
  } catch (err) {
    errorEl.textContent = 'Connection failed. Please try again.';
  }

  btn.disabled = false;
  btn.innerHTML = '<span>Sign In</span>';
  return false;
}

function handleLogout() {
  const token = localStorage.getItem('eai_token');
  if (token) {
    fetch('/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    }).catch(() => {});
  }
  localStorage.removeItem('eai_token');
  localStorage.removeItem('eai_user');
  showLoginPage();
  showToast('Logged out successfully', 'info');
}

function showMainApp(user) {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('main-app').style.display = 'flex';
  
  document.getElementById('user-name').textContent = user.name;
  document.getElementById('user-role').textContent = user.role;
  document.getElementById('user-avatar').textContent = user.name.charAt(0).toUpperCase();
  
  navigateTo('dashboard');
}

function showLoginPage() {
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('main-app').style.display = 'none';
}

function checkAuth() {
  const token = localStorage.getItem('eai_token');
  const user = localStorage.getItem('eai_user');
  if (token && user) {
    showMainApp(JSON.parse(user));
  }
}
