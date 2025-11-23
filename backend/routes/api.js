const express = require('express');
const router = express.Router();

const db_users = include('database/dbQueries/userQuery');

const { extractTextFromFile } = include('utils/documentParser');
const { authenticateToken, adminAuthorization } = include('middleware/auth');
const { trackUsage, FREE_REQUESTS } = include('middleware/usage');
// Mount modular routers
const analyzerRouter = require('./analyzer');
const suggestionsRouter = require('./suggestions');

// All routes under api require authentication and are tracked by default
router.use(authenticateToken);
router.use(trackUsage);

// Mount modular sub-routers under logical paths
// Keep analyzer mounted at both `/analyzer` and root for backward-compatibility
router.use('/analyzer', analyzerRouter);
router.use('/', analyzerRouter); // legacy: /api/analyze -> /api/analyze (from analyzerRouter)
router.use('/suggestions', suggestionsRouter);



router.get('/me/usage', async (req, res) => {
  try {
    const totalRequests = await db_users.getUserTotalRequests(req.user.user_id);
    res.json({ success: true, usage: { totalRequests, freeLimit: FREE_REQUESTS, overFreeLimit: totalRequests > FREE_REQUESTS } });
  } catch (err) {
    console.error('/api/me/usage error:', err && (err.message || err));
    res.status(500).json({ success: false, error: 'Failed to fetch usage' });
  }
});

// Admin routes
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

router.get('/admin/users', adminAuthorization, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await db_users.getUsersPaginated({ page, limit });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('/api/admin/users error:', err && (err.message || err));
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

router.put('/admin/users/:userId/role', adminAuthorization, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { role_id } = req.body;
    
    if (!role_id || (role_id !== 1 && role_id !== 2)) {
      return res.status(400).json({ success: false, error: 'Invalid role_id. Must be 1 (admin) or 2 (user)' });
    }
    
    const updated = await db_users.updateUserRole(userId, role_id);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({ success: true, message: 'User role updated' });
  } catch (err) {
    console.error('/api/admin/users/:userId/role error:', err && (err.message || err));
    res.status(500).json({ success: false, error: 'Failed to update user role' });
  }
});

router.delete('/admin/users/:userId', adminAuthorization, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Prevent admin from deleting themselves
    if (userId === req.user.user_id) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
    }
    
    const deleted = await db_users.deleteUser(userId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    console.error('/api/admin/users/:userId error:', err && (err.message || err));
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// NOTE: analyzer and suggestions endpoints are provided by mounted sub-routers:
//  - POST /api/analyzer/analyze  (file upload or pasted text)
//  - POST /api/analyzer/raw      (raw analyzer proxy)
//  - POST /api/suggestions/suggest (accepts analysis or resume_text + job_text)


module.exports = router;
