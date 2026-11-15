# ⛓️ ChainLedger — Blockchain-Inspired Wallet & Transaction Management Platform

**ChainLedger** is a full-stack wallet and transaction management platform designed to provide a structured way to manage digital wallets, record financial transactions, monitor account activity, and visualize financial analytics.

Built with **Node.js, Express.js, PostgreSQL, Prisma ORM, Redis, and React**, ChainLedger focuses on backend engineering principles such as REST API design, authentication, database relationships, transaction consistency, caching, background job processing, and audit logging.

> **Note:** ChainLedger is a blockchain-inspired financial ledger application. It does not execute real blockchain transactions or synchronize on-chain activity. Ethereum addresses are validated using Ethers.js.

---

## 🚀 Key Features

### 🔐 Authentication & Security
- User registration and login.
- Password hashing using bcrypt.
- JWT-based authentication.
- Protected API routes.
- User-specific data access and authorization.
- Helmet security middleware and API rate limiting.

### 💳 Wallet Management
- Create, view, update, and delete wallets.
- Ethereum address validation using Ethers.js.
- Support for wallet network and currency information.
- User-specific wallet ownership.
- Protection against deleting wallets associated with transactions.

### 📊 Transaction Management
- Create income, expense, and transfer records.
- Transaction history with pagination.
- Filter transactions by type, status, and wallet.
- View individual transaction details.
- Update transaction descriptions and references.
- Validate transaction amounts and wallet ownership.
- Maintain transaction audit history.

### 📈 Financial Analytics
- Financial overview dashboard.
- Income, expense, and net activity summaries.
- Monthly financial analytics.
- Daily transaction breakdown.
- Wallet-wise financial performance.
- Interactive charts and data visualization.

### ⚡ Performance & Background Processing
- Redis-based analytics caching.
- Cache invalidation after transaction operations.
- BullMQ-based background job queue.
- Separate transaction worker process.

### 📝 Audit Logging
- Record important wallet and transaction activities.
- Maintain user-specific audit history.
- Use database transactions for related data changes.

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| Frontend | React 19, Vite |
| Styling | CSS |
| Routing | React Router |
| Data Visualization | Recharts |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT, bcrypt |
| Blockchain Utilities | Ethers.js |
| Caching | Redis |
| Background Jobs | BullMQ, ioredis |
| Validation | Zod |
| Security | Helmet, express-rate-limit |
| API Testing | Supertest, Node.js Test Runner |
| Version Control | Git, GitHub |

---

## 🏗️ Project Architecture

```text
ChainLedger/
│
├── Backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   │
│   ├── src/
│   │   ├── config/
│   │   ├── jobs/
│   │   │   ├── queues/
│   │   │   └── workers/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── scripts/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   │
│   ├── tests/
│   ├── package.json
│   └── .gitignore
│
├── Frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── app.jsx
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## ⚙️ Getting Started

Follow these instructions to run ChainLedger locally.

### 1. Prerequisites

Make sure you have installed:

- Node.js
- npm
- PostgreSQL
- Redis
- Git

### 2. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/ChainLedger.git
cd ChainLedger
```

Replace `YOUR_USERNAME` with your GitHub username.

### 3. Backend Setup

Navigate to the backend directory:

```bash
cd Backend
npm install
```

Create a `.env` file inside the `Backend` directory:

```env
NODE_ENV=development
PORT=5000

FRONTEND_URL=http://localhost:5173

DATABASE_URL=your_postgresql_connection_string

JWT_SECRET=your_secure_secret_at_least_32_characters_long
JWT_EXPIRES_IN=1d

REDIS_URL=redis://localhost:6379
```

**Important:** Replace the placeholder values with your actual local configuration. Never commit your `.env` file or expose your credentials.

### 4. Database Setup

Apply the Prisma migrations:

```bash
npx prisma migrate deploy
```

Generate the Prisma Client if needed:

```bash
npx prisma generate
```

### 5. Start Redis

Make sure your Redis server is running and accessible through the configured `REDIS_URL`.

### 6. Start the Backend Server

```bash
npm run dev
```

The backend will run at:

```text
http://localhost:5000
```

### 7. Start the Background Worker

Open another terminal inside the `Backend` directory:

```bash
npm run worker:transactions
```

### 8. Frontend Setup

Open another terminal:

```bash
cd Frontend
npm install
```

Create a `.env` file inside `Frontend`:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

Start the frontend:

```bash
npm run dev
```

Open the application:

```text
http://localhost:5173
```

---

## 🔌 API Endpoints

All API endpoints are prefixed with:

```text
/api/v1
```

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Authenticate a user |
| GET | `/auth/me` | Retrieve current user |
| POST | `/auth/logout` | Logout acknowledgement |

### Wallet Management

| Method | Endpoint | Description |
|---|---|---|
| POST | `/wallets` | Create a wallet |
| GET | `/wallets` | Retrieve all wallets |
| GET | `/wallets/:id` | Retrieve a wallet |
| PATCH | `/wallets/:id` | Update wallet details |
| DELETE | `/wallets/:id` | Delete a wallet |

### Transactions

| Method | Endpoint | Description |
|---|---|---|
| POST | `/transactions` | Create a transaction |
| GET | `/transactions` | Retrieve transaction history |
| GET | `/transactions/:id` | Retrieve transaction details |
| PATCH | `/transactions/:id` | Update description or reference |

### Analytics

| Method | Endpoint | Description |
|---|---|---|
| GET | `/analytics/overview` | Financial overview |
| GET | `/analytics/monthly` | Monthly analytics |
| GET | `/analytics/wallets` | Wallet-wise analytics |

The monthly analytics endpoint supports `year` and `month` query parameters.

### Audit Logs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/audit-logs` | Retrieve user audit history |

### Health Check

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Check API health |

**Authentication:** Protected endpoints require a JWT access token in the Authorization header.

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 🧪 Testing

ChainLedger includes automated backend tests covering authentication, wallet management, and transaction operations.

Run the test suite from the `Backend
