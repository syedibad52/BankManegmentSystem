const express = require('express');
const router = express.Router();
const { getDb, dbAll, dbGet } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/transactions
router.get('/', async (req, res) => {
  const { account_id, limit = 20, page = 1 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const db = await getDb();
    let query = `
      SELECT t.id, t.type, t.amount, t.balance_after, t.description, t.reference, t.created_at,
             a.account_number, a.account_type
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      WHERE a.user_id = ?
    `;
    const params = [req.user.id];

    if (account_id) {
      query += ' AND t.account_id = ?';
      params.push(account_id);
    }
    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const transactions = dbAll(db, query, params);

    let countQuery = `SELECT COUNT(*) as total FROM transactions t JOIN accounts a ON t.account_id = a.id WHERE a.user_id = ?`;
    const countParams = [req.user.id];
    if (account_id) { countQuery += ' AND t.account_id = ?'; countParams.push(account_id); }
    const countRow = dbGet(db, countQuery, countParams);
    const total = countRow ? countRow.total : 0;

    return res.json({
      success: true,
      transactions,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('Transactions error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
