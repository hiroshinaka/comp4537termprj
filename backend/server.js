require('./utils/utils');
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const MongoStore = require('./database/mongoStoreConnection');
const bcrypt = require('bcrypt');
require('dotenv').config();
const saltRounds = 12;

const database = include('database/sqlConnection');
const db_users = include('database/dbQueries/userQuery');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

app.use(session({
  secret: process.env.NODE_SESSION_SECRET,
  store: MongoStore,
  saveUninitialized: false,
  resave: true,
  cookie: {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  const hashed = bcrypt.hashSync(password, saltRounds);
  const success = await db_users.createUser({ user: username, hashedPassword: hashed });
  if (!success) return res.status(500).json({ ok: false });
  res.json({ ok: true });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await db_users.getUser({ user: username });
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ ok: false, error: 'invalid credentials' });
  }
  req.session.authenticated = true;
  req.session.username = username;
  res.json({ ok: true, username });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/session', (req, res) => {
  res.json({ authenticated: !!req.session.authenticated, user: req.session.username || null });
});

app.listen(port, () => console.log(`API running on port ${port}`));
