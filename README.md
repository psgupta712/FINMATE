# 💰 FinBot — Personal Finance Bot for Students

> An AI-powered financial assistant built for students. Track expenses, set saving goals, chat with an AI advisor, and manage a real wallet with Razorpay payments.

---

## 🚀 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, React 18, CSS Variables |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Payments | Razorpay (wallet top-up + subscriptions) |
| Security | Helmet, CORS, signature verification |

---

## 📁 Project Structure

```
finbot/
├── backend/
│   ├── server.js              # Express entry point
│   ├── models/
│   │   ├── User.js
│   │   ├── Transaction.js
│   │   ├── Budget.js
│   │   ├── Goal.js
│   │   ├── Wallet.js
│   │   ├── Payment.js
│   │   └── Subscription.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── transactions.js
│   │   ├── budgets.js
│   │   ├── goals.js
│   │   ├── wallet.js
│   │   ├── payments.js
│   │   ├── subscriptions.js
│   │   ├── chatbot.js
│   │   └── dashboard.js
│   ├── middleware/
│   │   └── auth.js            # JWT protect + premiumOnly
│   └── .env.example
│
└── frontend/
    ├── app/
    │   ├── layout.js
    │   ├── globals.css
    │   ├── page.js            # Redirects to /dashboard
    │   ├── auth/login/page.js
    │   ├── dashboard/page.js
    │   ├── transactions/page.js
    │   ├── budget/page.js
    │   ├── goals/page.js
    │   ├── wallet/page.js
    │   ├── chatbot/page.js
    │   └── subscription/page.js
    ├── components/
    │   └── layout/
    │       ├── Sidebar.js
    │       └── AuthGuard.js
    └── lib/
        ├── api.js             # All API calls + Razorpay helper
        └── auth.js            # Auth context (login/signup/logout)
```

---

## ⚙️ Setup & Installation

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd finbot

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### 2. Configure Backend `.env`

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/finbot
JWT_SECRET=your_super_secret_key_change_this
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Configure Frontend `.env.local`

```bash
cd frontend
cp .env.example .env.local
```

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 4. Get Razorpay Test Keys

1. Sign up at [razorpay.com](https://razorpay.com)
2. Dashboard → Settings → API Keys → Generate Test Key
3. Copy `Key ID` and `Key Secret` to backend `.env`

### 5. Run the Project

```bash
# Terminal 1 — Backend
cd backend
npm run dev   # needs nodemon: npm i -g nodemon

# Terminal 2 — Frontend
cd frontend
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health check: http://localhost:5000/health

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PATCH | `/api/auth/profile` | Update profile |

### Transactions
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/transactions` | Add income/expense |
| GET | `/api/transactions` | List with filters |
| GET | `/api/transactions/summary` | Monthly summary |
| DELETE | `/api/transactions/:id` | Delete transaction |

### Budget
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/budgets` | Create/update budget |
| GET | `/api/budgets` | Get monthly budget |

### Goals
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/goals` | Create goal |
| GET | `/api/goals` | List all goals |
| PATCH | `/api/goals/:id/add-savings` | Add savings to goal |
| DELETE | `/api/goals/:id` | Delete goal |

### Wallet
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/wallet/balance` | Get balance |
| GET | `/api/wallet/history` | Transaction history |

### Payments (Razorpay)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/payments/create-order` | Create Razorpay order |
| POST | `/api/payments/verify` | Verify & credit wallet |
| POST | `/api/payments/webhook` | Razorpay webhook handler |
| GET | `/api/payments/history` | Payment history |

### Subscriptions
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/subscriptions/plans` | List plans |
| GET | `/api/subscriptions/status` | Current subscription |
| POST | `/api/subscriptions/create-order` | Create payment order |
| POST | `/api/subscriptions/verify` | Verify & activate |

### Chatbot & Dashboard
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chatbot/message` | Send AI message |
| GET | `/api/dashboard` | Full dashboard data |

---

## 💳 Razorpay Payment Flow

```
User clicks "Add Money"
       ↓
POST /api/payments/create-order  →  Razorpay creates order
       ↓
Frontend opens Razorpay Checkout modal
       ↓
User pays (UPI / Card / Net Banking)
       ↓
POST /api/payments/verify  (with signature)
       ↓
Backend verifies HMAC signature
       ↓
Wallet balance credited ✅
```

**Test Cards for Razorpay Sandbox:**
- Card: `4111 1111 1111 1111`
- Expiry: Any future date
- CVV: Any 3 digits
- UPI: `success@razorpay`

---

## 🔐 Security Features

- ✅ JWT authentication on all protected routes
- ✅ Razorpay HMAC signature verification
- ✅ Webhook validation with secret
- ✅ Helmet.js security headers
- ✅ CORS restricted to frontend origin
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ Payment deduplication (status check)
- ✅ Never trust frontend payment success alone

---

## 🌐 Deployment

### Backend (Render / Railway)
```bash
# Set environment variables in dashboard
# Build command: npm install
# Start command: node server.js
```

### Frontend (Vercel)
```bash
# Connect GitHub repo
# Set NEXT_PUBLIC_API_URL to your deployed backend URL
```

### MongoDB (Atlas)
1. Create cluster at mongodb.com/cloud/atlas
2. Whitelist IPs
3. Replace MONGO_URI with Atlas connection string

---

## 📈 Subscription Plans

| Feature | Free | Premium (₹99/mo) |
|---|---|---|
| Expense tracking | ✅ | ✅ |
| Budget creation | ✅ | ✅ |
| Savings goals | 3 max | Unlimited |
| AI chatbot | Basic | Advanced |
| Financial insights | ❌ | ✅ |
| PDF/CSV reports | ❌ | ✅ |
| Smart alerts | ❌ | ✅ |

---

## 🤖 Chatbot Capabilities

The AI chatbot understands:
- **Financial queries**: "How much did I spend?", "What's my savings rate?"
- **Education**: "Explain UPI", "What's a credit card?", "How to invest as a student?"
- **Goal tracking**: "What are my savings goals?"
- **Wallet**: "What's my balance?"
- **Tips**: "Give me money saving advice"

---

## 🧪 Testing Payments

Use Razorpay test mode:
- All transactions are simulated — no real money moves
- Use test credentials from Razorpay dashboard
- UPI test ID: `success@razorpay` for success, `failure@razorpay` for failure

---

## 📄 License

MIT — Free to use for educational and personal projects.
