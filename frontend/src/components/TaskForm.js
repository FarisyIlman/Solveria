// frontend/src/components/TaskForm.js
import React, { useState, useEffect, useCallback } from 'react';

function TaskForm({ onSubmit, initialData, tasks }) {
  const [task, setTask] = useState({
    name: '',
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
    setTask(updatedTask);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isOverlapping) {
      onSubmit(task);
    }
  };

  return (
    <div className="task-form-container">
      <h2>{initialData ? 'Edit Tugas' : 'Tambah Tugas Baru'}</h2>
      <form onSubmit={handleSubmit}>
        <input name="name" type="text" value={task.name} onChange={handleChange} placeholder="Nama Tugas" required />
        <input name="duration" type="number" value={task.duration} onChange={handleChange} placeholder="Durasi (jam)" required />
        <label>Deadline</label>
        <input name="deadline" type="datetime-local" value={task.deadline} onChange={handleChange} required />
        <label>Waktu Mulai</label>
        <input name="window_start" type="datetime-local" value={task.window_start} onChange={handleChange} required />
        <label>Waktu Selesai</label>
        <input name="window_end" type="datetime-local" value={task.window_end} onChange={handleChange} required />
        
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