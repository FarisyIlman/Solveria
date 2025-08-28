<?php
include 'auth.php';
include 'db.php';
include 'header.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user_id   = intval($_SESSION['user_id']);
    $name      = trim($_POST['name']);
    $duration  = intval($_POST['duration']);
    $deadline  = $_POST['deadline'];
    $priority  = $_POST['priority'];

    if (!empty($name) && !empty($deadline) && $duration > 0) {
        $stmt = $conn->prepare("INSERT INTO tasks 
    (user_id, name, duration, deadline, priority, status, window_start, window_end) 
    VALUES (?, ?, ?, ?, ?, 'Not Completed', NULL, NULL)");
$stmt->bind_param("isiss", $user_id, $name, $duration, $deadline, $priority);

        if ($stmt->execute()) {
            header("Location: tasks.php");
            exit;
        } else {
            $error = "Gagal menambahkan task. Coba lagi.";
        }
    } else {
        $error = "Semua field wajib diisi.";
    }
}
?>

<div class="container mt-5">
  <div class="card shadow-sm p-4">
    <h3 class="fw-bold mb-3">➕ Tambah Task Baru</h3>

    <?php if (!empty($error)): ?>
      <div class="alert alert-danger"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>

    <form method="POST">
      <div class="mb-3">
        <label class="form-label">Nama Task</label>
        <input type="text" name="name" class="form-control" required>
      </div>

      <div class="mb-3">
        <label class="form-label">Durasi (jam)</label>
        <input type="number" name="duration" class="form-control" min="1" required>
      </div>

      <div class="mb-3">
        <label class="form-label">Deadline</label>
        <input type="datetime-local" name="deadline" class="form-control" required>
      </div>

      <div class="mb-3">
        <label class="form-label">Prioritas</label>
        <select name="priority" class="form-select" required>
          <option value="">-- Pilih Prioritas --</option>
          <option value="Rendah">Rendah</option>
          <option value="Sedang">Sedang</option>
          <option value="Tinggi">Tinggi</option>
        </select>
      </div>

      <button type="submit" class="btn btn-primary">💾 Simpan</button>
      <a href="tasks.php" class="btn btn-secondary">⬅ Kembali</a>
    </form>
  </div>
</div>

<?php include 'footer.php'; ?>
