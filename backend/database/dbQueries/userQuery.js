// backend/database/dbQueries/userQuery.js
const db = require('../sqlConnection'); // mysql2/promise pool

const USERS = 'users';
const LLM = 'llm_interactions';

/** Create a user */
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
    console.error('createUser error:', err.code || err.message);
    return false;
  }
}

/** List users (for your /submitUser page) */
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

module.exports = {
  createUser,
  getUsers,
  getUser,
  deactivateUser,
  logLlmInteraction,
  getLlmInteractionsByUser,
};
