// backend/src/controllers/authController.js
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const util = require('util');

// Mengubah db.query menjadi Promise
db.query = util.promisify(db.query);

// Gunakan environment variable untuk secret key.
const jwtSecret = process.env.JWT_SECRET || 'your_very_strong_secret_key';

exports.register = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Username dan password harus diisi.');
    }

    try {
        // Simpan password dalam format teks biasa (plain-text)
        await db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, password]);
        res.status(201).send('Pengguna berhasil didaftarkan.');
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).send('Username sudah ada.');
        }
        console.error(error);
        return res.status(500).send('Terjadi kesalahan server.');
    }
};

exports.login = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Username dan password harus diisi.');
    }

    try {
        const results = await db.query('SELECT * FROM users WHERE username = ?', [username]);

        if (!results || results.length === 0) {
            return res.status(401).send('Username atau password salah.');
        }

        const user = results[0];
        // Bandingkan password yang dimasukkan dengan password yang ada di database secara langsung
        if (password !== user.password) {
            return res.status(401).send('Username atau password salah.');
        }

        const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '1h' });
        res.json({ token, userId: user.id });
    } catch (error) {
        console.error(error);
        return res.status(500).send('Terjadi kesalahan server.');
    }
};

exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) return res.sendStatus(403);
        req.userId = user.id;
        next();
    });
};