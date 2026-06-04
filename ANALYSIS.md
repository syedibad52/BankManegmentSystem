# Bank Management System — Technology Analysis

## Project Overview

This is a **Node.js + Express** web application. It is **NOT** written in Java.

---

## ❌ Java Swing — NOT Present

**Java Swing** is a Java GUI toolkit used to build desktop applications with windows, buttons, dialogs, etc.

> This project is a **web application** and uses **HTML/CSS/JavaScript** for its user interface — not Java Swing.

### What Replaces Swing in This Project?

| Swing Component        | This Project's Equivalent                         | File Location                    |
|------------------------|---------------------------------------------------|----------------------------------|
| `JFrame` (main window) | `<body>` / `index.html` page layout               | `frontend/index.html`            |
| `JPanel` (containers)  | `<div>` sections & CSS Grid/Flexbox layouts       | `frontend/css/style.css`         |
| `JButton`              | `<button>` HTML elements                          | `frontend/index.html`            |
| `JTextField`           | `<input type="text">` HTML elements               | `frontend/index.html`            |
| `JTable`               | HTML `<table>` with dynamic rows via JS           | `frontend/js/app.js`             |
| Event listeners        | `addEventListener()` in JavaScript                | `frontend/js/app.js`             |
| `JDialog` / popups     | Modal `<div>` overlays with CSS animation         | `frontend/index.html` + `app.js` |

**Swing is used:** ❌ Nowhere — this is a web app.

---

## ❌ JDBC — NOT Present

**JDBC** (Java Database Connectivity) is a Java API for connecting to relational databases (MySQL, SQLite, Oracle, etc.).

> This project uses **sql.js** — a JavaScript port of SQLite compiled to WebAssembly — instead of JDBC.

### What Replaces JDBC in This Project?

| JDBC Concept                  | This Project's Equivalent                    | File Location                      |
|-------------------------------|----------------------------------------------|------------------------------------|
| `DriverManager.getConnection` | `initSqlJs()` + `new SQL.Database()`         | `backend/database/db.js` L.18-28   |
| `Connection` object           | `_db` (the sql.js Database instance)         | `backend/database/db.js` L.9       |
| `PreparedStatement`           | `db.prepare(sql)` + `stmt.bind(params)`      | `backend/database/db.js` L.44-54   |
| `ResultSet`                   | `stmt.getAsObject()` / `stmt.step()`         | `backend/database/db.js` L.44-65   |
| `stmt.executeQuery()`         | `dbGet()` / `dbAll()` helper functions       | `backend/database/db.js` L.44-65   |
| `stmt.executeUpdate()`        | `dbRun()` / `db.run()`                       | `backend/database/db.js` L.39-42   |
| `connection.commit()`         | `saveDb()` — writes binary DB to disk        | `backend/database/db.js` L.30-35   |
| Schema DDL (`CREATE TABLE`)   | `setupDatabase()` function                   | `backend/database/db.js` L.67-151  |

**JDBC is used:** ❌ Nowhere — JavaScript/Node.js projects don't use JDBC (that's a Java API).

---

## ✅ Actual Database Technology

| Layer             | Technology                 | Details                                              |
|-------------------|----------------------------|------------------------------------------------------|
| Database Engine   | **SQLite**                 | Embedded relational database, single `.db` file      |
| JS Driver         | **sql.js** (`npm` package) | SQLite compiled to WebAssembly, runs in Node.js      |
| DB File Location  | `backend/database/bank.db` | Binary SQLite file, auto-created on first run        |
| DB Connection     | `backend/database/db.js`   | All queries, schema creation, seeding logic here     |

### SQL Tables Used

```sql
-- Users (customers + admin)
CREATE TABLE users (id, full_name, email, password, role, created_at)

-- Bank accounts
CREATE TABLE accounts (id, account_number, user_id, account_type, balance, status, created_at)

-- Transactions (deposits / withdrawals)
CREATE TABLE transactions (id, account_id, type, amount, balance_after, description, reference, created_at)
```

---

## Project Structure Summary

```
BankManegentSystem/
│
├── frontend/                        ← GUI Layer (replaces Java Swing)
│   ├── index.html                   ← Main page (replaces JFrame)
│   ├── css/
│   │   └── style.css                ← Styling (no Swing equivalent)
│   └── js/
│       └── app.js                   ← UI logic (replaces Swing event listeners)
│
├── backend/                         ← Server Layer (replaces Java main class)
│   ├── index.js                     ← Express server entry point
│   ├── database/
│   │   ├── db.js                    ← DB layer (replaces JDBC)
│   │   └── bank.db                  ← SQLite binary file (the actual database)
│   ├── middleware/
│   │   └── auth.js                  ← JWT authentication
│   └── routes/
│       ├── auth.js                  ← Login / Register / Logout APIs
│       ├── accounts.js              ← Deposit / Withdraw / Balance APIs
│       ├── transactions.js          ← Transaction history API
│       └── admin.js                 ← Admin management APIs
│
├── package.json
└── .gitignore
```
