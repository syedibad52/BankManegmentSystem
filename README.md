# 🏦 NexaBank — Bank Management System

A full-stack **Bank Account Management System** with separate **Admin** and **Customer** portals. Built with Node.js, Express, SQLite (via sql.js), and a vanilla HTML/CSS/JS frontend.

---

## ✨ Features

### Customer Portal
- 🔐 Secure login & registration
- 📊 Dashboard with account overview & quick stats
- 💰 Deposit & withdraw funds with real-time balance updates
- 📜 Full transaction history with filters
- 🏦 View all linked bank accounts

### Admin Portal
- 🛡️ Admin-only dashboard with system-wide statistics
- 👥 Customer management — view, add, and manage customers
- 📋 System-wide transaction ledger
- ➕ Create new customer accounts with initial balance

### General
- 🎨 Modern, responsive UI with glassmorphism design
- 🔒 JWT-based authentication with cookie storage
- 🌗 Beautiful animations and micro-interactions
- 📱 Mobile-friendly layout

---

## 🛠️ Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | HTML5, CSS3 (vanilla), JavaScript   |
| Backend    | Node.js, Express.js                 |
| Database   | SQLite via [sql.js](https://github.com/sql-js/sql.js) (WebAssembly, no native bindings) |
| Auth       | JWT (jsonwebtoken) + bcryptjs       |
| Deployment | Vercel (serverless)                 |

---

## 📁 Project Structure

```
BankManegmentSystem/
├── backend/
│   ├── database/
│   │   └── db.js            # Database setup, queries & seeding
│   ├── middleware/
│   │   └── auth.js          # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js          # Login & register endpoints
│   │   ├── accounts.js      # Account CRUD operations
│   │   ├── transactions.js  # Deposit & withdraw endpoints
│   │   └── admin.js         # Admin-only endpoints
│   └── index.js             # Express server entry point
├── frontend/
│   ├── css/
│   │   └── style.css        # All styles (glassmorphism, animations)
│   ├── js/
│   │   └── app.js           # SPA logic, API calls, DOM rendering
│   └── index.html           # Single-page application shell
├── vercel.json              # Vercel deployment configuration
├── package.json
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v16 or higher
- npm (comes with Node.js)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/syedibad52/BankManegmentSystem.git

# 2. Navigate into the project
cd BankManegmentSystem

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev
```

The app will be running at **http://localhost:3000**

---

## 🔑 Demo Credentials

| Role     | Email              | Password      |
|----------|--------------------|---------------|
| Admin    | admin@bankms.com   | admin123      |
| Customer | rahul@email.com    | password123   |
| Customer | priya@email.com    | password123   |
| Customer | arjun@email.com    | password123   |

> These accounts are auto-seeded on first run.

---

## 📡 API Endpoints

### Auth
| Method | Endpoint            | Description          |
|--------|---------------------|----------------------|
| POST   | `/api/auth/login`   | Login (returns JWT)  |
| POST   | `/api/auth/register`| Register new customer|
| POST   | `/api/auth/logout`  | Logout (clears cookie)|
| GET    | `/api/auth/me`      | Get current user info|

### Accounts
| Method | Endpoint            | Description                 |
|--------|---------------------|-----------------------------|
| GET    | `/api/accounts`     | Get logged-in user's accounts|

### Transactions
| Method | Endpoint                    | Description         |
|--------|-----------------------------|---------------------|
| GET    | `/api/transactions`         | Get transaction history|
| POST   | `/api/transactions/deposit` | Deposit funds       |
| POST   | `/api/transactions/withdraw`| Withdraw funds      |

### Admin (requires admin role)
| Method | Endpoint                    | Description              |
|--------|-----------------------------|--------------------------|
| GET    | `/api/admin/stats`          | System-wide statistics   |
| GET    | `/api/admin/customers`      | List all customers       |
| POST   | `/api/admin/customers`      | Add a new customer       |
| GET    | `/api/admin/transactions`   | All transactions (system)|

---

## ☁️ Deploying to Vercel

This project is pre-configured for Vercel deployment.

1. Push your code to GitHub (already done ✅)
2. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
3. Click **Add New → Project**
4. Import the `BankManegmentSystem` repository
5. Click **Deploy** — no extra configuration needed

> ⚠️ **Note:** On Vercel's serverless environment, the SQLite database is stored in `/tmp/` and resets between cold starts. For production use, consider switching to a hosted database like PostgreSQL or PlanetScale.

---

## 📝 License

This project is open-source and available for educational purposes.

---

## 🙌 Author

**Syed Ibad** — [@syedibad52](https://github.com/syedibad52)
