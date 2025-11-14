// auth.js
// Handles Sign In / Sign Up / Verify for auth.html

import { apiFetch } from './api-client.js';

// ---------- helpers ----------

function saveSession(token, user) {
  try {
    // Main keys used by the rest of the app
    localStorage.setItem('talkpoint_token', token);
    localStorage.setItem('talkpoint_user', JSON.stringify(user));

    // Backward-compat aliases if anything else reads these
    localStorage.setItem('tp_token', token);
    localStorage.setItem('tp_user', JSON.stringify(user));
  } catch (err) {
    console.warn('[auth] failed to save session', err);
  }
}

function showToast(msg) {
  alert(msg); // swap for fancy toast later if you want
}

// ---------- DOM refs ----------

// Tabs
const signinTab = document.getElementById('signinTab');
const signupTab = document.getElementById('signupTab');
const verifyTabBtn = document.getElementById('verifyTabBtn');

// Panels
const signinPanel = document.getElementById('signinPanel');
const signupPanel = document.getElementById('signupPanel');
const verifyPanel = document.getElementById('verifyPanel');

// Inline switches
const modeSwitchButtons = document.querySelectorAll('[data-mode-switch]');

// Sign in fields
const signinEmail = document.getElementById('signinEmail');
const signinPassword = document.getElementById('signinPassword');
const btnSignin = document.getElementById('btnSignin');

// Sign up fields
const signupEmail = document.getElementById('signupEmail');
const signupUsername = document.getElementById('signupUsername');
const signupPassword = document.getElementById('signupPassword');
const btnSignup = document.getElementById('btnSignup');

// Verify fields
const verifyEmail = document.getElementById('v_email');
const verifyCode = document.getElementById('v_code');
const btnVerify = document.getElementById('btnVerify');

// ---------- tab logic ----------

const tabs = [signinTab, signupTab, verifyTabBtn];
const panelsByMode = {
  signin: signinPanel,
  signup: signupPanel,
  verify: verifyPanel,
};

function switchTab(mode) {
  console.log('[auth] switchTab ->', mode);

  tabs.forEach((tab) => {
    if (!tab) return;
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });

  Object.entries(panelsByMode).forEach(([key, panel]) => {
    if (!panel) return;
    panel.classList.toggle('active', key === mode);
  });
}

// Tab buttons
tabs.forEach((tab) => {
  if (!tab) return;
  tab.addEventListener('click', () => {
    const mode = tab.dataset.mode;
    switchTab(mode);
  });
});

// Inline "Create account" / "Sign in instead"
modeSwitchButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const mode = btn.getAttribute('data-mode-switch');
    switchTab(mode);
  });
});

// Default tab
switchTab('signin');

// ---------- AUTH CALLS (using apiFetch) ----------

// NOTE: apiFetch already prefixes `/api`, so we pass
// paths like `/auth/signin`, not `/api/auth/...`

// Sign In
btnSignin?.addEventListener('click', async () => {
  console.log('[auth] Sign In clicked');

  const email = (signinEmail?.value || '').trim();
  const password = signinPassword?.value || '';

  if (!email || !password) {
    return showToast('Email and password are required.');
  }

  try {
    const res = await apiFetch('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) throw new Error(res.error || 'Failed to sign in.');

    saveSession(res.token, res.user);
    window.location.href = 'feed.html';
  } catch (err) {
    console.error('[auth] signin error', err);
    showToast(err.message || 'Failed to sign in.');
  }
});

// Sign Up
btnSignup?.addEventListener('click', async () => {
  console.log('[auth] Sign Up clicked');

  const email = (signupEmail?.value || '').trim();
  const username = (signupUsername?.value || '').trim();
  const password = signupPassword?.value || '';

  if (!email || !username || !password) {
    return showToast('Email, username, and password are required.');
  }

  try {
    const res = await apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    });

    if (!res.ok) throw new Error(res.error || 'Failed to sign up.');

    showToast('Account created. Check your email/code to verify.');

    // Pre-fill verify email + switch to verify tab
    if (verifyEmail) verifyEmail.value = email;
    switchTab('verify');
  } catch (err) {
    console.error('[auth] signup error', err);
    showToast(err.message || 'Failed to sign up.');
  }
});

// Verify Email
btnVerify?.addEventListener('click', async () => {
  console.log('[auth] Verify clicked');

  const email = (verifyEmail?.value || '').trim();
  const code = (verifyCode?.value || '').trim();

  if (!email || !code) {
    return showToast('Email and verification code are required.');
  }

  try {
    const res = await apiFetch('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });

    if (!res.ok) throw new Error(res.error || 'Failed to verify email.');

    saveSession(res.token, res.user);
    window.location.href = 'feed.html';
  } catch (err) {
    console.error('[auth] verify error', err);
    showToast(err.message || 'Failed to verify email.');
  }
});