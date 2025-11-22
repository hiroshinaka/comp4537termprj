const db = require('../sqlConnection');

async function printMySQLVersion() {
  try {
    const [rows] = await db.query('SELECT VERSION() AS v');
    // MySQL version retrieved; avoid logging in production to reduce noise and potential information leakage.
    return true;
  } catch (err) {
    console.error('Error getting MySQL version:', err.message);
    return false;
  }
}

module.exports = { printMySQLVersion };
