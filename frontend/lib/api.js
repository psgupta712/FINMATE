const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getToken = () => {
  if (typeof window !== 'undefined') return localStorage.getItem('finMate_token');
  return null;
};

const headers = (extra = {}) => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
  ...extra,
});

const handle = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
};

// ── AUTH ──────────────────────────────────────────────────────────
export const authAPI = {
  signup: (body) => fetch(`${BASE_URL}/auth/signup`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
  login: (body) => fetch(`${BASE_URL}/auth/login`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
  me: () => fetch(`${BASE_URL}/auth/me`, { headers: headers() }).then(handle),
  updateProfile: (body) => fetch(`${BASE_URL}/auth/profile`, { method: 'PATCH', headers: headers(), body: JSON.stringify(body) }).then(handle),
};

// ── DASHBOARD ─────────────────────────────────────────────────────
export const dashboardAPI = {
  get: () => fetch(`${BASE_URL}/dashboard`, { headers: headers() }).then(handle),
};

// ── TRANSACTIONS ──────────────────────────────────────────────────
export const transactionsAPI = {
  add: (body) => fetch(`${BASE_URL}/transactions`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${BASE_URL}/transactions?${q}`, { headers: headers() }).then(handle);
  },
  summary: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${BASE_URL}/transactions/summary?${q}`, { headers: headers() }).then(handle);
  },
  delete: (id) => fetch(`${BASE_URL}/transactions/${id}`, { method: 'DELETE', headers: headers() }).then(handle),
};

// ── BUDGET ────────────────────────────────────────────────────────
export const budgetAPI = {
  set: (body) => fetch(`${BASE_URL}/budgets`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
  get: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${BASE_URL}/budgets?${q}`, { headers: headers() }).then(handle);
  },
};

// ── GOALS ─────────────────────────────────────────────────────────
export const goalsAPI = {
  create: (body) => fetch(`${BASE_URL}/goals`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
  list: () => fetch(`${BASE_URL}/goals`, { headers: headers() }).then(handle),
  addSavings: (id, amount) => fetch(`${BASE_URL}/goals/${id}/add-savings`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ amount }) }).then(handle),
  delete: (id) => fetch(`${BASE_URL}/goals/${id}`, { method: 'DELETE', headers: headers() }).then(handle),
};

// ── WALLET ────────────────────────────────────────────────────────
export const walletAPI = {
  balance: () => fetch(`${BASE_URL}/wallet/balance`, { headers: headers() }).then(handle),
  history: () => fetch(`${BASE_URL}/wallet/history`, { headers: headers() }).then(handle),
};

// ── PAYMENTS ──────────────────────────────────────────────────────
export const paymentsAPI = {
  createOrder: (amount) => fetch(`${BASE_URL}/payments/create-order`, { method: 'POST', headers: headers(), body: JSON.stringify({ amount }) }).then(handle),
  verify: (body) => fetch(`${BASE_URL}/payments/verify`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
  history: () => fetch(`${BASE_URL}/payments/history`, { headers: headers() }).then(handle),
};

// ── SUBSCRIPTIONS ─────────────────────────────────────────────────
export const subscriptionsAPI = {
  plans: () => fetch(`${BASE_URL}/subscriptions/plans`).then(handle),
  status: () => fetch(`${BASE_URL}/subscriptions/status`, { headers: headers() }).then(handle),
  createOrder: (plan) => fetch(`${BASE_URL}/subscriptions/create-order`, { method: 'POST', headers: headers(), body: JSON.stringify({ plan }) }).then(handle),
  verify: (body) => fetch(`${BASE_URL}/subscriptions/verify`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
};

// ── CHATBOT ───────────────────────────────────────────────────────
export const chatbotAPI = {
  message: (message) => fetch(`${BASE_URL}/chatbot/message`, { method: 'POST', headers: headers(), body: JSON.stringify({ message }) }).then(handle),
};

// ── RAZORPAY CHECKOUT HELPER ──────────────────────────────────────
export const openRazorpayCheckout = ({ orderId, amount, keyId, name, description, prefill, onSuccess, onFailure }) => {
  const options = {
    key: keyId,
    amount,
    currency: 'INR',
    name: 'FinMate',
    description,
    order_id: orderId,
    prefill,
    theme: { color: '#6366f1' },
    handler: (response) => onSuccess(response),
    modal: { ondismiss: () => onFailure?.('Payment cancelled') },
  };
  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', (resp) => onFailure?.(resp.error.description));
  rzp.open();
};


// ── STREAKS (add this block to your existing frontend/lib/api.js) ─────────────
export const streaksAPI = {
  me: () => fetch(`${BASE_URL}/streaks/me`, { headers: headers() }).then(handle),
  leaderboard: () => fetch(`${BASE_URL}/streaks/leaderboard`, { headers: headers() }).then(handle),
};