require('./utils/utils');
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const multer = require('multer');

const MongoStore = require('./database/mongoStoreConnection');
const bcrypt = require('bcrypt');
const saltRounds = 12;

const database = include('database/sqlConnection');
const db_users = include('database/dbQueries/userQuery');

const app = express();
const port = process.env.PORT || 5000;

// Allow JSON bodies (used when frontend sends pasted resume text)
app.use(express.json());

// When deployed behind a proxy (Render) we should trust the proxy so
// secure cookies and other TLS-related behavior work correctly.
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// Enable CORS for the frontend domain and allow credentials (cookies).
// Default to the Vercel frontend domain you provided; override with CORS_ORIGIN env var if desired.
const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'https://comp4537termprj.vercel.app',
    credentials: true,
};
app.use(require('cors')(corsOptions));


app.use((req, res, next) => {
    const allowed = process.env.CORS_ORIGIN || 'https://comp4537termprj.vercel.app';
    const requestOrigin = req.headers.origin;
    // If allowed is the string 'true', reflect request origin; otherwise use allowed
    if (allowed === 'true' && requestOrigin) {
        res.header('Access-Control-Allow-Origin', requestOrigin);
    } else {
        res.header('Access-Control-Allow-Origin', allowed);
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

const expireTime =  1 * 60 * 60 * 1000 ; //expires after 1 hour  (hours * minutes * seconds * millis)


/* secret information section */
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;
/* END secret section */



app.use(express.urlencoded({extended: false}));

// Configure session with secure cross-site cookie behavior in production.
const sessionOptions = {
    secret: node_session_secret,
    store: MongoStore, // default is memory store
    saveUninitialized: false,
    resave: true,
    cookie: {
        maxAge: expireTime,
        // In production our frontend is on a different origin (Vercel). To allow
        // the browser to send cookies across origins, SameSite must be 'none'
        // and secure must be true (HTTPS required).
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        secure: process.env.NODE_ENV === 'production' ? true : false,
    }
};

app.use(session(sessionOptions));

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
            const results = await db_users.getUsers();
            res.json({ users: results });
            return;
        }
        // If it returns null/false for some reason, treat as server error
        res.status(500).json({ error: 'Failed to create user (unknown error).' });
    } catch (err) {
        console.error('/submitUser error:', err && (err.code || err.sqlMessage || err.message) || err);
        // Provide a friendlier message while including some DB error code to help debugging
        res.status(500).json({ error: 'Failed to create user. ' + (err && (err.code || err.message) ? String(err.code || err.message) : '') });
    }

});
app.post('/signout', (req, res) => {
    // Destroy the session to log the user out
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            res.status(500).json({ error: "Could not sign out. Please try again." });
        } else {
            // Redirect to the home page or login page after signing out
            res.json({ message: "Signed out." });
        }
    });
});


app.post('/loggingin', async (req,res) => {
    // Ensure this route always returns CORS headers for credentialed requests
    const allowedOrigin = process.env.CORS_ORIGIN || 'https://comp4537termprj.vercel.app';
    if (allowedOrigin === 'true' && reqOrigin) {
        res.setHeader('Access-Control-Allow-Origin', "*");
    } 
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    try {
        const username = req.body.username;
        const password = req.body.password;
        console.log('/loggingin attempt for user:', username ? '[REDACTED]' : username);

        const user = await db_users.getUser({ user: username });

        if (user) {
            if (bcrypt.compareSync(password, user.password)) {
                req.session.authenticated = true;
                req.session.user_type = user.type;
                req.session.username = username;
                req.session.cookie.maxAge = expireTime;
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




function isValidSession(req) {
	if (req.session.authenticated) {
		return true;
	}
	return false;
}

function sessionValidation(req, res, next) {
	if (!isValidSession(req)) {
		req.session.destroy();
		res.redirect('/');
		return;
	}
	else {
		next();
	}
}

function isAdmin(req) {
    if (req.session.user_type == 'admin') {
        return true;
    }
    return false;
}

function adminAuthorization(req, res, next) {
	if (!isAdmin(req)) {
        res.status(403);
    res.status(403).json({ error: "Not Authorized" });
        return;
	}
	else {
		next();
	}
}

app.use('/loggedin', sessionValidation);
app.use('/loggedin/admin', adminAuthorization);

app.get('/loggedin', (req,res) => {
    res.json({ message: "Logged in (protected route)" });
});


app.get('/api', (req,res) => {
	var user = req.session.user;
    var user_type = req.session.user_type;
	console.log("api hit ");

	var jsonResponse = {
		success: false,
		data: null,
		date: new Date()
	};

	
	if (!isValidSession(req)) {
		jsonResponse.success = false;
		res.status(401);  //401 == bad user
		res.json(jsonResponse);
		return;
	}

	if (typeof id === 'undefined') {
		jsonResponse.success = true;
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
const { v4: uuidv4 } = require('uuid');
const { extractTextFromFile } = include('utils/documentParser');

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${uuidv4()}-${file.originalname}`),
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
