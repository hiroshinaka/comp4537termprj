// mongoStoreConnection.js (or inline)
const MongoStore = require('connect-mongo');
require('dotenv').config();

const host   = process.env.MONGODB_HOST?.trim();
const user   = process.env.MONGODB_USER?.trim();
const pass   = process.env.MONGODB_PASSWORD ?? '';
const dbName = (process.env.MONGODB_DBNAME || 'sessions').trim();

const mongoStore = MongoStore.create({
  mongoUrl: `mongodb+srv://${host}/${dbName}?retryWrites=true&w=majority`,
  dbName,
  mongoOptions: {
    auth: { username: user, password: pass }   // avoids URL-encoding issues
  },
  crypto: { secret: process.env.MONGODB_SESSION_SECRET }
});

module.exports = mongoStore;
