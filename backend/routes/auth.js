const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const db_users = include('database/dbQueries/userQuery');

const saltRounds = 12;
const expireTime = '1h';

const JWT = process.env.JWT_SECRET || 'dev-secret';

// Create user (signup)
router.post('/submitUser', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

  try {
    const hashedPassword = bcrypt.hashSync(password, saltRounds);
    const created = await db_users.createUser({ user: username, hashedPassword, role_id: 2 });
    if (!created) return res.status(500).json({ error: 'Failed to create user' });

    const token = jwt.sign({ username: created.username, user_id: created.user_id || created.id, user_type: 'user' }, JWT, { expiresIn: expireTime });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 60 * 60 * 1000 });
    res.json({ success: true, username: created.username });
  } catch (err) {
    console.error('/submitUser error:', err && (err.message || err));
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/loggingin', async (req, res) => {
  try {
    const username = req.body.username;
    const password = req.body.password;
    if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

    const user = await db_users.getUser({ user: username });
    if (!user) return res.status(401).json({ error: 'User not found' });

    if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });

    const userType = (user.type === 1 || user.type === '1') ? 'admin' : 'user';
    const token = jwt.sign({ username: user.username, user_id: user.user_id || user.id, user_type: userType }, JWT, { expiresIn: expireTime });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 60 * 60 * 1000 });
    res.json({ success: true, message: 'Logged in', username: user.username });
  } catch (err) {
    console.error('/loggingin error:', err && (err.message || err));
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Signout
router.post('/signout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' });
  res.json({ success: true, message: 'Signed out' });
});

// Me - verify token; lightweight check
router.get('/me', (req, res) => {
  const token = req.cookies && req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const decoded = jwt.verify(token, JWT);
    res.json({ success: true, user: { username: decoded.username, user_id: decoded.user_id, user_type: decoded.user_type } });
  } catch (err) {
    console.error('/me token error:', err && err.message);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
