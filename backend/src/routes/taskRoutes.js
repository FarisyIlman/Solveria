// backend/src/routes/taskRoutes.js
const express = require('express');
const router = express.Router();
const { addTask, editTask, deleteTask, getTasks } = require('../controllers/taskController');
const { authenticateToken } = require('../controllers/authController'); // Tambahkan ini

router.post('/schedule', authenticateToken, addTask);
router.put('/schedule/:id', authenticateToken, editTask);
router.delete('/schedule/:id', authenticateToken, deleteTask);
router.get('/schedule', authenticateToken, getTasks);

module.exports = router;