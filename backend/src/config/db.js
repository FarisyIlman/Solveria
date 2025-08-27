// backend/src/config/db.js
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost', // Sesuai dengan Laragon Anda
  user: 'root',      // Sesuai dengan Laragon Anda
  password: '',      // Sesuai dengan Laragon Anda (kosong jika tidak ada)
  database: 'solveria_app', // Nama database Anda
  waitForConnections: true,
  connectionLimit: 100,
  queueLimit: 0
});

module.exports = pool;