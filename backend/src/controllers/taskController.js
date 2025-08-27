// backend/src/controllers/taskController.js
const { spawn } = require('child_process');
const util = require('util');
const path = require('path');
const db = require('../config/db');

// Mengubah db.query menjadi Promise agar bisa menggunakan async/await
db.query = util.promisify(db.query);

// Konfigurasi timeout dan retry
const SOLVER_TIMEOUT = 30000; // 30 detik
const MAX_RETRIES = 3;

/**
 * Validasi data tugas sebelum dikirim ke solver
 * @param {Array} tasks - Daftar tugas
 * @returns {Object} - {valid: boolean, errors: Array}
 */
const validateTasks = (tasks) => {
    const errors = [];
    const validTasks = [];
    
    if (!Array.isArray(tasks)) {
        return { valid: false, errors: ['Data tugas harus berupa array'] };
    }
    
    tasks.forEach((task, index) => {
        const taskErrors = [];
        
        // Validasi field wajib
        if (!task.name || typeof task.name !== 'string') {
            taskErrors.push('Nama tugas tidak valid');
        }
        
        if (!task.duration || isNaN(parseFloat(task.duration))) {
            taskErrors.push('Durasi tugas tidak valid');
        }
        
        if (!task.deadline) {
            taskErrors.push('Deadline tidak boleh kosong');
        }
        
        if (!task.window_start) {
            taskErrors.push('Window start tidak boleh kosong');
        }
        
        if (!task.window_end) {
            taskErrors.push('Window end tidak boleh kosong');
        }
        
        // Validasi format tanggal
        try {
            if (task.deadline) new Date(task.deadline).toISOString();
            if (task.window_start) new Date(task.window_start).toISOString();
            if (task.window_end) new Date(task.window_end).toISOString();
        } catch (e) {
            taskErrors.push('Format tanggal tidak valid');
        }
        
        if (taskErrors.length > 0) {
            errors.push(`Task ${index + 1}: ${taskErrors.join(', ')}`);
        } else {
            validTasks.push(task);
        }
    });
    
    return { valid: errors.length === 0, errors, validTasks };
};

/**
 * Menjalankan skrip Python solver dengan tugas yang diberikan.
 * @param {Array} allTasks - Daftar tugas yang akan diselesaikan.
 * @param {number} retryCount - Jumlah percobaan ulang
 * @returns {Promise<Array>} Sebuah Promise yang me-resolve dengan jadwal yang sudah diselesaikan.
 */
const runSolver = (allTasks, retryCount = 0) => {
    return new Promise((resolve, reject) => {
        // Validasi input terlebih dahulu
        const validation = validateTasks(allTasks);
        if (!validation.valid) {
            console.error('Validasi tugas gagal:', validation.errors);
            return reject(new Error(`Validasi gagal: ${validation.errors.join('; ')}`));
        }
        
        console.log(`[Solver] Memulai solver dengan ${allTasks.length} tugas (percobaan ke-${retryCount + 1})`);
        
        const solverPath = path.join(__dirname, '../solver/solver.py');
        const python = spawn('python', [solverPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: SOLVER_TIMEOUT
        });
        
        let dataToSend = '';
        let errorData = '';
        let isResolved = false;
        
        // Timeout handler
        const timeoutId = setTimeout(() => {
            if (!isResolved) {
                python.kill('SIGTERM');
                console.error('[Solver] Timeout - solver dihentikan');
                reject(new Error('Solver timeout - proses terlalu lama'));
            }
        }, SOLVER_TIMEOUT);
        
        // Kirim data ke Python script
        try {
            const inputData = JSON.stringify(allTasks, null, 2);
            console.log('[Solver] Mengirim data ke Python script');
            python.stdin.write(inputData);
            python.stdin.end();
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('[Solver] Error mengirim data:', error);
            return reject(new Error('Gagal mengirim data ke solver'));
        }
        
        python.stdout.on('data', (data) => {
            dataToSend += data.toString();
        });
        
        python.stderr.on('data', (data) => {
            errorData += data.toString();
        });
        
        python.on('close', (code) => {
            clearTimeout(timeoutId);
            
            if (isResolved) return;
            isResolved = true;
            
            console.log(`[Solver] Python script selesai dengan kode: ${code}`);
            
            if (code !== 0) {
                console.error(`[Solver] Error output: ${errorData}`);
                
                // Retry logic
                if (retryCount < MAX_RETRIES - 1) {
                    console.log(`[Solver] Mencoba ulang... (${retryCount + 1}/${MAX_RETRIES})`);
                    setTimeout(() => {
                        runSolver(allTasks, retryCount + 1)
                            .then(resolve)
                            .catch(reject);
                    }, 1000 * (retryCount + 1)); // Exponential backoff
                    return;
                }
                
                return reject(new Error(`Solver gagal setelah ${MAX_RETRIES} percobaan. Kode: ${code}, Error: ${errorData}`));
            }
            
            if (!dataToSend.trim()) {
                console.error('[Solver] Tidak ada output dari Python script');
                return reject(new Error('Solver tidak menghasilkan output'));
            }
            
            try {
                console.log('[Solver] Parsing hasil dari Python script');
                const solvedSchedule = JSON.parse(dataToSend);
                
                // Validasi hasil
                if (!Array.isArray(solvedSchedule)) {
                    throw new Error('Hasil solver bukan array yang valid');
                }
                
                console.log(`[Solver] Berhasil memproses ${solvedSchedule.length} tugas`);
                resolve(solvedSchedule);
            } catch (e) {
                console.error('[Solver] Gagal parsing JSON:', e);
                console.error('[Solver] Raw data:', dataToSend.substring(0, 500));
                reject(new Error('Respons solver tidak valid atau rusak'));
            }
        });
        
        python.on('error', (error) => {
            clearTimeout(timeoutId);
            if (!isResolved) {
                isResolved = true;
                console.error('[Solver] Error spawning Python process:', error);
                reject(new Error(`Gagal menjalankan solver: ${error.message}`));
            }
        });
    });
};

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
    
    const [allTasksResult] = await db.query('SELECT * FROM tasks WHERE user_id = ?', [userId]);
    const allTasks = allTasksResult || [];
    
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
        const [tasks] = await db.query('SELECT * FROM tasks WHERE user_id = ?', [userId]);
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
    
    console.log(`[API] ADD task: ${name} untuk user ${userId}`);
    
    // Validasi input
    if (!name || !duration || !deadline || !window_start || !window_end) {
        return res.status(400).json({ error: 'Semua field wajib harus diisi' });
    }
    
    const newTask = { 
        name, 
        priority: priority || 1, 
        duration, 
        deadline, 
        window_start, 
        window_end,
        status: 'Not Completed',
        conflict: false,
        conflict_reason: null
    };

    try {
        await db.query('INSERT INTO tasks SET ?, user_id = ?', [newTask, userId]);
        console.log('[API] Tugas baru berhasil ditambahkan ke database');
        
        const solvedSchedule = await refreshSchedule(userId);
        res.json({ schedule: solvedSchedule });
    } catch (error) {
        console.error('[API] Error dalam addTask:', error);
        res.status(500).json({ error: error.message || 'Terjadi kesalahan server' });
    }
};

exports.editTask = async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    const updatedTaskData = req.body;

    console.log(`[API] EDIT task ${id} untuk user ${userId}`);
    
    // Reset scheduling data when editing
    updatedTaskData.start_time = null;
    updatedTaskData.end_time = null;
    updatedTaskData.conflict = false;
    updatedTaskData.conflict_reason = null;

    const sql = `UPDATE tasks SET ? WHERE id = ? AND user_id = ?`;
    
    try {
        const results = await db.query(sql, [updatedTaskData, id, userId]);
        
        if (!results || results.affectedRows === 0) {
            return res.status(404).json({ error: 'Tugas tidak ditemukan atau tidak berwenang' });
        }
        
        console.log('[API] Tugas berhasil diupdate');
        const solvedSchedule = await refreshSchedule(userId);
        res.json({ schedule: solvedSchedule });
    } catch (error) {
        console.error('[API] Error dalam editTask:', error);
        res.status(500).json({ error: error.message || 'Terjadi kesalahan server' });
    }
};

exports.updateTaskStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.userId;

    console.log(`[API] UPDATE status task ${id} to ${status} untuk user ${userId}`);
    
    if (!['Not Completed', 'Completed', 'In Progress'].includes(status)) {
        return res.status(400).json({ error: 'Status tidak valid' });
    }

    const sql = `UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?`;
    
    try {
        const results = await db.query(sql, [status, id, userId]);
        
        if (!results || results.affectedRows === 0) {
            return res.status(404).json({ error: 'Tugas tidak ditemukan atau tidak berwenang' });
        }
        
        console.log('[API] Status tugas berhasil diupdate');
        
        // Jika completed, hanya return current tasks tanpa re-solve
        if (status === 'Completed') {
            const [allTasks] = await db.query('SELECT * FROM tasks WHERE user_id = ?', [userId]);
            return res.json({ schedule: allTasks });
        }

        const solvedSchedule = await refreshSchedule(userId);
        res.json({ schedule: solvedSchedule });
    } catch (error) {
        console.error('[API] Error dalam updateTaskStatus:', error);
        res.status(500).json({ error: error.message || 'Terjadi kesalahan server' });
    }
};

exports.deleteTask = async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    
    console.log(`[API] DELETE task ${id} untuk user ${userId}`);
    
    try {
        const results = await db.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, userId]);
        
        if (!results || results.affectedRows === 0) {
            return res.status(404).json({ error: 'Tugas tidak ditemukan atau tidak berwenang' });
        }
        
        console.log('[API] Tugas berhasil dihapus');
        const solvedSchedule = await refreshSchedule(userId);
        res.json({ schedule: solvedSchedule });
    } catch (error) {
        console.error('[API] Error dalam deleteTask:', error);
        res.status(500).json({ error: error.message || 'Terjadi kesalahan server' });
    }
};