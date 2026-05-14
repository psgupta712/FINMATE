// ── STREAKS (add this block to your existing frontend/lib/api.js) ─────────────
export const streaksAPI = {
  me: () => fetch(`${BASE_URL}/streaks/me`, { headers: headers() }).then(handle),
  leaderboard: () => fetch(`${BASE_URL}/streaks/leaderboard`, { headers: headers() }).then(handle),
};