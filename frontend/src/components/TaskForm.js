// frontend/src/components/TaskForm.js
import React, { useState, useEffect, useCallback } from 'react';

function TaskForm({ onSubmit, initialData, tasks }) {
  const [task, setTask] = useState({
    name: '',
    priority: '1',
    duration: '',
    deadline: '',
    window_start: '',
    window_end: '',
  });
  const [isOverlapping, setIsOverlapping] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Memastikan formulir direset saat beralih dari mode edit ke mode tambah
    if (initialData) {
      setTask({
        name: initialData.name || '',
        priority: initialData.priority || '1',
        duration: initialData.duration || '',
        deadline: initialData.deadline || '',
        window_start: initialData.window_start || '',
        window_end: initialData.window_end || '',
      });
    } else {
      setTask({
        name: '',
        duration: '',
        deadline: '',
        window_start: '',
        window_end: '',
      });
    }
  }, [initialData]);

  const validateOverlap = useCallback((newTask) => {
    // Validasi dasar
    if (!newTask.window_start || !newTask.window_end) {
      return false;
    }

    const newStart = new Date(newTask.window_start);
    const newEnd = new Date(newTask.window_end);
    
    if (isNaN(newStart) || isNaN(newEnd)) {
        return false;
    }

    const newDurationMs = parseFloat(newTask.duration) * 60 * 60 * 1000;
    
    if (newDurationMs > newEnd.getTime() - newStart.getTime()) {
      setErrorMessage('Durasi lebih lama dari jendela waktu yang tersedia.');
      return true;
    }

    for (const existingTask of tasks) {
      if (initialData && existingTask.id === initialData.id) {
          continue;
      }

      // Gunakan start_time dan end_time jika tersedia, jika tidak, gunakan window
      const existingStartTime = new Date(existingTask.start_time || existingTask.window_start);
      const existingEndTime = new Date(existingTask.end_time || existingTask.window_end);

      if (newStart < existingEndTime && newEnd > existingStartTime) {
        setErrorMessage('Waktu tumpang tindih dengan tugas yang sudah ada.');
        return true;
      }
    }
    
    setErrorMessage('');
    return false;
  }, [tasks, initialData]);

  useEffect(() => {
    const isConflict = validateOverlap(task);
    setIsOverlapping(isConflict);
  }, [task, validateOverlap]);

  const handleChange = (e) => {
  const { name, value } = e.target;
  const updatedTask = { ...task, [name]: value };

  if ((name === 'duration' || name === 'window_start') && updatedTask.window_start && updatedTask.duration) {
    const start = new Date(updatedTask.window_start);
    const durationMs = parseFloat(updatedTask.duration) * 60 * 60 * 1000;
    const end = new Date(start.getTime() + durationMs);

    // ambil tanggal & jam sesuai local
    const yyyy = end.getFullYear();
    const mm = String(end.getMonth() + 1).padStart(2, '0');
    const dd = String(end.getDate()).padStart(2, '0');
    const hh = String(end.getHours()).padStart(2, '0');
    const min = String(end.getMinutes()).padStart(2, '0');

    updatedTask.window_end = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

  setTask(updatedTask);
};



  const handleSubmit = (e) => {
  e.preventDefault();
  if (!isOverlapping) {
    const action = initialData ? 'mengubah' : 'menambahkan';
    const confirmed = window.confirm(`Apakah Anda yakin ingin ${action} tugas ini?`);
    if (confirmed) {
      onSubmit(task); // kirim task ke App.js
      alert(`Tugas berhasil ${initialData ? 'diubah' : 'ditambahkan'}!`); // notifikasi sesuai aksi

      if (!initialData) {
        // Reset form hanya untuk tambah baru
        setTask({
          name: '',
          priority: '1',
          duration: '',
          deadline: '',
          window_start: '',
          window_end: '',
        });
      }
    }
  }
};


  return (
    <div className="task-form-container">
      <h2>{initialData ? 'Edit Tugas' : 'Tambah Tugas Baru'}</h2>
      <form onSubmit={handleSubmit}>
        <input name="name" type="text" value={task.name} onChange={handleChange} placeholder="Nama Tugas" required />
        <label>Prioritas</label>
        <select name="priority" value={task.priority} onChange={handleChange} required 
          style={{
            padding: '8px',
            marginBottom: '16px',
            width: '100%',
            borderRadius: '4px',
            border: '1px solid #ccc',
            backgroundColor: '#424242',
            color: '#fff'
          }}>
          <option value="1">Rendah</option>
          <option value="2">Sedang</option>
          <option value="3">Tinggi</option>
        </select>
        <input name="duration" type="number" value={task.duration} onChange={handleChange} placeholder="Durasi (jam)" required />
        <label>Deadline</label>
        <input name="deadline" type="datetime-local" value={task.deadline} onChange={handleChange} required />
        <label>Waktu Mulai</label>
        <input name="window_start" type="datetime-local" value={task.window_start} onChange={handleChange} required />
        <label>Waktu Selesai</label>
        <input name="window_end" type="datetime-local" value={task.window_end} readOnly />
        
        {isOverlapping && (
          <p className="error-message">{errorMessage}</p>
        )}
        
        <button type="submit" disabled={isOverlapping}>
          {initialData ? 'Simpan Perubahan' : 'Tambahkan Tugas'}
        </button>
      </form>
    </div>
  );
}

export default TaskForm;