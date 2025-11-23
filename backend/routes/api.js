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

/**
 * @swagger
 * /api/me/usage:
 *   get:
 *     summary: Get authenticated user's API usage summary
 *     description: Returns total requests for the authenticated user, free limit, and whether the user is over the free limit.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Usage summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 usage:
 *                   type: object
 *                   properties:
 *                     totalRequests:
 *                       type: integer
 *                     freeLimit:
 *                       type: integer
 *                     overFreeLimit:
 *                       type: boolean
 *       401:
 *         description: Authentication required
 */

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

/**
 * @swagger
 * /api/admin/endpoint-stats:
 *   get:
 *     summary: Get aggregated endpoint usage statistics
 *     description: Returns aggregated counts per HTTP method and endpoint. Admin-only.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of endpoint statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       method:
 *                         type: string
 *                       endpoint:
 *                         type: string
 *                       requests:
 *                         type: integer
 *       403:
 *         description: Not authorized
 */
//
router.get('/admin/user-stats', adminAuthorization, async (req, res) => {
  try {
    const rows = await db_users.getUserStats();
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('/api/admin/user-stats error:', err && (err.message || err));
    res.status(500).json({ success: false, error: 'Failed to fetch user stats' });
  }
});

/**
 * @swagger
 * /api/admin/user-stats:
 *   get:
 *     summary: Get per-user API consumption stats
 *     description: Returns a list of users with their total API request counts. Admin-only.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of user stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       user_id:
 *                         type: integer
 *                       username:
 *                         type: string
 *                       email:
 *                         type: string
 *                       total_requests:
 *                         type: integer
 *       403:
 *         description: Not authorized
 */
// NOTE: analyzer and suggestions endpoints are provided by mounted sub-routers:
//  - POST /api/analyzer/analyze  (file upload or pasted text)
//  - POST /api/analyzer/raw      (raw analyzer proxy)
//  - POST /api/suggestions/suggest (accepts analysis or resume_text + job_text)


module.exports = router;
