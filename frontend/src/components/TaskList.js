// frontend/src/components/TaskList.js
import React from 'react';

function TaskList({ title, tasks, onEdit, onDelete, onChangeStatus }) {
  const getTaskStyle = (task) => {
    if (task.conflict) {
      return { backgroundColor: '#dc3545', color: 'white' };
    }
    if (task.status === 'On Progress' || task.status === 'Completed') {
      return { backgroundColor: '#28a745', color: 'white' };
    }
    return {};
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    // Format tanggal dan waktu sesuai kebutuhan
    return date.toLocaleString();
  };

  return (
    <div className="task-list-container">
      <h2>{title}</h2>
      <div className="task-list">
        {tasks.map(task => (
          <div key={task.id} className="task-item" style={getTaskStyle(task)}>
            <h3>{task.name}</h3>
            <p>Durasi: {task.duration} jam</p>
            <p>Deadline: {formatDate(task.deadline)}</p>
            {/* Menampilkan Waktu Mulai dan Selesai */}
            {task.start_time && task.end_time && (
              <>
                <p>Waktu Mulai: {formatDate(task.start_time)}</p>
                <p>Waktu Selesai: {formatDate(task.end_time)}</p>
              </>
            )}
            
            {task.conflict && (
                <p>Status: Konflik - {task.reason}</p>
            )}
            {!task.conflict && (
                <p>Status: {task.status}</p>
            )}
            
            <div className="task-actions">
              {task.status === 'Not Completed' && (
                <>
                  <button className="on-progress-btn" onClick={() => onChangeStatus(task.id, 'On Progress')}>On Progress</button>
                  <button className="edit-btn" onClick={() => onEdit(task)}>Edit</button>
                </>
              )}
              {task.status === 'On Progress' && (
                <>
                  <button className="completed-btn" onClick={() => onChangeStatus(task.id, 'Completed')}>Completed</button>
                  <button className="edit-btn" onClick={() => onEdit(task)}>Edit</button>
                </>
              )}
              {task.status === 'Completed' && (
                <>
                  {/* Di sini, hanya tombol Hapus yang ditampilkan */}
                </>
              )}
              <button className="delete-btn" onClick={() => onDelete(task.id)}>Hapus</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TaskList;
