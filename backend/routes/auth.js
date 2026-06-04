const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb, dbGet, dbRun, saveDb } = require('../database/db');
const { generateToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password, expectedRole } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }
  try {
    const db = await getDb();
    const user = dbGet(db, 'SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Enforce portal role — admin portal only allows admin, customer portal only allows customers
    if (expectedRole && user.role !== expectedRole) {
      const correctPortal = user.role === 'admin' ? 'Admin Portal' : 'Customer Portal';
      return res.status(403).json({
        success: false,
        message: `This account is not an ${expectedRole} account. Please use the ${correctPortal}.`
      });
    }

    const token = generateToken(user);
    res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000, sameSite: 'lax' });
    return res.json({
      success: true,
      message: 'Login successful',
      user: { id: user.id, name: user.full_name, email: user.email, role: user.role },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { full_name, email, password } = req.body;
  if (!full_name || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }
  try {
    const db = await getDb();
    const existing = dbGet(db, 'SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }
    const hash = bcrypt.hashSync(password, 10);
    db.run("INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, 'customer')",
      [full_name.trim(), email.toLowerCase(), hash]);
    saveDb();

    const newUser = dbGet(db, 'SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    const accNum = 'ACC' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100);
    db.run("INSERT INTO accounts (account_number, user_id, account_type, balance) VALUES (?, ?, 'savings', 0)",
      [accNum, newUser.id]);
    saveDb();

    return res.json({ success: true, message: 'Account created successfully! Please login.' });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').authMiddleware, (req, res) => {
  return res.json({ success: true, user: req.user });
});

module.exports = router;
