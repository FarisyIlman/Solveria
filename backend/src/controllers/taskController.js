// backend/src/controllers/taskController.js
const { spawn } = require('child_process');
const db = require('../config/db');

// Fungsi pembantu untuk menjalankan solver
const runSolverAndSave = (res, allTasks, userId) => {
    const python = spawn('python', ['src/solver/solver.py']);
    let dataToSend = '';
    let errorData = '';

    python.stdin.write(JSON.stringify(allTasks));
    python.stdin.end();

    python.stdout.on('data', (data) => {
        dataToSend += data.toString();
    });

    python.stderr.on('data', (data) => {
        errorData += data.toString();
    });

    python.on('close', (code) => {
        if (code !== 0) {
            console.error(`Python script exited with code ${code}: ${errorData}`);
            return res.status(500).send('Error during scheduling.');
        }

        try {
            const solvedSchedule = JSON.parse(dataToSend);

            // Perbarui data tugas di database
            const updates = solvedSchedule.map(task => {
                const { id, start_time, end_time, conflict, conflict_reason } = task;
                return new Promise((resolve, reject) => {
                    const sql = `UPDATE tasks SET start_time = ?, end_time = ?, conflict = ?, conflict_reason = ? WHERE id = ? AND user_id = ?`;
                    db.query(sql, [start_time, end_time, conflict, conflict_reason, id, userId], (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                });
            });

            Promise.all(updates)
                .then(() => {
                    res.json({ schedule: solvedSchedule });
                })
                .catch(e => {
                    console.error('Failed to update tasks in DB:', e);
                    res.status(500).send('Failed to save schedule to database.');
                });

        } catch (e) {
            console.error('Failed to parse JSON from Python script:', e, 'Data:', dataToSend);
            res.status(500).send('Invalid response from solver.');
        }
    });
};

exports.addTask = (req, res) => {
    const { name, duration, deadline, window_start, window_end } = req.body;
    const userId = req.userId;
    const newTask = { name, duration, deadline, window_start, window_end };

    db.query('INSERT INTO tasks SET ?, user_id = ?', [newTask, userId], (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).send('Failed to add task.');
        }
        
        db.query('SELECT * FROM tasks WHERE user_id = ?', [userId], (err, allTasks) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Failed to fetch tasks.');
            }
            runSolverAndSave(res, allTasks, userId);
        });
    });
};

exports.editTask = (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    const updatedTaskData = req.body;

    const sql = `UPDATE tasks SET ?, start_time = NULL, end_time = NULL WHERE id = ? AND user_id = ?`;
    db.query(sql, [updatedTaskData, id, userId], (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).send('Failed to edit task.');
        }
        if (results.affectedRows === 0) {
            return res.status(404).send('Task not found or unauthorized.');
        }

        db.query('SELECT * FROM tasks WHERE user_id = ?', [userId], (err, allTasks) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Failed to fetch tasks.');
            }
            runSolverAndSave(res, allTasks, userId);
        });
    });
};

exports.deleteTask = (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    
    db.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, userId], (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).send('Failed to delete task.');
        }
        if (results.affectedRows === 0) {
            return res.status(404).send('Task not found or unauthorized.');
        }
        
        db.query('SELECT * FROM tasks WHERE user_id = ?', [userId], (err, allTasks) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Failed to fetch tasks.');
            }
            runSolverAndSave(res, allTasks, userId);
        });
    });
};

exports.getTasks = (req, res) => {
    const userId = req.userId;
    db.query('SELECT * FROM tasks WHERE user_id = ?', [userId], (error, tasks) => {
        if (error) {
            console.error(error);
            return res.status(500).send('Failed to fetch tasks.');
        }
        res.json({ schedule: tasks });
    });
};