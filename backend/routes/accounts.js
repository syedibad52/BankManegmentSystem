const express = require('express');
const router = express.Router();
const { getDb, dbGet, dbAll, saveDb } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(authMiddleware);

// GET /api/accounts
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const accounts = dbAll(db, 'SELECT * FROM accounts WHERE user_id = ?', [req.user.id]);
    return res.json({ success: true, accounts });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/accounts/:id/balance
router.get('/:id/balance', async (req, res) => {
  try {
    const db = await getDb();
    const account = dbGet(db, 'SELECT * FROM accounts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    return res.json({ success: true, account_number: account.account_number, account_type: account.account_type, balance: account.balance, status: account.status });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/accounts/:id/deposit
router.post('/:id/deposit', async (req, res) => {
  const { amount, description } = req.body;
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) return res.status(400).json({ success: false, message: 'Invalid deposit amount' });
  if (numAmount > 1000000) return res.status(400).json({ success: false, message: 'Maximum deposit is ₹10,00,000 per transaction' });

  try {
    const db = await getDb();
    const account = dbGet(db, 'SELECT * FROM accounts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    if (account.status !== 'active') return res.status(400).json({ success: false, message: 'Account is not active' });

    const newBalance = account.balance + numAmount;
    const ref = 'DEP-' + uuidv4().split('-')[0].toUpperCase();

    db.run('UPDATE accounts SET balance = ? WHERE id = ?', [newBalance, account.id]);
    db.run('INSERT INTO transactions (account_id, type, amount, balance_after, description, reference) VALUES (?, ?, ?, ?, ?, ?)',
      [account.id, 'credit', numAmount, newBalance, description || 'Cash Deposit', ref]);
    saveDb();

    return res.json({ success: true, message: `₹${numAmount.toFixed(2)} deposited successfully`, balance: newBalance, reference: ref });
  } catch (err) {
    console.error('Deposit error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/accounts/:id/withdraw
router.post('/:id/withdraw', async (req, res) => {
  const { amount, description } = req.body;
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) return res.status(400).json({ success: false, message: 'Invalid withdrawal amount' });

  try {
    const db = await getDb();
    const account = dbGet(db, 'SELECT * FROM accounts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    if (account.status !== 'active') return res.status(400).json({ success: false, message: 'Account is not active' });
    if (account.balance < numAmount) return res.status(400).json({ success: false, message: 'Insufficient balance' });
    if (account.balance - numAmount < 500) return res.status(400).json({ success: false, message: 'Minimum balance of ₹500 must be maintained' });

    const newBalance = account.balance - numAmount;
    const ref = 'WDR-' + uuidv4().split('-')[0].toUpperCase();

    db.run('UPDATE accounts SET balance = ? WHERE id = ?', [newBalance, account.id]);
    db.run('INSERT INTO transactions (account_id, type, amount, balance_after, description, reference) VALUES (?, ?, ?, ?, ?, ?)',
      [account.id, 'debit', numAmount, newBalance, description || 'Cash Withdrawal', ref]);
    saveDb();

    return res.json({ success: true, message: `₹${numAmount.toFixed(2)} withdrawn successfully`, balance: newBalance, reference: ref });
  } catch (err) {
    console.error('Withdraw error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
