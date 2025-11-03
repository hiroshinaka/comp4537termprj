let createUser = async (pool, username, password, role_id = 2) => {
  const [result] = await pool.query(
      'INSERT INTO user (username, password_hash, role_id) VALUES (?, ?, ?)',
      [username, password, role_id]
  );

  const insertId = result.insertId;
  const [rows] = await pool.query(
      'SELECT id, username, role_id FROM user WHERE id = ?',
      [insertId]
  );

  if (!rows.length) {
      throw new Error('Failed to retrieve created user');
  }

  return rows[0];
};

let getUserByUsername = async(pool, username) => {
  const [rows] = await pool.query(
      'SELECT id, username FROM user WHERE username = ?',
      [username]
  );

  if (!rows.length) {
      return null;
  }

  return rows[0];
}

let getUserWithPassword = async (pool, username) => {
  const [rows] = await pool.query(
      'SELECT id, username, password_hash, role_id FROM user WHERE username = ?',
      [username]
  );

  if (!rows.length) {
      return null;
  }

  return rows[0];
}

let updateUserImage = async (pool, userId, imageUrl) => {
  const [result] = await pool.query(
      'UPDATE user SET image_url = ? WHERE id = ?',
      [imageUrl, userId]
  );

  const [rows] = await pool.query('SELECT id, username, role_id, image_url FROM user WHERE id = ?', [userId]);
  if (!rows.length) return null;
  return rows[0];
}

module.exports = { createUser, getUserByUsername, getUserWithPassword, updateUserImage };