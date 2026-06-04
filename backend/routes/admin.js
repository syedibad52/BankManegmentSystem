const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb, dbGet, dbAll, saveDb, BCRYPT_ROUNDS } = require('../database/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(authMiddleware);
router.use(adminOnly);

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const db = await getDb();
    const r1 = dbGet(db, "SELECT COUNT(*) as count FROM users WHERE role = 'customer'");
    const r2 = dbGet(db, "SELECT COUNT(*) as count FROM accounts");
    const r3 = dbGet(db, "SELECT COALESCE(SUM(balance), 0) as total FROM accounts");
    const r4 = dbGet(db, "SELECT COUNT(*) as count FROM transactions");
    const r5 = dbGet(db, "SELECT COUNT(*) as count FROM transactions WHERE DATE(created_at) = DATE('now')");
    const r6 = dbGet(db, "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'credit' AND DATE(created_at) = DATE('now')");
    const r7 = dbGet(db, "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'debit' AND DATE(created_at) = DATE('now')");
    const recentTransactions = dbAll(db, `
      SELECT t.id, t.type, t.amount, t.balance_after, t.description, t.reference, t.created_at,
             u.full_name, a.account_number
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      JOIN users u ON a.user_id = u.id
      ORDER BY t.created_at DESC LIMIT 10
    `);

    return res.json({
      success: true,
      stats: {
        totalCustomers: r1 ? r1.count : 0,
        totalAccounts: r2 ? r2.count : 0,
        totalBalance: r3 ? r3.total : 0,
        totalTransactions: r4 ? r4.count : 0,
        todayTransactions: r5 ? r5.count : 0,
        todayDeposits: r6 ? r6.total : 0,
        todayWithdrawals: r7 ? r7.total : 0,
      },
      recentTransactions
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/customers
router.get('/customers', async (req, res) => {
  try {
    const db = await getDb();
    const customers = dbAll(db, `
      SELECT u.id, u.full_name, u.email, u.created_at,
             a.id as account_id, a.account_number, a.account_type, a.balance, a.status
      FROM users u
      LEFT JOIN accounts a ON u.id = a.user_id
      WHERE u.role = 'customer'
      ORDER BY u.created_at DESC
    `);
    return res.json({ success: true, customers });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/transactions
router.get('/transactions', async (req, res) => {
  const { limit = 100, page = 1 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    const db = await getDb();
    const transactions = dbAll(db, `
      SELECT t.id, t.type, t.amount, t.balance_after, t.description, t.reference, t.created_at,
             u.full_name, a.account_number, a.account_type
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      JOIN users u ON a.user_id = u.id
      ORDER BY t.created_at DESC LIMIT ? OFFSET ?
    `, [parseInt(limit), offset]);
    const totalRow = dbGet(db, 'SELECT COUNT(*) as total FROM transactions');
    return res.json({ success: true, transactions, pagination: { total: totalRow ? totalRow.total : 0, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/admin/customers
router.post('/customers', async (req, res) => {
  const { full_name, email, password, account_type = 'savings', initial_balance = 0 } = req.body;
  if (!full_name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email and password required' });
  }
  try {
    const db = await getDb();
    const existing = dbGet(db, 'SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    db.run("INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, 'customer')",
      [full_name.trim(), email.toLowerCase(), hash]);
    saveDb();

    const newUser = dbGet(db, 'SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    const accNum = 'ACC' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100);
    const bal = parseFloat(initial_balance) || 0;
    db.run("INSERT INTO accounts (account_number, user_id, account_type, balance) VALUES (?, ?, ?, ?)",
      [accNum, newUser.id, account_type, bal]);
    saveDb();

    if (bal > 0) {
      const acc = dbGet(db, 'SELECT id FROM accounts WHERE user_id = ?', [newUser.id]);
      const ref = 'DEP-' + uuidv4().split('-')[0].toUpperCase();
      db.run('INSERT INTO transactions (account_id, type, amount, balance_after, description, reference) VALUES (?, ?, ?, ?, ?, ?)',
        [acc.id, 'credit', bal, bal, 'Initial Deposit (Admin)', ref]);
      saveDb();
    }
    return res.json({ success: true, message: 'Customer account created successfully' });
  } catch (err) {
    console.error('Create customer error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/admin/accounts/:id/status
router.put('/accounts/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['active', 'frozen', 'closed'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }
  try {
    const db = await getDb();
    db.run('UPDATE accounts SET status = ? WHERE id = ?', [status, req.params.id]);
    saveDb();
    return res.json({ success: true, message: `Account ${status} successfully` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/admin/customers/:id
router.delete('/customers/:id', async (req, res) => {
  try {
    const db = await getDb();
    db.run("DELETE FROM transactions WHERE account_id IN (SELECT id FROM accounts WHERE user_id = ?)", [req.params.id]);
    db.run("DELETE FROM accounts WHERE user_id = ?", [req.params.id]);
    db.run("DELETE FROM users WHERE id = ? AND role = 'customer'", [req.params.id]);
    saveDb();
    return res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
