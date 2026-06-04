const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { setupDatabase } = require('./database/db');

// Setup DB on first run
setupDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static frontend from the frontend/ folder
app.use(express.static(path.join(__dirname, '../frontend')));

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
