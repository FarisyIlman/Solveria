<?php
include 'auth.php';
include 'db.php';

if (isset($_GET['id']) && isset($_GET['status'])) {
    $task_id = intval($_GET['id']);
    $new_status = $_GET['status'];
    $user_id = $_SESSION['user_id'];

    // Pastikan status hanya salah satu dari 3 pilihan
    $allowed_statuses = ['Not Completed', 'On Progress', 'Completed'];
    if (!in_array($new_status, $allowed_statuses)) {
        header("Location: tasks.php?error=invalid_status");
        exit();
    }

    // Update status task
    $stmt = $conn->prepare("UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?");
    $stmt->bind_param("sii", $new_status, $task_id, $user_id);
    $stmt->execute();
    $stmt->close();
}

header("Location: tasks.php");
exit();
?>
