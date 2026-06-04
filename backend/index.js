const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { setupDatabase } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static frontend with caching headers
app.use(express.static(path.join(__dirname, '../frontend'), {
  maxAge: '1d',            // cache static assets for 1 day
  etag: true,
  lastModified: true
}));

// Ensure DB is ready before ANY API request hits a route
let dbReady = false;
let dbPromise = null;

app.use('/api', async (req, res, next) => {
  try {
    if (!dbReady) {
      if (!dbPromise) dbPromise = setupDatabase();
      await dbPromise;
      dbReady = true;
    }
    next();
  } catch (err) {
    // Reset so next request retries instead of being stuck on the failed promise
    dbPromise = null;
    console.error('DB init error:', err);
    res.status(500).json({ success: false, message: 'Server starting up, please retry.' });
  }
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/admin', require('./routes/admin'));

// Serve index.html for all non-API routes (SPA)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  }
});

if (process.env.VERCEL !== '1') {
  // Start DB setup immediately for local dev (non-blocking)
  setupDatabase();

  app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║    🏦 Bank Management System Running     ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  🌐 URL: http://localhost:${PORT}           ║`);
    console.log('║                                          ║');
    console.log('║  👤 Admin Login:                         ║');
    console.log('║     Email:    admin@bankms.com           ║');
    console.log('║     Password: admin123                   ║');
    console.log('║                                          ║');
    console.log('║  👥 Customer Login:                      ║');
    console.log('║     Email:    rahul@email.com            ║');
    console.log('║     Password: password123                ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
  });
}

module.exports = app;
