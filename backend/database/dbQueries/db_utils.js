const db = require('../sqlConnection');

async function printMySQLVersion() {
  try {
    const [rows] = await db.query('SELECT VERSION() AS v');
    console.log('MySQL version:', rows[0]?.v);
    return true;
  } catch (err) {
    console.error('Error getting MySQL version:', err.message);
    return false;
  }
}

module.exports = { printMySQLVersion };
