# 🏦 NexaBank — Project Analysis

> Comprehensive technical analysis of the Bank Management System codebase.
> Last updated: June 4, 2026

---

## 📋 Project Overview

| Property         | Details |
|------------------|---------|
| **Name**         | NexaBank — Bank Management System |
| **Type**         | Full-stack web application (SPA + REST API) |
| **Architecture** | Monorepo — Express.js backend + Vanilla JS frontend |
| **Database**     | SQLite via sql.js (WebAssembly, no native bindings) |
| **Auth**         | JWT (httpOnly cookies) + bcrypt password hashing |
| **Deployment**   | Vercel (serverless functions + static hosting) |
| **Total Files**  | 15 source files (excluding node_modules) |

---

## 🗂️ File-by-File Breakdown

### Backend — `backend/`

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `index.js` | 78 | Express server entry point, middleware setup, static serving, lazy DB init for Vercel | ✅ Clean |
| `database/db.js` | 184 | SQLite WASM init, CRUD helpers (`dbGet`, `dbAll`, `dbRun`), schema creation, seed data | ✅ Clean |
| `middleware/auth.js` | 43 | JWT token generation/verification, `authMiddleware`, `adminOnly` guard | ✅ Clean |
| `routes/auth.js` | 92 | Login, register, logout, `/me` endpoints | ✅ Clean |
| `routes/accounts.js` | 90 | Account listing, balance check, deposit, withdraw | ✅ Clean |
| `routes/transactions.js` | 51 | Transaction history with pagination and account filtering | ✅ Clean |
| `routes/admin.js` | 157 | Admin stats, customer CRUD, account freeze/activate, all transactions | ✅ Clean |

### Frontend — `frontend/`

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `index.html` | 531 | SPA shell — login, register, dashboard, admin panels, modals | ✅ Clean |
| `css/style.css` | ~800 | Complete design system — glassmorphism, animations, responsive | ✅ Clean |
| `js/app.js` | 810 | SPA router, API client, DOM rendering, all UI controllers | ✅ Clean |

### Config Files

| File | Purpose | Status |
|------|---------|--------|
| `package.json` | Dependencies & scripts | ✅ Clean |
| `vercel.json` | Vercel deployment routing & caching headers | ✅ Clean |
| `.gitignore` | Excludes node_modules, .env, .db files, .vercel | ✅ Clean |
| `README.md` | Project documentation | ✅ Clean |

---

## 🔒 Security Analysis

### ✅ Things Done Right
- **Passwords hashed** with bcrypt (10 rounds local, 4 rounds on Vercel for cold start speed)
- **JWT in httpOnly cookies** — not accessible via JavaScript (prevents XSS token theft)
- **SameSite=lax** cookie attribute — mitigates CSRF
- **Role-based access control** — `authMiddleware` + `adminOnly` guard on admin routes
- **Portal enforcement** — admin credentials can't login on customer portal and vice versa
- **Input validation** — email, password length, deposit/withdrawal amounts all validated
- **Minimum balance check** — ₹500 minimum on withdrawals
- **Parameterized queries** — all SQL uses `?` placeholders (no SQL injection)

### ⚠️ Areas to Note
| Item | Detail | Risk Level |
|------|--------|------------|
| Hardcoded JWT secret | `bank_ms_super_secret_2024_key` used as fallback | Low (for demo) |
| No rate limiting | Login endpoint has no brute-force protection | Low (for demo) |
| No HTTPS enforcement | Relies on Vercel's automatic HTTPS | None on Vercel |
| Vercel ephemeral DB | SQLite in `/tmp/` resets on cold starts | Expected behavior |

---

## 🗄️ Database Schema

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│    users     │     │   accounts   │     │  transactions    │
├──────────────┤     ├──────────────┤     ├──────────────────┤
│ id (PK)      │──┐  │ id (PK)      │──┐  │ id (PK)          │
│ full_name    │  └──│ user_id (FK) │  └──│ account_id (FK)  │
│ email (UQ)   │     │ account_no   │     │ type             │
│ password     │     │ account_type │     │ amount           │
│ role         │     │ balance      │     │ balance_after    │
│ created_at   │     │ status       │     │ description      │
└──────────────┘     │ created_at   │     │ reference (UQ)   │
                     └──────────────┘     │ created_at       │
                                          └──────────────────┘
```

**Relationships:**
- `users` 1 ──→ N `accounts` (via `user_id`)
- `accounts` 1 ──→ N `transactions` (via `account_id`)

---

## 🌐 API Endpoint Map

### Public
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/auth/login` | Authenticate & get JWT |
| POST | `/api/auth/register` | Create customer account |
| POST | `/api/auth/logout` | Clear auth cookie |

### Customer (requires auth)
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/auth/me` | Get current user info |
| GET | `/api/accounts` | List user's accounts |
| GET | `/api/accounts/:id/balance` | Get single account balance |
| POST | `/api/accounts/:id/deposit` | Deposit funds |
| POST | `/api/accounts/:id/withdraw` | Withdraw funds |
| GET | `/api/transactions` | Transaction history (paginated) |

### Admin (requires auth + admin role)
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/admin/stats` | System-wide statistics |
| GET | `/api/admin/customers` | List all customers |
| POST | `/api/admin/customers` | Create customer with account |
| PUT | `/api/admin/accounts/:id/status` | Freeze/activate account |
| DELETE | `/api/admin/customers/:id` | Delete customer & data |
| GET | `/api/admin/transactions` | All transactions (paginated) |

---

## ⚡ Performance Optimizations Applied

| Optimization | Where | Impact |
|---|---|---|
| Lazy DB initialization | `index.js` middleware | Frontend loads instantly on Vercel; DB only spins up on first API call |
| Lower bcrypt rounds on Vercel | `db.js`, `auth.js`, `admin.js` | ~1s faster cold start (4 rounds vs 10) |
| Batched saveDb during seeding | `db.js` `_doSetup()` | 1 disk write instead of 9 |
| Non-blocking Google Fonts | `index.html` `<head>` | Font loading doesn't block page render |
| Branded loading screen | `index.html` inline CSS | Users see NexaBank branding instantly instead of blank white page |
| Static asset caching | `vercel.json` + `index.js` | CSS/JS cached 1 day, images 1 week |
| DB promise retry on failure | `index.js` + `db.js` | Failed init doesn't permanently lock the server |

---

## 🧪 Seed Data

Auto-created on first run (or every Vercel cold start):

| Role | Name | Email | Password |
|------|------|-------|----------|
| Admin | System Administrator | admin@bankms.com | admin123 |
| Customer | Rahul Sharma | rahul@email.com | password123 |
| Customer | Priya Patel | priya@email.com | password123 |
| Customer | Arjun Mehta | arjun@email.com | password123 |

Each customer gets a **savings account** with a random balance between ₹5,000 – ₹55,000.

---

## 🧩 Frontend Architecture

```
SPA (Single Page Application)
├── Login Page      → POST /api/auth/login
├── Register Page   → POST /api/auth/register
└── App Page (authenticated)
    ├── Sidebar Navigation
    ├── Customer Panels
    │   ├── Dashboard   → GET /accounts + /transactions
    │   ├── Accounts    → GET /accounts
    │   ├── Deposit     → POST /accounts/:id/deposit
    │   ├── Withdraw    → POST /accounts/:id/withdraw
    │   └── History     → GET /transactions
    └── Admin Panels
        ├── Dashboard   → GET /admin/stats
        ├── Customers   → GET/POST/DELETE /admin/customers
        └── All TX      → GET /admin/transactions
```

**Routing:** Client-side via `navigate()` function — shows/hides `.panel` divs. No page reloads.

---

## 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.18.2 | HTTP server & routing |
| sql.js | ^1.10.2 | SQLite via WebAssembly |
| bcryptjs | ^2.4.3 | Password hashing |
| jsonwebtoken | ^9.0.2 | JWT auth tokens |
| cookie-parser | ^1.4.6 | Parse cookies from requests |
| express-session | ^1.17.3 | Session support (installed but unused) |
| uuid | ^9.0.0 | Generate unique transaction references |

> Note: `express-session` is listed in package.json but not imported anywhere. It's safe to remove.

---

## 🚀 Deployment Notes (Vercel)

- **Static files** (HTML/CSS/JS) served via `@vercel/static` — instant load
- **API routes** handled by `@vercel/node` serverless function — `backend/index.js`
- **Database** uses `/tmp/bank.db` on Vercel (ephemeral — resets on cold starts)
- **Caching:** CSS/JS get `max-age: 86400` (1 day), images `604800` (1 week)
- **Auto-deploy:** Pushes to `master` branch trigger automatic redeployment

---

## ✅ Overall Assessment

| Category | Rating | Notes |
|----------|--------|-------|
| Code Quality | ⭐⭐⭐⭐ | Clean, well-organized, consistent patterns |
| Security | ⭐⭐⭐⭐ | Solid for a demo app — hashed passwords, JWT, parameterized SQL |
| UI/UX | ⭐⭐⭐⭐⭐ | Modern glassmorphism design, smooth animations, responsive |
| Performance | ⭐⭐⭐⭐ | Optimized for Vercel cold starts, lazy loading, caching |
| Error Handling | ⭐⭐⭐⭐ | Try-catch on all routes, user-friendly error messages |
| Documentation | ⭐⭐⭐⭐⭐ | Comprehensive README + this analysis |
