<?php
include 'db.php';
session_start();
$user_id = intval($_SESSION['user_id']);

// Ambil task user urut deadline dan prioritas
$stmt = $conn->prepare("SELECT * FROM tasks WHERE user_id=? ORDER BY deadline ASC, FIELD(priority,'Tinggi','Sedang','Rendah')");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$tasks = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

$currentTime = new DateTime(); // mulai sekarang

foreach ($tasks as $task) {
    $start = clone $currentTime;
    $end = clone $start;
    $end->modify("+{$task['duration']} hours");

    // Simpan ke database
    $upd = $conn->prepare("UPDATE tasks SET window_start=?, window_end=? WHERE id=?");
    $startStr = $start->format('Y-m-d H:i:s');
    $endStr = $end->format('Y-m-d H:i:s');
    $upd->bind_param("ssi", $startStr, $endStr, $task['id']);
    $upd->execute();

    $currentTime = $end; // lanjutkan waktu
}

header("Location: tasks.php?msg=planning_updated");
exit;
