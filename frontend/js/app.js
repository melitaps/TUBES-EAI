// ============================================
// Main Application Router & Initializer
// ============================================

const pages = {
  dashboard: renderDashboard,
  pos: renderPos,
  inventory: renderInventory,
  customers: renderCustomers,
  accounting: renderAccounting,
  ecommerce: renderEcommerce,
  apitester: renderApitester,
  integration: renderIntegration,
  rabbitmq: renderRabbitmq,
  translator: renderTranslator,
  eventlog: renderEventlog
};

function navigateTo(pageName) {
  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.dataset.page === pageName) item.classList.add('active');
    else item.classList.remove('active');
  });

  // Clear intervals from specific pages
  if (window.integrationInterval) {
    clearInterval(window.integrationInterval);
    window.integrationInterval = null;
  }

  // Render page content
  if (pages[pageName]) {
    pages[pageName]();
  } else {
    document.getElementById('page-content').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🚧</div>
        <h3>Page Not Found</h3>
        <p>The page "${pageName}" is under construction or does not exist.</p>
      </div>
    `;
  }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  
  // Expose some global functions for inline onclick handlers
  window.handleLogin = handleLogin;
  window.handleLogout = handleLogout;
  window.navigateTo = navigateTo;
  window.closeModal = closeModal;
});
