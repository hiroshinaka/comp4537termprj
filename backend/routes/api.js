const express = require('express');
const router = express.Router();

const db_users = include('database/dbQueries/userQuery');
const { authenticateToken, adminAuthorization } = include('middleware/auth');
const { trackUsage, FREE_REQUESTS } = include('middleware/usage');

// Mount modular routers
const analyzerRouter = require('./analyzer');
const suggestionsRouter = require('./suggestions');

// All routes under /api require authentication and usage tracking
router.use(authenticateToken);
router.use(trackUsage);

// Analyzer + suggestions sub-routers
router.use('/analyzer', analyzerRouter);
router.use('/', analyzerRouter); // legacy: /api/analyze
router.use('/suggestions', suggestionsRouter);

// ---------------------------------------------------------
// Usage summary for current user
// ---------------------------------------------------------
router.get('/me/usage', async (req, res) => {
  try {
    const totalRequests = await db_users.getUserTotalRequests(req.user.user_id);
    res.json({
      success: true,
      usage: {
        totalRequests,
        freeLimit: FREE_REQUESTS,
        overFreeLimit: totalRequests > FREE_REQUESTS,
      },
    });
  } catch (err) {
    console.error('/api/me/usage error:', err && (err.message || err));
    res.status(500).json({ success: false, error: 'Failed to fetch usage' });
  }
});

/**
 * @swagger
 * /api/me/usage:
 *   get:
 *     summary: Get authenticated user's API usage summary
 */

// ---------------------------------------------------------
// Admin stats routes
// ---------------------------------------------------------
router.get('/admin/endpoint-stats', adminAuthorization, async (req, res) => {
  try {
    const rows = await db_users.getEndpointStats();
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('/api/admin/endpoint-stats error:', err && (err.message || err));
    res.status(500).json({ success: false, error: 'Failed to fetch endpoint stats' });
  }
});

router.get('/admin/user-stats', adminAuthorization, async (req, res) => {
  try {
    const rows = await db_users.getUserStats();
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('/api/admin/user-stats error:', err && (err.message || err));
    res.status(500).json({ success: false, error: 'Failed to fetch user stats' });
  }
});

// ---------------------------------------------------------
// NEW: Admin user management routes
//   - GET  /api/admin/users?page=&limit=
//   - PUT  /api/admin/users/:id/role   { role_id }
//   - DELETE /api/admin/users/:id
// ---------------------------------------------------------

// List users with pagination
router.get('/admin/users', adminAuthorization, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const { users, pagination } = await db_users.getUsersPaginated({ page, limit });

    res.json({
      success: true,
      users,
      pagination,
    });
  } catch (err) {
    console.error('/api/admin/users GET error:', err && (err.message || err));
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// Update a user's role
router.put('/admin/users/:id/role', adminAuthorization, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { role_id } = req.body;

    if (!role_id || ![1, 2].includes(Number(role_id))) {
      return res.status(400).json({ success: false, error: 'Invalid role_id (must be 1 or 2)' });
    }

    const ok = await db_users.updateUserRole(userId, Number(role_id));
    if (!ok) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('/api/admin/users/:id/role PUT error:', err && (err.message || err));
    res.status(500).json({ success: false, error: 'Failed to update user role' });
  }
});

// Delete a user
router.delete('/admin/users/:id', adminAuthorization, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);

    const ok = await db_users.deleteUser(userId);
    if (!ok) {
      return res.status(404).json({ success: false, error: 'User not found or already deleted' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('/api/admin/users/:id DELETE error:', err && (err.message || err));
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// ---------------------------------------------------------

module.exports = router;
