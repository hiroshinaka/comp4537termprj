const jwt = require('jsonwebtoken');

// Fallback to a development secret when JWT_SECRET is not set.
// In production you MUST set JWT_SECRET in the environment.
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function authenticateToken(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    console.error('JWT verification failed:', err && err.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function isAdmin(req) {
  return req.user && req.user.user_type === 'admin';
}

function adminAuthorization(req, res, next) {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Not Authorized' });
  next();
}

module.exports = {
  authenticateToken,
  isAdmin,
  adminAuthorization,
};
