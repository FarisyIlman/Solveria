import React from 'react';
import './ScheduleView.css'; // File CSS terpisah untuk ScheduleView

function ScheduleView({ schedule }) {
  // Fungsi untuk memformat tanggal dan waktu
  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) return 'Format tidak valid';
      
      const options = { 
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      return date.toLocaleString('id-ID', options);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Format tidak valid';
    }
  };

  // Fungsi untuk mendapatkan kelas CSS berdasarkan status konflik
  const getScheduleItemClass = (task) => {
    return task.conflict 
      ? 'schedule-item conflict' 
      : 'schedule-item';
  };

  return (
    <div className="schedule-container">
      <h2>Jadwal Anda</h2>
      
      {schedule.length > 0 ? (
        <div className="schedule-list">
          {schedule.map((task, index) => (
            <div key={index} className={getScheduleItemClass(task)}>
              <div className="schedule-time">
                <span className="time-range">
                  {formatDateTime(task.start_time)} - {formatDateTime(task.end_time)}
                </span>
                <span className="duration">{task.duration} jam</span>
              </div>
              
              <div className="schedule-details">
                <h3>{task.name}</h3>
                <p className="task-status">Status: {task.status || 'Tidak ada status'}</p>
                
                {task.conflict && (
                  <div className="conflict-info">
                    <span className="conflict-icon">⚠️</span>
                    <span className="conflict-reason">Konflik: {task.reason}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-schedule-message">Tidak ada tugas terjadwal.</p>
      )}
    </div>
  );
}

export default ScheduleView;