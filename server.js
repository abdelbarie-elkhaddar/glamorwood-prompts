// server.js — Artwork Scene Prompts API
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join('/app/data', 'prompts.json');
const APP_PASSWORD = process.env.APP_PASSWORD || 'changeme';

app.use(express.json({ limit: '10mb' }));

// ── Auth helpers ──────────────────────────────────────
function makeToken(password) {
  return crypto.createHmac('sha256', password).update('prompts-auth-v1').digest('hex');
}

function parseCookies(req) {
  const cookies = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=');
    if (k) cookies[k.trim()] = v.join('=').trim();
  });
  return cookies;
}

function isAuthenticated(req) {
  const expected = makeToken(APP_PASSWORD);
  // Check Authorization header (localStorage-based)
  const authHeader = req.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ') && authHeader.slice(7) === expected) return true;
  // Fallback: cookie
  const { auth_token } = parseCookies(req);
  return auth_token === expected;
}

function requireAuth(req, res, next) {
  if (isAuthenticated(req)) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// ── Login / Logout ────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if (password === APP_PASSWORD) {
    const token = makeToken(APP_PASSWORD);
    const maxAge = 60 * 60 * 24 * 30; // 30 days
    res.setHeader('Set-Cookie', `auth_token=${token}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=${maxAge}`);
    res.json({ ok: true, token });
  } else {
    res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
  }
});

app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'auth_token=; HttpOnly; Path=/; Max-Age=0');
  res.json({ ok: true });
});

// ── Data helpers ──────────────────────────────────────
function readData() {
  if (!fs.existsSync(DATA_FILE)) return { scenes: [], nextId: 100 };
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ── Protected API ─────────────────────────────────────
app.get('/api/scenes', requireAuth, (req, res) => {
  try { res.json(readData()); }
  catch (e) { res.status(500).json({ error: 'Failed to read data' }); }
});

app.post('/api/scenes', requireAuth, (req, res) => {
  try {
    const { scenes, nextId } = req.body;
    if (!Array.isArray(scenes)) return res.status(400).json({ error: 'Invalid data' });
    writeData({ scenes, nextId: nextId || 100 });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Failed to write data' }); }
});

// ── Static files ──────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Artwork Prompts running on port ${PORT}`);
});
