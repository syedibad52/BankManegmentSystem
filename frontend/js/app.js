/* =============================================
   NexaBank — Main Application JavaScript
   SPA Router + API Client + UI Controllers
   ============================================= */

'use strict';

// ---- Global State ----
let currentUser = null;
let userAccounts = [];
let allCustomers = [];
let selectedRole = 'customer'; // tracks which portal tab is active

// ---- API Helper ----
async function api(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch('/api' + path, opts);
  return res.json();
}

// ---- Initialization ----
document.addEventListener('DOMContentLoaded', async () => {
  setCurrentDate();
  // Check if already logged in
  try {
    const me = await api('GET', '/auth/me');
    if (me.success) {
      currentUser = me.user;
      startApp();
    } else {
      showPage('login-page');
    }
  } catch {
    showPage('login-page');
  }
});

function setCurrentDate() {
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const d = new Date().toLocaleDateString('en-IN', opts);
  document.querySelectorAll('#current-date, #admin-current-date').forEach(el => { if (el) el.textContent = d; });
}

// ---- Page Navigation ----
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
}

// ---- Role Tab Switch ----
function switchRole(role) {
  selectedRole = role;
  document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + role).classList.add('active');
  // Clear form and update placeholder hint
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').classList.add('hidden');
  const hint = role === 'admin' ? 'admin@bankms.com' : 'Enter your email';
  document.getElementById('login-email').placeholder = hint;
}

function fillDemo(email, pass, role) {
  // Switch to correct tab for the demo credential
  if (role) switchRole(role);
  document.getElementById('login-email').value = email;
  document.getElementById('login-password').value = pass;
  showToast('Demo credentials filled — click Sign In!', 'info');
}

function togglePassword(id) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}

// ---- LOGIN ----
async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;margin:0"></div> Signing in...';
  errEl.classList.add('hidden');

  try {
    // Send selectedRole so server can enforce portal access control
    const res = await api('POST', '/auth/login', { email, password, expectedRole: selectedRole });
    if (res.success) {
      currentUser = res.user;
      showToast('Welcome back, ' + res.user.name.split(' ')[0] + '! 👋', 'success');
      startApp();
    } else {
      errEl.textContent = res.message;
      errEl.classList.remove('hidden');
    }
  } catch {
    errEl.textContent = 'Connection error. Please try again.';
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Sign In</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>';
  }
}

// ---- REGISTER ----
function showRegister() { showPage('register-page'); }
function showLogin()    { showPage('login-page'); }

async function handleRegister(e) {
  e.preventDefault();
  const errEl = document.getElementById('register-error');
  const sucEl = document.getElementById('register-success');
  const name     = document.getElementById('reg-name').value;
  const email    = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;

  errEl.classList.add('hidden');
  sucEl.classList.add('hidden');

  const res = await api('POST', '/auth/register', { full_name: name, email, password });
  if (res.success) {
    sucEl.textContent = res.message;
    sucEl.classList.remove('hidden');
    document.getElementById('register-form').reset();
    setTimeout(() => showLogin(), 2000);
  } else {
    errEl.textContent = res.message;
    errEl.classList.remove('hidden');
  }
}

// ---- LOGOUT ----
async function handleLogout() {
  await api('POST', '/auth/logout');
  currentUser = null;
  userAccounts = [];
  showPage('login-page');
  showToast('Logged out successfully', 'info');
}

// ---- START APP ----
function startApp() {
  showPage('app-page');
  setupSidebar();
  setupUserInfo();

  const greeting = getGreeting();
  document.getElementById('greeting-text').textContent = greeting;
  document.getElementById('user-welcome').textContent = 'Welcome, ' + currentUser.name.split(' ')[0] + '!';
  setCurrentDate();

  if (currentUser.role === 'admin') {
    navigate('admin-dashboard');
  } else {
    navigate('dashboard');
  }
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning! ☀️';
  if (h < 17) return 'Good Afternoon! 🌤️';
  return 'Good Evening! 🌙';
}

// ---- SIDEBAR SETUP ----
const customerNavItems = [
  { id: 'dashboard',     label: 'Dashboard',     icon: dashboardIcon() },
  { id: 'accounts',      label: 'My Accounts',   icon: accountIcon() },
  { id: 'deposit',       label: 'Deposit',        icon: depositIcon() },
  { id: 'withdraw',      label: 'Withdraw',       icon: withdrawIcon() },
  { id: 'transactions',  label: 'Transactions',   icon: txIcon() },
];

const adminNavItems = [
  { id: 'admin-dashboard',     label: 'Dashboard',      icon: dashboardIcon() },
  { id: 'admin-customers',     label: 'Customers',      icon: usersIcon() },
  { id: 'admin-transactions',  label: 'All Transactions', icon: txIcon() },
];

function setupSidebar() {
  const nav = document.getElementById('sidebar-nav');
  const items = currentUser.role === 'admin' ? adminNavItems : customerNavItems;
  nav.innerHTML = items.map(item => `
    <div class="nav-item" id="nav-${item.id}" onclick="navigate('${item.id}')">
      <span class="nav-icon">${item.icon}</span>
      <span>${item.label}</span>
    </div>
  `).join('');
}

function setupUserInfo() {
  const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('sidebar-avatar').textContent = initials;
  document.getElementById('sidebar-name').textContent = currentUser.name;
  document.getElementById('sidebar-role').textContent = currentUser.role === 'admin' ? '⚡ Administrator' : '👤 Customer';
  document.getElementById('topbar-avatar').textContent = initials;
}

// ---- ROUTER ----
function navigate(section) {
  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.getElementById('nav-' + section);
  if (navEl) navEl.classList.add('active');

  // Update topbar title
  const titles = {
    'dashboard': 'Dashboard', 'accounts': 'My Accounts',
    'deposit': 'Deposit', 'withdraw': 'Withdraw', 'transactions': 'Transactions',
    'admin-dashboard': 'Admin Dashboard', 'admin-customers': 'Customer Management',
    'admin-transactions': 'All Transactions'
  };
  document.getElementById('topbar-title').textContent = titles[section] || section;

  // Show panel
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + section).classList.add('active');

  // Load data for panel
  const loaders = {
    'dashboard': loadDashboard,
    'accounts': loadAccounts,
    'deposit': loadDepositPanel,
    'withdraw': loadWithdrawPanel,
    'transactions': loadTransactions,
    'admin-dashboard': loadAdminDashboard,
    'admin-customers': loadCustomers,
    'admin-transactions': loadAdminTransactions,
  };
  if (loaders[section]) loaders[section]();

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ============================================
// CUSTOMER DASHBOARD
// ============================================
async function loadDashboard() {
  try {
    const [accsRes, txRes] = await Promise.all([
      api('GET', '/accounts'),
      api('GET', '/transactions?limit=5')
    ]);

    if (accsRes.success) {
      userAccounts = accsRes.accounts;
      const totalBalance = userAccounts.reduce((s, a) => s + a.balance, 0);

      document.getElementById('stats-grid').innerHTML = `
        <div class="stat-card purple">
          <div class="stat-icon purple">${walletIcon()}</div>
          <div class="stat-label">Total Balance</div>
          <div class="stat-value">${formatCurrency(totalBalance)}</div>
          <div class="stat-sub">Across ${userAccounts.length} account(s)</div>
        </div>
        <div class="stat-card blue">
          <div class="stat-icon blue">${accountIcon()}</div>
          <div class="stat-label">Active Accounts</div>
          <div class="stat-value">${userAccounts.filter(a => a.status === 'active').length}</div>
          <div class="stat-sub">${userAccounts.length} total accounts</div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon green">${depositIcon()}</div>
          <div class="stat-label">Last Transaction</div>
          <div class="stat-value">${txRes.transactions?.length ? formatCurrency(txRes.transactions[0].amount) : '—'}</div>
          <div class="stat-sub">${txRes.transactions?.length ? txRes.transactions[0].type.toUpperCase() : 'No transactions yet'}</div>
        </div>
        <div class="stat-card amber">
          <div class="stat-icon amber">${txIcon()}</div>
          <div class="stat-label">Total Transactions</div>
          <div class="stat-value">${txRes.pagination?.total || 0}</div>
          <div class="stat-sub">All time</div>
        </div>
      `;

      // Quick Actions
      document.getElementById('quick-actions').innerHTML = `
        <div class="quick-action-btn" onclick="navigate('deposit')">
          <div class="qa-icon" style="background:rgba(34,197,94,0.15);color:#4ade80">${depositIcon()}</div>
          <span class="qa-label">Deposit</span>
        </div>
        <div class="quick-action-btn" onclick="navigate('withdraw')">
          <div class="qa-icon" style="background:rgba(239,68,68,0.15);color:#f87171">${withdrawIcon()}</div>
          <span class="qa-label">Withdraw</span>
        </div>
        <div class="quick-action-btn" onclick="navigate('accounts')">
          <div class="qa-icon" style="background:rgba(37,99,235,0.15);color:#60a5fa">${accountIcon()}</div>
          <span class="qa-label">Accounts</span>
        </div>
        <div class="quick-action-btn" onclick="navigate('transactions')">
          <div class="qa-icon" style="background:rgba(245,158,11,0.15);color:#fbbf24">${txIcon()}</div>
          <span class="qa-label">History</span>
        </div>
      `;
    }

    // Recent Transactions
    if (txRes.success && txRes.transactions.length > 0) {
      document.getElementById('recent-transactions-list').innerHTML = renderTxRows(txRes.transactions, false);
    } else {
      document.getElementById('recent-transactions-list').innerHTML = `
        <div class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          <p>No transactions yet</p>
        </div>`;
    }
  } catch (err) {
    console.error(err);
  }
}

// ============================================
// ACCOUNTS PANEL
// ============================================
async function loadAccounts() {
  const container = document.getElementById('accounts-list');
  container.innerHTML = '<div class="loader"><div class="spinner"></div>Loading accounts...</div>';
  try {
    const res = await api('GET', '/accounts');
    if (res.success && res.accounts.length > 0) {
      userAccounts = res.accounts;
      container.innerHTML = res.accounts.map(a => `
        <div class="account-card">
          <div class="account-number">${a.account_number}</div>
          <div class="account-balance">${formatCurrency(a.balance)}</div>
          <div class="account-balance-label">Available Balance</div>
          <div class="account-meta">
            <span class="account-type-badge">${a.account_type}</span>
            <span class="account-status status-${a.status}">${a.status}</span>
          </div>
          <div style="margin-top:20px;display:flex;gap:10px;">
            <button class="btn-primary btn-sm" onclick="navigate('deposit');setAccountInForm('deposit-account','${a.id}')">Deposit</button>
            <button class="btn-outline btn-sm" onclick="navigate('withdraw');setAccountInForm('withdraw-account','${a.id}')">Withdraw</button>
          </div>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<div class="empty-state"><p>No accounts found</p></div>';
    }
  } catch {
    container.innerHTML = '<div class="empty-state"><p>Failed to load accounts</p></div>';
  }
}

function setAccountInForm(selectId, accountId) {
  setTimeout(() => {
    const sel = document.getElementById(selectId);
    if (sel) { sel.value = accountId; sel.dispatchEvent(new Event('change')); }
  }, 100);
}

// ============================================
// DEPOSIT / WITHDRAW PANELS
// ============================================
async function loadDepositPanel() {
  await loadAccountsIntoSelect('deposit-account');
  updateDepositBalance();
}

async function loadWithdrawPanel() {
  await loadAccountsIntoSelect('withdraw-account');
  updateWithdrawBalance();
}

async function loadAccountsIntoSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!userAccounts.length) {
    const res = await api('GET', '/accounts');
    if (res.success) userAccounts = res.accounts;
  }
  const active = userAccounts.filter(a => a.status === 'active');
  sel.innerHTML = active.map(a =>
    `<option value="${a.id}">${a.account_number} (${a.account_type}) — ${formatCurrency(a.balance)}</option>`
  ).join('');
}

function updateDepositBalance() {
  const sel = document.getElementById('deposit-account');
  const acc = userAccounts.find(a => a.id == sel.value);
  const el = document.getElementById('deposit-balance-preview');
  if (acc) {
    el.innerHTML = `Current Balance: <span class="balance-num">${formatCurrency(acc.balance)}</span>`;
  }
}

function updateWithdrawBalance() {
  const sel = document.getElementById('withdraw-account');
  const acc = userAccounts.find(a => a.id == sel.value);
  const el = document.getElementById('withdraw-balance-preview');
  if (acc) {
    el.innerHTML = `Available Balance: <span class="balance-num">${formatCurrency(acc.balance)}</span> &nbsp;|&nbsp; Min Balance: <span>₹500</span>`;
  }
}

function setAmount(inputId, amount) {
  document.getElementById(inputId).value = amount;
}

async function handleDeposit(e) {
  e.preventDefault();
  const accId  = document.getElementById('deposit-account').value;
  const amount = document.getElementById('deposit-amount').value;
  const desc   = document.getElementById('deposit-desc').value;
  const errEl  = document.getElementById('deposit-error');
  errEl.classList.add('hidden');

  const res = await api('POST', `/accounts/${accId}/deposit`, { amount, description: desc });
  if (res.success) {
    // Update local balance
    const acc = userAccounts.find(a => a.id == accId);
    if (acc) acc.balance = res.balance;
    updateDepositBalance();
    document.getElementById('deposit-form').reset();
    await loadAccountsIntoSelect('deposit-account');
    showSuccessModal('Deposit Successful! 🎉', `₹${parseFloat(amount).toLocaleString('en-IN')} has been credited to your account.`, `Reference: ${res.reference}\nNew Balance: ${formatCurrency(res.balance)}`);
  } else {
    errEl.textContent = res.message;
    errEl.classList.remove('hidden');
  }
}

async function handleWithdraw(e) {
  e.preventDefault();
  const accId  = document.getElementById('withdraw-account').value;
  const amount = document.getElementById('withdraw-amount').value;
  const desc   = document.getElementById('withdraw-desc').value;
  const errEl  = document.getElementById('withdraw-error');
  errEl.classList.add('hidden');

  const res = await api('POST', `/accounts/${accId}/withdraw`, { amount, description: desc });
  if (res.success) {
    const acc = userAccounts.find(a => a.id == accId);
    if (acc) acc.balance = res.balance;
    updateWithdrawBalance();
    document.getElementById('withdraw-form').reset();
    await loadAccountsIntoSelect('withdraw-account');
    showSuccessModal('Withdrawal Successful! ✅', `₹${parseFloat(amount).toLocaleString('en-IN')} has been debited from your account.`, `Reference: ${res.reference}\nNew Balance: ${formatCurrency(res.balance)}`);
  } else {
    errEl.textContent = res.message;
    errEl.classList.remove('hidden');
  }
}

// ============================================
// TRANSACTIONS PANEL
// ============================================
async function loadTransactions() {
  const container = document.getElementById('transactions-table-container');
  container.innerHTML = '<div class="loader"><div class="spinner"></div>Loading transactions...</div>';

  // Populate filter select
  const filterSel = document.getElementById('tx-filter-account');
  if (!userAccounts.length) {
    const res = await api('GET', '/accounts');
    if (res.success) userAccounts = res.accounts;
  }
  filterSel.innerHTML = '<option value="">All Accounts</option>' +
    userAccounts.map(a => `<option value="${a.id}">${a.account_number}</option>`).join('');

  const accountId = filterSel.value;
  const url = '/transactions?limit=50' + (accountId ? `&account_id=${accountId}` : '');
  const res = await api('GET', url);

  if (res.success && res.transactions.length > 0) {
    container.innerHTML = `
      <table class="tx-table">
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>Reference</th>
            <th>Description</th>
            <th>Account</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          ${res.transactions.map(tx => `
            <tr>
              <td>${formatDate(tx.created_at)}</td>
              <td class="tx-ref">${tx.reference}</td>
              <td>${tx.description || '—'}</td>
              <td><code style="font-size:0.78rem;color:var(--text-muted)">${tx.account_number}</code></td>
              <td><span class="tx-type-pill ${tx.type === 'credit' ? 'tx-credit' : 'tx-debit'}">${tx.type}</span></td>
              <td class="${tx.type === 'credit' ? 'tx-amount-credit' : 'tx-amount-debit'}">
                ${tx.type === 'credit' ? '+' : '-'}${formatCurrency(tx.amount)}
              </td>
              <td>${formatCurrency(tx.balance_after)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="padding:14px;color:var(--text-muted);font-size:0.8rem;">Showing ${res.transactions.length} of ${res.pagination.total} transactions</div>
    `;
  } else {
    container.innerHTML = `<div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg><p>No transactions found</p></div>`;
  }
}

// ============================================
// ADMIN DASHBOARD
// ============================================
async function loadAdminDashboard() {
  const statsGrid = document.getElementById('admin-stats-grid');
  statsGrid.innerHTML = '<div class="loader"><div class="spinner"></div>Loading stats...</div>';

  const res = await api('GET', '/admin/stats');
  if (!res.success) return;

  const s = res.stats;
  statsGrid.innerHTML = `
    <div class="stat-card purple">
      <div class="stat-icon purple">${usersIcon()}</div>
      <div class="stat-label">Total Customers</div>
      <div class="stat-value">${s.totalCustomers}</div>
      <div class="stat-sub">${s.totalAccounts} accounts</div>
    </div>
    <div class="stat-card blue">
      <div class="stat-icon blue">${walletIcon()}</div>
      <div class="stat-label">Total Deposits (System)</div>
      <div class="stat-value">${formatCurrency(s.totalBalance)}</div>
      <div class="stat-sub">Across all accounts</div>
    </div>
    <div class="stat-card green">
      <div class="stat-icon green">${depositIcon()}</div>
      <div class="stat-label">Today's Deposits</div>
      <div class="stat-value">${formatCurrency(s.todayDeposits)}</div>
      <div class="stat-sub">${s.todayTransactions} transactions today</div>
    </div>
    <div class="stat-card amber">
      <div class="stat-icon amber">${withdrawIcon()}</div>
      <div class="stat-label">Today's Withdrawals</div>
      <div class="stat-value">${formatCurrency(s.todayWithdrawals)}</div>
      <div class="stat-sub">Total TX: ${s.totalTransactions}</div>
    </div>
  `;

  // Recent TX
  if (res.recentTransactions.length > 0) {
    document.getElementById('admin-recent-tx').innerHTML = `
      <table class="tx-table">
        <thead><tr><th>Date</th><th>Customer</th><th>Account</th><th>Type</th><th>Amount</th><th>Reference</th></tr></thead>
        <tbody>
          ${res.recentTransactions.map(tx => `
            <tr>
              <td>${formatDate(tx.created_at)}</td>
              <td>${tx.full_name}</td>
              <td><code style="font-size:0.78rem;color:var(--text-muted)">${tx.account_number}</code></td>
              <td><span class="tx-type-pill ${tx.type === 'credit' ? 'tx-credit' : 'tx-debit'}">${tx.type}</span></td>
              <td class="${tx.type === 'credit' ? 'tx-amount-credit' : 'tx-amount-debit'}">${tx.type === 'credit' ? '+' : '-'}${formatCurrency(tx.amount)}</td>
              <td class="tx-ref">${tx.reference}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  } else {
    document.getElementById('admin-recent-tx').innerHTML = '<div class="empty-state"><p>No transactions yet</p></div>';
  }
}

// ============================================
// ADMIN CUSTOMERS
// ============================================
async function loadCustomers() {
  const container = document.getElementById('customers-table-container');
  container.innerHTML = '<div class="loader"><div class="spinner"></div>Loading customers...</div>';
  const res = await api('GET', '/admin/customers');
  if (res.success) {
    allCustomers = res.customers;
    renderCustomersTable(allCustomers);
  }
}

function filterCustomers() {
  const q = document.getElementById('customer-search').value.toLowerCase();
  const filtered = allCustomers.filter(c =>
    c.full_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.account_number || '').toLowerCase().includes(q)
  );
  renderCustomersTable(filtered);
}

function renderCustomersTable(customers) {
  const container = document.getElementById('customers-table-container');
  if (!customers.length) {
    container.innerHTML = '<div class="empty-state"><p>No customers found</p></div>';
    return;
  }
  container.innerHTML = `
    <table class="tx-table">
      <thead>
        <tr><th>Customer</th><th>Email</th><th>Account No.</th><th>Type</th><th>Balance</th><th>Status</th><th>Actions</th></tr>
      </thead>
      <tbody>
        ${customers.map(c => `
          <tr>
            <td>
              <div style="font-weight:600">${c.full_name}</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">Joined ${formatDateShort(c.created_at)}</div>
            </td>
            <td style="color:var(--text-secondary)">${c.email}</td>
            <td class="tx-ref">${c.account_number || '—'}</td>
            <td>${c.account_type ? `<span class="account-type-badge">${c.account_type}</span>` : '—'}</td>
            <td style="font-weight:600">${c.balance != null ? formatCurrency(c.balance) : '—'}</td>
            <td>${c.status ? `<span class="account-status status-${c.status}">${c.status}</span>` : '—'}</td>
            <td>
              <div class="action-btns">
                ${c.account_id && c.status === 'active' ? `<button class="btn-freeze" onclick="updateAccountStatus(${c.account_id},'frozen')">Freeze</button>` : ''}
                ${c.account_id && c.status === 'frozen' ? `<button class="btn-activate" onclick="updateAccountStatus(${c.account_id},'active')">Activate</button>` : ''}
                <button class="btn-delete-sm" onclick="deleteCustomer(${c.id})">Delete</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div style="padding:14px;color:var(--text-muted);font-size:0.8rem;">${customers.length} customer(s)</div>
  `;
}

async function updateAccountStatus(accountId, status) {
  const res = await api('PUT', `/admin/accounts/${accountId}/status`, { status });
  if (res.success) {
    showToast(`Account ${status} successfully`, 'success');
    loadCustomers();
  } else {
    showToast(res.message, 'error');
  }
}

async function deleteCustomer(customerId) {
  if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) return;
  const res = await api('DELETE', `/admin/customers/${customerId}`);
  if (res.success) {
    showToast('Customer deleted', 'success');
    loadCustomers();
  } else {
    showToast(res.message, 'error');
  }
}

function showAddCustomerModal() {
  document.getElementById('add-customer-modal').classList.remove('hidden');
  document.getElementById('add-customer-form').reset();
  document.getElementById('ac-error').classList.add('hidden');
}

async function handleAddCustomer(e) {
  e.preventDefault();
  const errEl = document.getElementById('ac-error');
  errEl.classList.add('hidden');

  const data = {
    full_name: document.getElementById('ac-name').value,
    email: document.getElementById('ac-email').value,
    password: document.getElementById('ac-password').value,
    account_type: document.getElementById('ac-type').value,
    initial_balance: document.getElementById('ac-balance').value
  };

  const res = await api('POST', '/admin/customers', data);
  if (res.success) {
    closeModal('add-customer-modal');
    showToast('Customer created successfully!', 'success');
    loadCustomers();
  } else {
    errEl.textContent = res.message;
    errEl.classList.remove('hidden');
  }
}

// ============================================
// ADMIN ALL TRANSACTIONS
// ============================================
async function loadAdminTransactions() {
  const container = document.getElementById('admin-transactions-table');
  container.innerHTML = '<div class="loader"><div class="spinner"></div>Loading transactions...</div>';
  const res = await api('GET', '/admin/transactions?limit=100');
  if (res.success && res.transactions.length > 0) {
    container.innerHTML = `
      <table class="tx-table">
        <thead><tr><th>Date</th><th>Customer</th><th>Account</th><th>Type</th><th>Amount</th><th>Balance After</th><th>Description</th><th>Reference</th></tr></thead>
        <tbody>
          ${res.transactions.map(tx => `
            <tr>
              <td>${formatDate(tx.created_at)}</td>
              <td>${tx.full_name}</td>
              <td class="tx-ref">${tx.account_number}</td>
              <td><span class="tx-type-pill ${tx.type === 'credit' ? 'tx-credit' : 'tx-debit'}">${tx.type}</span></td>
              <td class="${tx.type === 'credit' ? 'tx-amount-credit' : 'tx-amount-debit'}">${tx.type === 'credit' ? '+' : '-'}${formatCurrency(tx.amount)}</td>
              <td>${formatCurrency(tx.balance_after)}</td>
              <td style="color:var(--text-secondary)">${tx.description || '—'}</td>
              <td class="tx-ref">${tx.reference}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="padding:14px;color:var(--text-muted);font-size:0.8rem;">Showing ${res.transactions.length} of ${res.pagination.total} transactions</div>
    `;
  } else {
    container.innerHTML = '<div class="empty-state"><p>No transactions found</p></div>';
  }
}

// ============================================
// UTILITIES
// ============================================
function renderTxRows(transactions, showAccount = true) {
  return `
    <table class="tx-table">
      <thead>
        <tr>
          <th>Date</th>
          ${showAccount ? '<th>Account</th>' : ''}
          <th>Description</th>
          <th>Type</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${transactions.map(tx => `
          <tr>
            <td>${formatDate(tx.created_at)}</td>
            ${showAccount ? `<td class="tx-ref">${tx.account_number || ''}</td>` : ''}
            <td>${tx.description || '—'}</td>
            <td><span class="tx-type-pill ${tx.type === 'credit' ? 'tx-credit' : 'tx-debit'}">${tx.type}</span></td>
            <td class="${tx.type === 'credit' ? 'tx-amount-credit' : 'tx-amount-debit'}">${tx.type === 'credit' ? '+' : '-'}${formatCurrency(tx.amount)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function formatCurrency(amount) {
  return '₹' + parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function showSuccessModal(title, message, detail) {
  document.getElementById('success-title').textContent = title;
  document.getElementById('success-message').textContent = message;
  document.getElementById('success-detail').style.whiteSpace = 'pre';
  document.getElementById('success-detail').textContent = detail;
  document.getElementById('success-modal').classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function showToast(message, type = 'info') {
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || '•'}</span> ${message}`;
  document.getElementById('toast-container').appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(60px)'; toast.style.transition = '0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
});

// ============================================
// SVG ICONS
// ============================================
function dashboardIcon() { return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`; }
function accountIcon()   { return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`; }
function depositIcon()   { return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19,12 12,19 5,12"/></svg>`; }
function withdrawIcon()  { return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5,12 12,5 19,12"/></svg>`; }
function txIcon()        { return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`; }
function walletIcon()    { return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>`; }
function usersIcon()     { return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`; }
