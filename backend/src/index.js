// backend/src/index.js
const express = require('express');
const cors = require('cors');
const taskRoutes = require('./routes/taskRoutes');
const authRoutes = require('./routes/authRoutes'); // Tambahkan ini
const db = require('./config/db'); // Tambahkan ini

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Tes koneksi database
db.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Successfully connected to database as id', connection.threadId);
  connection.release();
});

// Gunakan rute yang sudah ada dan rute baru untuk otentikasi
app.use('/api', taskRoutes);
app.use('/api/auth', authRoutes); // Tambahkan ini

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});