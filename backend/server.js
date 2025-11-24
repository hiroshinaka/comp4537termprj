require('./utils/utils');
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const database = include('database/sqlConnection');
const {swaggerUi, swaggerSpec} = require('./swagger');
const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}


const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://comp4537termprj.vercel.app',
  process.env.VERCEL_FRONTEND,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost')) return callback(null, true);
    console.warn(`CORS blocked request from origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  exposedHeaders: ['Set-Cookie'],
};

app.use(cors(corsOptions));

app.get('/', (req, res) => res.json({ message: 'Welcome to the API root.' }));

app.get('/dbstatus', async (req, res) => {
  try {
    const [rows] = await database.query('SELECT 1 AS ok');
    res.json({ ok: true, result: rows });
  } catch (err) {
    console.error('/dbstatus error:', err && (err.code || err.message) || err);
    res.status(500).json({ ok: false, error: err && (err.code || err.message) ? String(err.code || err.message) : 'DB error' });
  }
});

app.use(express.static(__dirname + '/public'));

// Mount API router
const authRouter = require('./routes/auth');
app.use('/', authRouter);

// API routes
const api = require('./routes/api');
app.use('/api', api);


app.post('/analyze', (req, res, next) => {
  req.url = '/analyze';
  api(req, res, next);
});

app.use('/api-docs',swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.listen(port, () => console.log(`API running on port ${port}`));
server.setTimeout(300000);