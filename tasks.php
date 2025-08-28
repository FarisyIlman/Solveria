<?php
include 'auth.php';
include 'db.php';
include 'header.php';

$user_id = intval($_SESSION['user_id']);

// Ambil data task berdasarkan status
$statuses = ['Not Completed', 'On Progress', 'Completed'];
$tasksByStatus = [];

foreach ($statuses as $status) {
    $stmt = $conn->prepare("SELECT * FROM tasks WHERE user_id = ? AND status = ? ORDER BY deadline ASC");
    $stmt->bind_param("is", $user_id, $status);
    $stmt->execute();
    $tasksByStatus[$status] = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
}
?>

<style>
body { background: #f8f9fa; color: #212529; font-family: 'Segoe UI', sans-serif; }
.board-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px,1fr)); gap: 20px; margin: 20px auto; }
.board-column { background: #ffffff; border-radius: 12px; padding: 15px; border: 1px solid #ddd; box-shadow: 0 2px 6px rgba(0,0,0,0.05); }
.board-title { color: #333; font-weight: 600; text-align: center; margin-bottom: 12px; font-size: 1.1rem; }
.task-card { background: #fafafa; padding: 12px; border-radius: 10px; margin-bottom: 12px; border-left: 5px solid #ccc; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
.task-card .badge { font-size: 0.75rem; }
.task-actions { margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap; }
.btn-sm { font-size: 0.75rem; border-radius: 6px; }
.add-btn { margin-bottom: 10px; }
.section-header { padding: 20px; background: #ffffff; border-bottom: 1px solid #ddd; margin-bottom: 15px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.05); }
.section-header h1 { font-size: 1.8rem; margin-bottom: 5px; }
.section-header p { font-size: 0.95rem; color: #666; }
</style>

<div class="section-header">
  <div class="container d-flex flex-column flex-md-row justify-content-between align-items-md-center">
    <div>
      <h1 class="fw-bold mb-1">📋 Task Board</h1>
      <p class="mb-0">Kelola semua tugas Anda: mulai, ubah, tandai selesai, atau hapus task.</p>
    </div>
    <div class="mt-3 mt-md-0">
      <a href="planner.php" class="btn btn-success me-2">🔄 Run Planner</a>
      <a href="add_task.php" class="btn btn-primary">+ Tambah Task</a>
    </div>
  </div>
</div>


<div class="container board-container">
  <?php foreach ($statuses as $status): ?>
    <div class="board-column">
      <h4 class="board-title">
        <?= strtoupper(str_replace('Not Completed', 'Tasks To Do', $status)) ?> (<?= count($tasksByStatus[$status]) ?>)
      </h4>
      
      <?php if (count($tasksByStatus[$status]) === 0): ?>
        <p class="text-muted text-center"><i>Tidak ada tugas</i></p>
      <?php else: ?>
        <?php foreach ($tasksByStatus[$status] as $task): 
          $priorityClass = $task['priority']=='Tinggi' ? 'bg-danger' : ($task['priority']=='Sedang' ? 'bg-warning' : 'bg-success');
          $borderColor = $status=='Completed' ? '#4caf50' : ($status=='On Progress' ? '#ffc107' : '#9e9e9e');
        ?>
          <div class="task-card shadow-sm" style="border-left:5px solid <?= $borderColor ?>;">
            <h6 class="fw-bold mb-1"><?= htmlspecialchars($task['name']) ?></h6>
            <span class="badge <?= $priorityClass ?>"><?= $task['priority'] ?></span>

            <!-- Detail Task -->
            <p class="mb-1"><small>📅 Deadline: <?= date('d M Y H:i', strtotime($task['deadline'])) ?></small></p>
<p class="mb-1"><small>⏱️ Durasi: <?= intval($task['duration']) ?> jam</small></p>
<p class="mb-1"><small>▶️ Start: <?= $task['window_start'] ? date('d M Y H:i', strtotime($task['window_start'])) : '-' ?></small></p>
<p class="mb-1"><small>⏹️ End: <?= $task['window_end'] ? date('d M Y H:i', strtotime($task['window_end'])) : '-' ?></small></p>

            <?php if(!empty($task['conflict_reason'])): ?>
              <p class="text-danger mb-1"><small>⚠️ <?= htmlspecialchars($task['conflict_reason']) ?></small></p>
            <?php endif; ?>

            <div class="task-actions">
              <?php if($status=='Not Completed'): ?>
                <a href="update_status.php?id=<?= $task['id'] ?>&status=On Progress" class="btn btn-warning btn-sm">Mulai</a>
              <?php elseif($status=='On Progress'): ?>
                <a href="update_status.php?id=<?= $task['id'] ?>&status=Completed" class="btn btn-success btn-sm">Selesai</a>
              <?php elseif($status=='Completed'): ?>
                <a href="update_status.php?id=<?= $task['id'] ?>&status=Not Completed" class="btn btn-secondary btn-sm">Kembalikan</a>
              <?php endif; ?>
              <a href="edit_task.php?id=<?= $task['id'] ?>" class="btn btn-primary btn-sm">Edit</a>
              <a href="delete_task.php?id=<?= $task['id'] ?>" class="btn btn-danger btn-sm" onclick="return confirm('Hapus task ini?')">Hapus</a>
            </div>
          </div>
        <?php endforeach; ?>
      <?php endif; ?>
    </div>
  <?php endforeach; ?>
</div>

<?php include 'footer.php'; ?>
