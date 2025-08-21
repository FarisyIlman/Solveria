import React from 'react';

function ScheduleView({ schedule }) {
  // Tambahkan kelas container yang sama
  return (
    <div className="task-list-container">
      <h2>Jadwal Anda</h2>
      {schedule.length > 0 ? (
        <ul className="task-list">
          {schedule.map((task, index) => (
            <li key={index} style={{ color: task.conflict ? 'red' : 'green' }}>
              <strong>{task.name}</strong>: {task.start_time} - {task.end_time}
              {task.conflict && <span> (Konflik: {task.reason})</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p>Tidak ada tugas terjadwal.</p>
      )}
    </div>
  );
}

export default ScheduleView;