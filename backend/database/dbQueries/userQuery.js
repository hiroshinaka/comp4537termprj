const db = require('../sqlConnection'); // mysql2/promise pool

const USERS = 'users';
const LLM = 'llm_interactions';

/** 
 * Query to create a user 
 * */
async function createUser({ user, hashedPassword, email = null, role = 'user' }) {
  try {
    const [result] = await db.query(
      `INSERT INTO ${USERS} (username, password_hash, role, is_active)
       VALUES (?, ?, ?, TRUE)`,
      [user, hashedPassword, role]
    );
    const id = result.insertId;

    const [rows] = await db.query(
      `SELECT 
         user_id AS id,
         username,
         password_hash AS password,  -- alias for server bcrypt.compare
         role AS type,
         is_active
       FROM ${USERS}
       WHERE user_id = ?`,
      [id]
    );
    return rows[0] || null;
  } catch (err) {
    console.error('createUser error:', err);
    throw err;
  }
}

/** 
 * List users 
 * */
async function getUsers() {
  const [rows] = await db.query(
    `SELECT user_id AS id, username, role AS type, is_active
     FROM ${USERS}
     ORDER BY user_id`
  );
  return rows;
}

/** Get one user by username (for login) */
async function getUser({ user }) {
  const [rows] = await db.query(
    `SELECT 
       user_id AS id,
       username,
       password_hash AS password,  -- server expects .password
       role AS type,               -- server expects .type
       is_active
     FROM ${USERS}
     WHERE username = ?
     LIMIT 1`,
    [user]
  );
  return rows[0] || null;
}

/** Optional: deactivate user */
async function deactivateUser(id) {
  const [res] = await db.query(
    `UPDATE ${USERS} SET is_active = FALSE WHERE user_id = ?`,
    [id]
  );
  return res.affectedRows === 1;
}

/** ---- LLM interaction helpers (matches llm_interactions) ---- */

/** Log an LLM interaction */
async function logLlmInteraction({ user_id, user_input, llm_output }) {
  const [res] = await db.query(
    `INSERT INTO ${LLM} (user_id, user_input, llm_output)
     VALUES (?, ?, ?)`,
    [user_id, user_input, llm_output]
  );
  return res.insertId;
}

/** Get a user's recent interactions */
async function getLlmInteractionsByUser(user_id, limit = 50) {
  const [rows] = await db.query(
    `SELECT interaction_id, user_id, user_input, llm_output, created_at
     FROM ${LLM}
     WHERE user_id = ?
     ORDER BY interaction_id DESC
     LIMIT ?`,
    [user_id, Number(limit)]
  );
  return rows;
}

// --- API Usage helpers -------------------------------------------------
// These helpers update/return usage statistics. They expect the
// `api_usage` and `user_usage` tables to exist. The server will create
// them on startup if missing.

async function incrementApiUsage({ user_id, method, endpoint }) {
  // upsert per-user per-endpoint counter
  await db.query(
    `INSERT INTO api_usage (user_id, method, endpoint, counts, last_called)
     VALUES (?, ?, ?, 1, NOW())
     ON DUPLICATE KEY UPDATE counts = counts + 1, last_called = NOW()`,
    [user_id, method, endpoint]
  );

  // update aggregate per-user total
  await db.query(
    `INSERT INTO user_usage (user_id, total_requests, last_called)
     VALUES (?, 1, NOW())
     ON DUPLICATE KEY UPDATE total_requests = total_requests + 1, last_called = NOW()`,
    [user_id]
  );
}

async function incrementUserTotalRequests(user_id) {
  await db.query(
    `INSERT INTO user_usage (user_id, total_requests, last_called)
     VALUES (?, 1, NOW())
     ON DUPLICATE KEY UPDATE total_requests = total_requests + 1, last_called = NOW()`,
    [user_id]
  );
}

async function getUserTotalRequests(user_id) {
  const [rows] = await db.query(`SELECT total_requests FROM user_usage WHERE user_id = ?`, [user_id]);
  return rows && rows[0] ? rows[0].total_requests : 0;
}

async function getEndpointStats() {
  const [rows] = await db.query(`
    SELECT method, endpoint, SUM(counts) AS requests
    FROM api_usage
    GROUP BY method, endpoint
    ORDER BY requests DESC
  `);
  return rows;
}

async function getUserStats() {
  const [rows] = await db.query(`
    SELECT u.user_id AS user_id, u.username AS username, u.email AS email, IFNULL(us.total_requests,0) AS total_requests
    FROM users u
    LEFT JOIN user_usage us ON us.user_id = u.user_id
    ORDER BY total_requests DESC
  `);
  return rows;
}

module.exports = {
  createUser,
  getUsers,
  getUser,
  deactivateUser,
  logLlmInteraction,
  getLlmInteractionsByUser,
  // exported usage helpers
  incrementApiUsage,
  incrementUserTotalRequests,
  getUserTotalRequests,
  getEndpointStats,
  getUserStats,
};
