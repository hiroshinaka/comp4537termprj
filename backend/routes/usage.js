// backend/middleware/usage.js
const db_users = include('database/dbQueries/userQuery');

// Each user gets 20 free "analysis" requests
const FREE_REQUESTS = 20;

async function trackUsage(req, res, next) {
  try {
    const method = req.method || '';
    const path = req.path || '';

    // We only count POST /api/analyze
    // Inside the /api router, this route is '/analyze'
    const isAnalyzeEndpoint = (method === 'POST' && path === '/analyze');

    if (!isAnalyzeEndpoint) {
      return next();
    }

    const user_id = req.user && req.user.user_id;
    if (!user_id) {
      return next();
    }

    await db_users.incrementApiUsage({
      user_id,
      method,
      endpoint: path,
    });

    return next();
  } catch (err) {
    console.error('trackUsage error:', err && (err.code || err.message) || err);
    // Don’t block the request if tracking fails
    return next();
  }
}

module.exports = {
  FREE_REQUESTS,
  trackUsage,
};
