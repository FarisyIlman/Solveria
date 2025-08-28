<?php
include 'auth.php';
include 'db.php';

// Ambil data task berdasarkan ID dan user yang login
$id = intval($_GET['id']);
$user_id = intval($_SESSION['user_id']);

$stmt = $conn->prepare("SELECT * FROM tasks WHERE id=? AND user_id=?");
$stmt->bind_param("ii", $id, $user_id);
$stmt->execute();
$result = $stmt->get_result();
$task = $result->fetch_assoc();

if (!$task) {
    echo "<div class='alert alert-danger'>Task tidak ditemukan!</div>";
    exit();
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $name = $_POST['name'];
    $duration = $_POST['duration'];
    $deadline = $_POST['deadline'];
    $window_start = $_POST['window_start'];
    $priority = $_POST['priority'];
    $status = $_POST['status'];

    // Hitung window_end
    $start = new DateTime($window_start);
    $start->modify("+$duration hour");
    $window_end = $start->format('Y-m-d H:i:s');

    $stmt = $conn->prepare("UPDATE tasks SET name=?, duration=?, deadline=?, window_start=?, window_end=?, priority=?, status=? 
                            WHERE id=? AND user_id=?");
    $stmt->bind_param("sisssssii", $name, $duration, $deadline, $window_start, $window_end, $priority, $status, $id, $user_id);
    $stmt->execute();

    header("Location: tasks.php");
    exit();
}

include 'header.php';
?>

<div class="card p-4 shadow">
  <h3 class="mb-4 fw-bold">✏️ Edit Task</h3>
  <form method="POST">
    <div class="mb-3">
      <label class="form-label">Nama Task</label>
      <input type="text" name="name" class="form-control" value="<?= htmlspecialchars($task['name']) ?>" required>
    </div>

    <div class="mb-3">
      <label class="form-label">Durasi (Jam)</label>
      <input type="number" name="duration" id="duration" class="form-control" value="<?= $task['duration'] ?>" oninput="updateWindowEnd()" required>
    </div>

    <div class="mb-3">
      <label class="form-label">Deadline</label>
      <input type="datetime-local" name="deadline" class="form-control"
             value="<?= date('Y-m-d\TH:i', strtotime($task['deadline'])) ?>" required>
    </div>

    <div class="mb-3">
      <label class="form-label">Waktu Mulai</label>
      <input type="datetime-local" name="window_start" id="window_start" class="form-control"
             value="<?= date('Y-m-d\TH:i', strtotime($task['window_start'])) ?>" oninput="updateWindowEnd()" required>
    </div>

    <div class="mb-3">
      <label class="form-label">Waktu Selesai</label>
      <input type="datetime-local" name="window_end" id="window_end" class="form-control"
             value="<?= date('Y-m-d\TH:i', strtotime($task['window_end'])) ?>" readonly>
    </div>

    <div class="mb-3">
      <label class="form-label">Prioritas</label>
      <select name="priority" class="form-select">
        <option value="Rendah" <?= $task['priority']=='Rendah'?'selected':'' ?>>Rendah</option>
        <option value="Sedang" <?= $task['priority']=='Sedang'?'selected':'' ?>>Sedang</option>
        <option value="Tinggi" <?= $task['priority']=='Tinggi'?'selected':'' ?>>Tinggi</option>
      </select>
    </div>

    <div class="mb-3">
      <label class="form-label">Status</label>
      <select name="status" class="form-select">
        <option value="Not Completed" <?= $task['status']=='Not Completed'?'selected':'' ?>>Not Completed</option>
        <option value="On Progress" <?= $task['status']=='On Progress'?'selected':'' ?>>On Progress</option>
        <option value="Completed" <?= $task['status']=='Completed'?'selected':'' ?>>Completed</option>
      </select>
    </div>

    <button type="submit" class="btn btn-success">💾 Simpan Perubahan</button>
    <a href="tasks.php" class="btn btn-secondary">🔙 Kembali</a>
  </form>
</div>

<script>
  function pad(num) { return num < 10 ? '0'+num : num; }

  function updateWindowEnd() {
    let start = document.getElementById("window_start").value;
    let dur = parseFloat(document.getElementById("duration").value);
    if(start && dur) {
      let startDate = new Date(start);
      startDate.setHours(startDate.getHours() + dur);

      let year = startDate.getFullYear();
      let month = pad(startDate.getMonth()+1);
      let day = pad(startDate.getDate());
      let hour = pad(startDate.getHours());
      let min = pad(startDate.getMinutes());

      document.getElementById("window_end").value = `${year}-${month}-${day}T${hour}:${min}`;
    }
  }
</script>

<?php include 'footer.php'; ?>
