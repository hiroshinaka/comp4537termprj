const db_users = include('database/dbQueries/userQuery');

const FREE_REQUESTS = Number(process.env.FREE_REQUESTS) || 20;

async function trackUsage(req, res, next) {
  try {
    const user = req.user;
    if (!user || !user.user_id) return next();

    const method = req.method;
    const endpoint = req.path;

    await db_users.incrementApiUsage({ user_id: user.user_id, method, endpoint });
    const total = await db_users.getUserTotalRequests(user.user_id);
    req.usage = {
      totalRequests: total,
      freeLimit: FREE_REQUESTS,
      overFreeLimit: total > FREE_REQUESTS,
    };
  } catch (err) {
    console.error('trackUsage error:', err && (err.message || err));
  }
  next();
}

module.exports = { trackUsage, FREE_REQUESTS };
