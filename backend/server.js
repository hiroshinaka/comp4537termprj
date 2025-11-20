require('./utils/utils');
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const bcrypt = require('bcrypt');
const saltRounds = 12;

const database = include('database/sqlConnection');
const db_users = include('database/dbQueries/userQuery');

const app = express();
const port = process.env.PORT || 5000;

// Allow JSON bodies (used when frontend sends pasted resume text)
app.use(express.json());

// When deployed behind a proxy (Vercel/Render) we should trust the proxy so
// secure cookies and other TLS-related behavior work correctly.
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// CORS Configuration for localhost (dev) and Vercel (production)
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001', 
    process.env.VERCEL_FRONTEND,
].filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        //For Postman testing
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            // In development, allow any localhost origin
            if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost')) {
                callback(null, true);
            } else {
                console.warn(`CORS blocked request from origin: ${origin}`);
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));

const expireTime = '1h'; // JWT expiration time

const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret-CHANGE-THIS';
if (!process.env.JWT_SECRET) {
    console.warn('WARNING: JWT_SECRET not set in .env file. Using default (insecure for production)');
} else {
    console.log('✓ JWT_SECRET loaded from .env');
}

app.use(express.urlencoded({extended: false}));
app.use(cookieParser());

app.get('/', (req,res) => {
    res.json({ message: "Welcome to the API root." });
});


app.get('/createUser', (req,res) => {
    res.json({ message: "Create user page (not implemented in API mode)" });
});


app.get('/login', (req,res) => {
    res.json({ message: "Login page (not implemented in API mode)" });
});

app.post('/submitUser', async (req,res) => {
    const username = req.body.username;
    const password = req.body.password;

    console.log('/submitUser received body:', { username: username ? '[REDACTED]' : username });

    if (!username || !password) {
        res.status(400).json({ error: 'Missing username or password' });
        return;
    }

    const hashedPassword = bcrypt.hashSync(password, saltRounds);

    try {
        const created = await db_users.createUser({ user: username, hashedPassword: hashedPassword });
        // createUser returns the created user row on success
        if (created) {
            // Generate JWT token for auto-login after signup
            const token = jwt.sign(
                { username: created.username, user_id: created.id, user_type: created.type },
                JWT_SECRET,
                { expiresIn: expireTime }
            );

            // Set httpOnly cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: 60 * 60 * 1000 // 1 hour
            });

            res.json({ success: true, username: created.username });
            return;
        }
        res.status(500).json({ error: 'Failed to create user (unknown error).' });
    } catch (err) {
        console.error('/submitUser error:', err && (err.code || err.sqlMessage || err.message) || err);
        res.status(500).json({ error: 'Failed to create user. ' + (err && (err.code || err.message) ? String(err.code || err.message) : '') });
    }

});
app.post('/signout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    res.json({ success: true, message: "Signed out." });
});


app.post('/loggingin', async (req,res) => {
    const reqOrigin = req.headers.origin;
    if (reqOrigin) {
        res.setHeader('Access-Control-Allow-Origin', reqOrigin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    try {
        const username = req.body.username;
        const password = req.body.password;
        console.log('/loggingin attempt for user:', username ? '[REDACTED]' : username);

        const user = await db_users.getUser({ user: username });

        if (user) {
            if (bcrypt.compareSync(password, user.password)) {
                // Generate JWT token
                const token = jwt.sign(
                    { username: user.username, user_id: user.id, user_type: user.type },
                    JWT_SECRET,
                    { expiresIn: expireTime }
                );

                res.cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                    maxAge: 60 * 60 * 1000 // 1 hour
                });

                res.json({ success: true, message: 'Logged in', username });
                return;
            }
            console.log('invalid password for user');
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        console.log('user not found');
        res.status(401).json({ error: 'User not found' });
        return;
    } catch (err) {
        console.error('/loggingin error:', err && (err.message || err));
        res.status(500).json({ error: 'Server error during login', detail: err && err.message ? err.message : String(err) });
    }
});




// JWT Authentication Middleware
function authenticateToken(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (err) {
        console.error('JWT verification failed:', err.message);
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
}

function isAdmin(req) {
    return req.user && req.user.user_type === 'admin';
}

function adminAuthorization(req, res, next) {
    if (!isAdmin(req)) {
        return res.status(403).json({ error: "Not Authorized" });
    }
    next();
}

app.use('/loggedin', authenticateToken);
app.use('/loggedin/admin', adminAuthorization);

app.get('/loggedin', (req,res) => {
    res.json({ message: "Logged in (protected route)", user: req.user });
});

// Verify current user from JWT token
app.get('/me', authenticateToken, (req, res) => {
    res.json({ 
        success: true, 
        user: {
            username: req.user.username,
            user_id: req.user.user_id,
            user_type: req.user.user_type
        }
    });
});


app.get('/api', authenticateToken, (req,res) => {
	const user_type = req.user.user_type;
	console.log("api hit ");

	const jsonResponse = {
		success: true,
		data: null,
		date: new Date()
	};

	if (typeof id === 'undefined') {
		if (user_type === "admin") {
			jsonResponse.data = ["A","B","C","D"];
		}
		else {
			jsonResponse.data = ["A","B"];
		}
	}
	else {
		if (!isAdmin(req)) {
			jsonResponse.success = false;
			res.status(403);  //403 == good user, but, user should not have access
			res.json(jsonResponse);
			return;
		}
		jsonResponse.success = true;
		jsonResponse.data = [id + " - details"];
	}

	res.json(jsonResponse);

});

app.use(express.static(__dirname + "/public"));

// File upload + analysis
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { extractTextFromFile } = include('utils/documentParser');

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB

app.post('/analyze', upload.single('resume'), async (req, res) => {
    try {
        const jobText = req.body.job || req.body.jobText || '';

        let extractedText = '';

        if (req.file) {
            // File upload path
            const filePath = req.file.path;
            const mime = req.file.mimetype;
            const originalName = req.file.originalname;
            extractedText = await extractTextFromFile(filePath, mime, originalName);
            // Optionally remove tmp file after extraction
            // fs.unlinkSync(filePath);
        } else if (req.body && (req.body.resume || req.body.resumeText)) {
            // Pasted text path
            extractedText = req.body.resume || req.body.resumeText || '';
        } else {
            return res.status(400).json({ error: 'No resume provided (file or pasted text).' });
        }

        // TODO: pass extractedText and jobText to analysis pipeline (AI, DB, etc.)

        res.json({ success: true, extractedText, job: jobText });
    } catch (err) {
        console.error('/analyze error:', err && (err.message || err));
        res.status(500).json({ error: 'Failed to analyze resume', detail: err && err.message ? err.message : String(err) });
    }
});

// Simple DB status endpoint to help diagnose connectivity issues
app.get('/dbstatus', async (req, res) => {
    try {
        const [rows] = await database.query('SELECT 1 AS ok');
        res.json({ ok: true, result: rows });
    } catch (err) {
        console.error('/dbstatus error:', err && (err.code || err.message) || err);
        res.status(500).json({ ok: false, error: err && (err.code || err.message) ? String(err.code || err.message) : 'DB error' });
    }
});

app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
  });

app.listen(port, () => console.log(`API running on port ${port}`));
