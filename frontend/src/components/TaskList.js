// frontend/src/components/TaskList.js
import React from 'react';
import './TaskList.css';

function TaskList({ title, tasks, onEdit, onDelete, onChangeStatus }) {
  const getTaskStyle = (task) => {
    if (task.conflict) {
      return { backgroundColor: '#ffebee', borderLeft: '5px solid #f44336' };
    }
    if (task.status === 'Completed') {
      return { backgroundColor: '#e8f5e9', borderLeft: '5px solid #4caf50' };
    }
    if (task.status === 'On Progress') {
      return { backgroundColor: '#fff8e1', borderLeft: '5px solid #ffc107' };
    }
    return { borderLeft: '5px solid #9e9e9e' };
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Completed':
        return 'status-badge completed';
      case 'On Progress':
        return 'status-badge in-progress';
      case 'Not Completed':
        return 'status-badge not-started';
      default:
        return 'status-badge';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Format tanggal tidak valid';
      
      const options = { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      return date.toLocaleString('id-ID', options);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Format tanggal tidak valid';
    }
  };

  const calculateProgress = (task) => {
    if (task.status === 'Completed') return 100;
    if (task.status === 'Not Completed') return 0;
    if (task.status === 'On Progress' && task.start_time && task.end_time) {
      try {
        const now = new Date();
        const start = new Date(task.start_time);
        const end = new Date(task.end_time);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
        
        const total = end - start;
        const current = now - start;
        
        if (total <= 0) return 0;
        
        return Math.min(Math.max(Math.round((current / total) * 100), 0), 100);
      } catch (error) {
        console.error('Error calculating progress:', error);
        return 0;
      }
    }
    return 0;
  };

  return (
    <div className="task-list-container">
      <h2>{title} ({tasks.length})</h2>
      {tasks.length === 0 ? (
        <p className="no-tasks-message">Tidak ada tugas</p>
      ) : (
        <div className="task-list">
          {tasks.map(task => {
            const progress = calculateProgress(task);
            
            return (
              <div key={task.id} className="task-item" style={getTaskStyle(task)}>
                <div className="task-header">
                  <h3>{task.name}</h3>
                  <span className={getStatusBadgeStyle(task.status)}>
                    {task.conflict ? 'Konflik' : task.status || 'Tidak ada status'}
                  </span>
                </div>
                
                <div className="task-details">
                  <p><strong>Prioritas:</strong> {task.priority === '1' ? 'Rendah' : task.priority === '2' ? 'Sedang' : 'Tinggi'}</p>
                  <p><strong>Durasi:</strong> {task.duration} jam</p>
                  <p><strong>Deadline:</strong> {formatDate(task.deadline)}</p>
                  
                  {task.start_time && task.end_time && (
                    <>
                      <p><strong>Waktu Mulai:</strong> {formatDate(task.start_time || task.window_start)}</p>
<p><strong>Waktu Selesai:</strong> {formatDate(task.end_time || task.window_end)}</p>

                    </>
                  )}
                  
                  {task.conflict && (
                    <p className="conflict-reason"><strong>Alasan Konflik:</strong> {task.reason}</p>
                  )}
                </div>
                
                {task.status === 'On Progress' && progress > 0 && progress < 100 && (
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">{progress}% selesai</span>
                  </div>
                )}
                
                <div className="task-actions">
                  {task.status === 'Not Completed' && (
                    <>
                      <button className="btn on-progress-btn" onClick={() => onChangeStatus(task.id, 'On Progress')}>
                        Mulai Pengerjaan
                      </button>
                      <button className="btn edit-btn" onClick={() => onEdit(task)}>
                        Edit
                      </button>
                    </>
                  )}
                  
                  {task.status === 'On Progress' && (
                    <>
                      <button className="btn completed-btn" onClick={() => onChangeStatus(task.id, 'Completed')}>
                        Tandai Selesai
                      </button>
                      <button className="btn edit-btn" onClick={() => onEdit(task)}>
                        Edit
                      </button>
                    </>
                  )}
                  
                  {task.status === 'Completed' && (
                    <button className="btn revert-btn" onClick={() => onChangeStatus(task.id, 'Not Completed')}>
                      Kembalikan Status
                    </button>
                  )}
                  
                  <button className="btn delete-btn" onClick={() => onDelete(task.id)}>
                    Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TaskList;