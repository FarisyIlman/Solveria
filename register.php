<?php
include 'db.php'; session_start();
$error = '';

if($_SERVER['REQUEST_METHOD'] == 'POST'){
    $username = $_POST['username'];
    $password = password_hash($_POST['password'], PASSWORD_BCRYPT);

    $check = $conn->prepare("SELECT * FROM users WHERE username=?");
    $check->bind_param("s",$username);
    $check->execute();
    if($check->get_result()->num_rows > 0){
        $error = "Username sudah dipakai!";
    } else {
        $stmt = $conn->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
        $stmt->bind_param("ss",$username,$password);
        $stmt->execute();
        header("Location: login.php");
        exit();
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Register</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
<div class="container d-flex justify-content-center align-items-center" style="height:100vh;">
  <div class="card p-4 shadow" style="width:400px;">
    <h3 class="text-center mb-4">📝 Register</h3>
    <?php if($error) echo "<div class='alert alert-danger'>$error</div>"; ?>
    <form method="POST">
      <div class="mb-3">
        <label class="form-label">Username</label>
        <input type="text" name="username" class="form-control" required>
      </div>
      <div class="mb-3">
        <label class="form-label">Password</label>
        <input type="password" name="password" class="form-control" required>
      </div>
      <button type="submit" class="btn btn-success w-100">Register</button>
      <p class="text-center mt-3">Sudah punya akun? <a href="login.php">Login</a></p>
    </form>
  </div>
</div>
</body>
</html>
