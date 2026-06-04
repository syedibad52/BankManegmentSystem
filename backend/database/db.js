// ============================================================
//  DATABASE LAYER  —  backend/database/db.js
//  This is the JDBC-equivalent for this Node.js project.
//  Technology: sql.js (SQLite via WebAssembly, no native bindings)
//  Database file: backend/database/bank.db
// ============================================================

const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Resolved path to the SQLite database file (visible in backend/database/)
const isVercel = process.env.VERCEL === '1';
const DB_PATH = isVercel ? '/tmp/bank.db' : path.join(__dirname, 'bank.db');

// Use lower bcrypt rounds on Vercel for faster cold starts (4 rounds ≈ 5ms vs 10 rounds ≈ 300ms)
const BCRYPT_ROUNDS = isVercel ? 4 : 10;

let _sqlJs = null;
let _db = null;
let _setupPromise = null;   // ensures setupDatabase runs only once
let _setupDone = false;

async function getSqlJs() {
  if (!_sqlJs) {
    _sqlJs = await initSqlJs();
  }
  return _sqlJs;
}

async function getDb() {
  // Ensure setup has completed before returning db
  if (!_setupDone && _setupPromise) {
    await _setupPromise;
  }
  if (_db) return _db;
  const SQL = await getSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(fileBuffer);
  } else {
    _db = new SQL.Database();
  }
  return _db;
}

function saveDb() {
  if (_db) {
    const data = _db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

// Wrapper to run sql.js queries like better-sqlite3 (synchronous interface shim)
// Since sql.js is synchronous after init, we expose a sync-like API
function dbRun(db, sql, params = []) {
  db.run(sql, params);
  saveDb();
}

function dbGet(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function dbAll(db, sql, params = []) {
  const results = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

async function setupDatabase() {
  // Prevent duplicate runs
  if (_setupDone) return;
  if (_setupPromise) return _setupPromise;

  _setupPromise = _doSetup();
  await _setupPromise;
  _setupDone = true;
}

async function _doSetup() {
  const db = await getDb();

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_number TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      account_type TEXT NOT NULL DEFAULT 'savings',
      balance REAL NOT NULL DEFAULT 0.00,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_after REAL NOT NULL,
      description TEXT,
      reference TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  saveDb();

  // Seed admin
  const adminExists = dbGet(db, "SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', BCRYPT_ROUNDS);
    db.run("INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, 'admin')",
      ['System Administrator', 'admin@bankms.com', hash]);
    saveDb();
    console.log('✅ Admin account created: admin@bankms.com / admin123');
  }

  // Seed customers
  const countRow = dbGet(db, "SELECT COUNT(*) as count FROM users WHERE role = 'customer'");
  if (!countRow || countRow.count === 0) {
    // Hash once, reuse for all customers
    const customerHash = bcrypt.hashSync('password123', BCRYPT_ROUNDS);
    const customers = [
      ['Rahul Sharma', 'rahul@email.com'],
      ['Priya Patel', 'priya@email.com'],
      ['Arjun Mehta', 'arjun@email.com'],
    ];

    for (const [name, email] of customers) {
      db.run("INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, 'customer')",
        [name, email, customerHash]);

      const user = dbGet(db, "SELECT id FROM users WHERE email = ?", [email]);
      const accNum = 'ACC' + String(Date.now()).slice(-8) + Math.floor(Math.random() * 100);
      const balance = Math.floor(Math.random() * 50000) + 5000;
      db.run("INSERT INTO accounts (account_number, user_id, account_type, balance) VALUES (?, ?, 'savings', ?)",
        [accNum, user.id, balance]);

      const acc = dbGet(db, "SELECT id FROM accounts WHERE user_id = ?", [user.id]);
      const txRef = 'TXN' + Date.now() + Math.random().toString(36).slice(2, 7).toUpperCase();
      db.run("INSERT INTO transactions (account_id, type, amount, balance_after, description, reference) VALUES (?, 'credit', ?, ?, 'Initial deposit', ?)",
        [acc.id, balance, balance, txRef]);
    }
    // Save once at the end instead of after every single operation
    saveDb();
    console.log('✅ Sample customers created (password: password123)');
  }

  console.log('✅ Database setup complete:', DB_PATH);
}

module.exports = { getDb, saveDb, dbRun, dbGet, dbAll, setupDatabase, BCRYPT_ROUNDS };
