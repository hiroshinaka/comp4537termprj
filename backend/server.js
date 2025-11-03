require('./utils/utils');


require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('./database/mongoStoreConnection');
const bcrypt = require('bcrypt');
const saltRounds = 12;


const database = include('database/sqlConnection');
const db_utils = include('database/dbQueries/db_utils'); 
const db_users = include('database/dbQueries/userQuery');
const success = db_utils.printMySQLVersion();

const port = process.env.PORT || 3000;

const app = express();

const expireTime =  1 * 60 * 60 * 1000 ; //expires after 1 hour  (hours * minutes * seconds * millis)


/* secret information section */
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;
/* END secret section */



app.use(express.urlencoded({extended: false}));

app.use(session({ 
    secret: node_session_secret,
	store: MongoStore, //default is memory store 
	saveUninitialized: false, 
	resave: true
}
));

app.get('/', (req,res) => {
    res.json({ message: "Welcome to the API root." });
});

app.get('/about', (req,res) => {
    var color = req.query.color;
    if (!color) {
        color = "black";
    }

    res.json({ about: true, color });
});


app.get('/createTables', async (req,res) => {

    const create_tables = include('database/create_tables');

    var success = create_tables.createTables();
    if (success) {
        res.json({ message: "Created tables." });
    } else {
        res.status(500).json({ error: "Failed to create tables." });
    }
});

app.get('/createUser', (req,res) => {
    res.json({ message: "Create user page (not implemented in API mode)" });
});


app.get('/login', (req,res) => {
    res.json({ message: "Login page (not implemented in API mode)" });
});

app.post('/submitUser', async (req,res) => {
    var username = req.body.username;
    var password = req.body.password;

    var hashedPassword = bcrypt.hashSync(password, saltRounds);

    var success = await db_users.createUser({ user: username, hashedPassword: hashedPassword });

    if (success) {
        var results = await db_users.getUsers();

        res.json({ users: results });
    } else {
        res.status(500).json({ error: "Failed to create user." });
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
    var username = req.body.username;
    var password = req.body.password;


    var user = await db_users.getUser({ user: username });

    if (user) {
        if (bcrypt.compareSync(password, user.password)) {
            req.session.authenticated = true;
            req.session.user_type = user.type;
            req.session.username = username;
            req.session.cookie.maxAge = expireTime;
            res.json({ success: true, message: "Logged in", username });
            return;
        } else {
            console.log("invalid password");
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }
    } else {
        console.log('user not found');
        res.status(401).json({ error: "User not found" });
        return;
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

app.get('/loggedin/info', (req,res) => {
    res.json({ message: "Logged in info (protected route)" });
});

app.get('/loggedin/admin', (req,res) => {
    res.json({ message: "Admin (protected route)" });
});

app.get('/loggedin/memberinfo', (req,res) => {
    res.json({ username: req.session.username, user_type: req.session.user_type });
});


app.get('/rilla/:id', (req,res) => {
    var rilla = req.params.id;

    res.json({ rilla });
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

app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
  });

app.listen(port, () => {
	console.log("Node application listening on port "+port);
}); 