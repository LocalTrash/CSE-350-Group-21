// api-client.js
// Shared API helper for auth, feed, and create-post pages

const API_BASE = 'http://localhost:3000/api';

// Use multiple keys so old/new code both work
const TOKEN_KEYS = ['talkpoint_token', 'tp_token', 'token'];
const USER_KEYS  = ['talkpoint_user', 'tp_user', 'user'];

// ---- token helpers ----
export function getToken() {
  for (const key of TOKEN_KEYS) {
    const val = localStorage.getItem(key);
    if (val) return val;
  }
  return null;
}

export function saveSession(token, user) {
  try {
    TOKEN_KEYS.forEach(k => localStorage.setItem(k, token));
    USER_KEYS.forEach(k => localStorage.setItem(k, JSON.stringify(user || {})));
  } catch (err) {
    console.warn('[api] failed to save session', err);
  }
}

export function clearSession() {
  try {
    TOKEN_KEYS.forEach(k => localStorage.removeItem(k));
    USER_KEYS.forEach(k => localStorage.removeItem(k));
  } catch (err) {
    console.warn('[api] failed to clear session', err);
  }
}

// ---- auth guard ----
export function requireAuth() {
  const token = getToken();
  if (!token) {
    console.warn('[api] missing token, redirecting to auth.html');
    window.location.href = 'auth.html';
  }
}

// ---- main fetch wrapper ----
export async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let data = {};
  try {
    data = await res.json();
  } catch (_) {
    // ignore non-JSON bodies
  }

  if (!res.ok) {
    // normalize error shape
    return {
      ok: false,
      status: res.status,
      ...data,
    };
  }

  return {
    ok: true,
    ...data,
  };
}