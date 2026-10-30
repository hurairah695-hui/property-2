require('dotenv').config();
const path = require('path');
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json({ limit: '6mb' }));
// Pages are served by name (not the whole folder) so server.js and .env are never exposed
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'server-login.html')));
app.get('/seller', (req, res) => res.sendFile(path.join(__dirname, 'server-seller.html')));

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
});

const ROLES = ['admin', 'buyer', 'seller'];
const TYPES = ['house', 'apartment', 'shop', 'plot'];

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Try again.' });
  });

function auth(req, res, next) {
  const m = /(?:^|; )token=([^;]+)/.exec(req.headers.cookie || '');
  try {
    req.user = jwt.verify(m && m[1], process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Please sign in.' });
  }
}
function sellerOnly(req, res, next) {
  if (req.user.role !== 'seller') return res.status(403).json({ error: 'Only sellers can do this.' });
  next();
}

// ---------- login / session ----------
app.post('/api/login', async (req, res) => {
  const { email, password, role, remember } = req.body || {};
  if (!email || !password || !ROLES.includes(role)) {
    return res.status(400).json({ error: 'Email, password and role are required.' });
  }
  try {
    const [rows] = await pool.execute(
      'SELECT id, full_name, email, password_hash, role FROM users WHERE email = ? LIMIT 1',
      [email.trim().toLowerCase()]
    );
    const user = rows[0];
    const valid = user && user.role === role && (await bcrypt.compare(password, user.password_hash));
    if (!valid) return res.status(401).json({ error: 'Email, password or role is incorrect.' });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: remember ? '30d' : '8h' });
    const cookie = { httpOnly: true, sameSite: 'lax' };
    if (remember) cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
    res.cookie('token', token, cookie);
    res.json({ user: { id: user.id, name: user.full_name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Try again.' });
  }
});

app.get('/api/me', auth, wrap(async (req, res) => {
  const [rows] = await pool.execute('SELECT id, full_name, email, role FROM users WHERE id = ?', [req.user.id]);
  const u = rows[0];
  if (!u) return res.status(401).json({ error: 'Please sign in.' });
  res.json({ user: { id: u.id, name: u.full_name, email: u.email, role: u.role } });
}));

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

// ---------- properties ----------
app.get('/api/properties', auth, wrap(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT p.id, p.seller_id, p.title, p.type, p.price, p.city, p.area_size, p.beds, p.baths, p.description, p.image,
            EXISTS(SELECT 1 FROM favorites f WHERE f.property_id = p.id AND f.user_id = ?) AS fav
     FROM properties p ORDER BY p.created_at DESC, p.id DESC`,
    [req.user.id]
  );
  res.json({ properties: rows.map((r) => ({ ...r, price: Number(r.price), fav: !!r.fav })) });
}));

app.post('/api/properties', auth, sellerOnly, wrap(async (req, res) => {
  const b = req.body || {};
  const title = String(b.title || '').trim().slice(0, 150);
  const city = String(b.city || '').trim().slice(0, 80);
  const price = Number(b.price);
  if (!title || !city || !TYPES.includes(b.type) || !Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ error: 'Title, type, city and a valid price are required.' });
  }
  let image = null;
  if (b.image) {
    const okImg = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(b.image) && b.image.length < 3e6;
    if (!okImg) return res.status(400).json({ error: 'Photo must be a JPG, PNG or WebP image under 2 MB.' });
    image = b.image;
  }
  const num = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 && n <= 50 ? n : null; };
  const rooms = b.type === 'house' || b.type === 'apartment';
  const [r] = await pool.execute(
    'INSERT INTO properties (seller_id, title, type, price, city, area_size, beds, baths, description, image) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [req.user.id, title, b.type, Math.round(price), city,
     String(b.area_size || '').trim().slice(0, 40) || null,
     rooms ? num(b.beds) : null, rooms ? num(b.baths) : null,
     String(b.description || '').trim().slice(0, 2000) || null, image]
  );
  res.status(201).json({ id: r.insertId });
}));

app.delete('/api/properties/:id', auth, sellerOnly, wrap(async (req, res) => {
  const [r] = await pool.execute('DELETE FROM properties WHERE id = ? AND seller_id = ?', [parseInt(req.params.id, 10), req.user.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Listing not found.' });
  res.json({ ok: true });
}));

// ---------- favourites (toggle) ----------
app.post('/api/properties/:id/favorite', auth, wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const [r] = await pool.execute('DELETE FROM favorites WHERE user_id = ? AND property_id = ?', [req.user.id, id]);
  if (!r.affectedRows) await pool.execute('INSERT INTO favorites (user_id, property_id) VALUES (?, ?)', [req.user.id, id]);
  res.json({ fav: !r.affectedRows });
}));

app.listen(process.env.PORT || 3000, () => {
  console.log('Server running on http://localhost:' + (process.env.PORT || 3000));
});
