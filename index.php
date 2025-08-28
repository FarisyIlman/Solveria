<?php include 'auth.php'; include 'db.php'; include 'header.php'; ?>

<div class="p-5 mb-4 bg-primary text-white rounded-3 shadow-sm">
  <div class="container py-5">
    <h1 class="display-5 fw-bold">📊 Dashboard</h1>
    <p class="fs-5">Lihat statistik progres semua tugas Anda secara ringkas dan jelas.</p>
  </div>
</div>

<?php
$user_id = intval($_SESSION['user_id']);
$total = $conn->query("SELECT COUNT(*) AS total FROM tasks WHERE user_id=$user_id")->fetch_assoc()['total'];
$completed = $conn->query("SELECT COUNT(*) AS total FROM tasks WHERE status='Completed' AND user_id=$user_id")->fetch_assoc()['total'];
$progress = $conn->query("SELECT COUNT(*) AS total FROM tasks WHERE status='On Progress' AND user_id=$user_id")->fetch_assoc()['total'];
$notCompleted = $conn->query("SELECT COUNT(*) AS total FROM tasks WHERE status='Not Completed' AND user_id=$user_id")->fetch_assoc()['total'];
?>

<div class="row g-3">
  <div class="col-md-3"><div class="card text-center bg-primary text-white"><div class="card-body"><h5>Total</h5><h3><?= $total ?></h3></div></div></div>
  <div class="col-md-3"><div class="card text-center bg-success text-white"><div class="card-body"><h5>Completed</h5><h3><?= $completed ?></h3></div></div></div>
  <div class="col-md-3"><div class="card text-center bg-warning text-white"><div class="card-body"><h5>On Progress</h5><h3><?= $progress ?></h3></div></div></div>
  <div class="col-md-3"><div class="card text-center bg-danger text-white"><div class="card-body"><h5>Not Completed</h5><h3><?= $notCompleted ?></h3></div></div></div>
</div>

<div class="text-center mt-4">
  <a href="tasks.php" class="btn btn-lg btn-dark">📋 Lihat Task List</a>
</div>

<?php include 'footer.php'; ?>
