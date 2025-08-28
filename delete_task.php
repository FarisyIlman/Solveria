<?php
include 'auth.php';
include 'db.php';

$id = intval($_GET['id']);
$user_id = intval($_SESSION['user_id']);

$stmt = $conn->prepare("DELETE FROM tasks WHERE id=? AND user_id=?");
$stmt->bind_param("ii", $id, $user_id);
$stmt->execute();

header("Location: tasks.php");
exit();
