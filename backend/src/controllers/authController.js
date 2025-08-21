// backend/src/controllers/authController.js
const db = require('../config/db');
const jwt = require('jsonwebtoken');

// Ganti dengan secret key yang kuat
const jwtSecret = 'mysecretkey123'; 

exports.register = (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Username and password are required.');
    }

    db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], (error, results) => {
        if (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).send('Username already exists.');
            }
            console.error(error);
            return res.status(500).send('Server error.');
        }
        res.status(201).send('User registered successfully.');
    });
};

exports.login = (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Username and password are required.');
    }

    // Ubah query untuk membandingkan langsung dengan password
    db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).send('Server error.');
        }
        if (results.length === 0) {
            return res.status(401).send('Invalid username or password.');
        }

        const user = results[0];
        const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '1h' });
        res.json({ token, userId: user.id });
    });
};

exports.authenticateToken = (req, res, next) => {
    // Kode ini tidak berubah
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) return res.sendStatus(403);
        req.userId = user.id;
        next();
    });
};