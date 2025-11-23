const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const db_users = include('database/dbQueries/userQuery');

const saltRounds = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const TOKEN_TTL = '1h';
const COOKIE_MAX_AGE = 60 * 60 * 1000; // 1 hour

function signAndSetCookie(res, payload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',  
  });
}

// ---------------------- SIGNUP ----------------------
router.post('/submitUser', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Missing username or password' });

  try {
    const hashedPassword = bcrypt.hashSync(password, saltRounds);

    const created = await db_users.createUser({
      user: username,
      hashedPassword,
      role_id: 2,
    });

    if (!created) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    const userType = created.type === 1 ? 'admin' : 'user';

    signAndSetCookie(res, {
      username: created.username,
      user_id: created.id,    
      user_type: userType,
    });

    res.json({ success: true, username: created.username });
  } catch (err) {
    console.error('/submitUser error:', err && err.message);
    res.status(500).json({ error: 'Server error during signup' });
  }
});


// ----------------------- LOGIN ----------------------
router.post('/loggingin', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }

    const user = await db_users.getUser({ user: username });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.password) {
      console.error('/loggingin error: user.password is missing');
      return res.status(500).json({ error: 'User record has no stored password' });
    }

    const ok = bcrypt.compareSync(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userType = user.type === 1 ? 'admin' : 'user';

    signAndSetCookie(res, {
      username: user.username,
      user_id: user.id,
      user_type: userType,
    });

    return res.json({ success: true, message: 'Logged in', username: user.username });
  } catch (err) {
    console.error('/loggingin error:', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
});



// ---------------------- SIGNOUT ----------------------
router.post('/signout', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';

  res.clearCookie('token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  });

  res.json({ success: true, message: 'Signed out' });
});

// ------------------------- ME -----------------------
router.get('/me', (req, res) => {
  const token = req.cookies && req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({
      success: true,
      user: {
        username: decoded.username,
        user_id: decoded.user_id,
        user_type: decoded.user_type,
      },
    });
  } catch (err) {
    console.error('/me token error:', err && err.message);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
