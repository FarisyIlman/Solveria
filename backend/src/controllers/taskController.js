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
                const { id, start_time, end_time, conflict, conflict_reason, status } = task;
                return new Promise((resolve, reject) => {
                    const sql = `UPDATE tasks SET start_time = ?, end_time = ?, conflict = ?, conflict_reason = ?, status = ? WHERE id = ? AND user_id = ?`;
                    db.query(sql, [start_time, end_time, conflict, conflict_reason, status, id, userId], (err) => {
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
    /**
     * Menyimpan jadwal yang telah diselesaikan ke database.
     * @param {Array} solvedSchedule - Jadwal yang telah diselesaikan dari solver.
     * @param {number} userId - ID pengguna.
     * @returns {Promise<void>} Sebuah Promise yang me-resolve saat semua pembaruan selesai.
     */
    const saveSchedule = async (solvedSchedule, userId) => {
        if (!Array.isArray(solvedSchedule) || solvedSchedule.length === 0) {
            console.log('[Database] Tidak ada jadwal untuk disimpan');
            return;
        }
        
        console.log(`[Database] Menyimpan ${solvedSchedule.length} tugas ke database`);
        
        const updates = solvedSchedule.map(task => {
            const { id, start_time, end_time, conflict, conflict_reason, status } = task;
            
            // Pastikan semua field memiliki nilai default yang aman
            const safeStartTime = start_time || null;
            const safeEndTime = end_time || null;
            const safeConflict = conflict === true ? 1 : 0;
            const safeConflictReason = conflict_reason || null;
            const safeStatus = status || 'Not Completed';
            
            const sql = `UPDATE tasks SET start_time = ?, end_time = ?, conflict = ?, conflict_reason = ?, status = ? WHERE id = ? AND user_id = ?`;
            return db.query(sql, [safeStartTime, safeEndTime, safeConflict, safeConflictReason, safeStatus, id, userId]);
        });
        
        try {
            await Promise.all(updates);
            console.log('[Database] Semua tugas berhasil disimpan');
        } catch (error) {
            console.error('[Database] Error menyimpan jadwal:', error);
            throw new Error('Gagal menyimpan jadwal ke database');
        }
    };

    /**
     * Mengambil dan memproses ulang semua tugas
     * @param {number} userId - ID pengguna
     * @returns {Promise<Array>} Jadwal yang telah diproses
     */
    const refreshSchedule = async (userId) => {
        console.log(`[Schedule] Refresh jadwal untuk user ${userId}`);
        
        const result = await db.query('SELECT * FROM tasks WHERE user_id = ?', [userId]);
        const allTasks = Array.isArray(result) ? result : result[0] || [];
        
        if (allTasks.length === 0) {
            console.log('[Schedule] Tidak ada tugas untuk dijadwalkan');
            return [];
        }
        
        const solvedSchedule = await runSolver(allTasks);
        await saveSchedule(solvedSchedule, userId);
        
        return solvedSchedule;
    };

    // Controller methods
    exports.getTasks = async (req, res) => {
        const userId = req.userId;
        console.log(`[API] GET tasks untuk user ${userId}`);
        
        try {
            const result = await db.query('SELECT * FROM tasks WHERE user_id = ?', [userId]);
            const tasks = Array.isArray(result) ? result : result[0] || [];
            console.log(`[API] Berhasil mengambil ${tasks.length} tugas`);
            res.json({ schedule: tasks });
        } catch (error) {
            console.error("[API] Gagal mengambil tugas:", error);
            res.status(500).json({ error: 'Gagal mengambil daftar tugas' });
        }
    };

    exports.addTask = async (req, res) => {
        const { name, priority, duration, deadline, window_start, window_end } = req.body;
        const userId = req.userId;
        const newTask = { name, priority, duration, deadline, window_start, window_end };

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

    exports.updateTaskStatus = (req, res) => {
        const { id } = req.params;
        const { status } = req.body;
        const userId = req.userId;

        const sql = `UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?`;
        db.query(sql, [status, id, userId], (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).send('Failed to update task status.');
            }
            
            console.log('[API] Status tugas berhasil diupdate');
            
            // Jika completed, hanya return current tasks tanpa re-solve
            if (status === 'Completed') {
                const result = await db.query('SELECT * FROM tasks WHERE user_id = ?', [userId]);
                const allTasks = Array.isArray(result) ? result : result[0] || [];
                return res.json({ schedule: allTasks });
            }

            const solvedSchedule = await refreshSchedule(userId);
            res.json({ schedule: solvedSchedule });
        } ,catch (error) {
            console.error('[API] Error dalam updateTaskStatus:', error);
            res.status(500).json({ error: error.message || 'Terjadi kesalahan server' });
        }
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
}