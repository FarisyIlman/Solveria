<?php
if (session_status() === PHP_SESSION_NONE) session_start();
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solveria App</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body { background: #f8f9fa; }
    .navbar-brand { font-weight: bold; font-size: 1.4rem; }
    .card { border-radius: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
    .navbar { box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
    .table td, .table th { vertical-align: middle; }
  </style>
</head>
<body>
<nav class="navbar navbar-expand-lg navbar-dark bg-primary sticky-top">
  <div class="container">
    <a class="navbar-brand" href="index.php">⚡ Solveria</a>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navbarNav">
      <ul class="navbar-nav me-auto">
        <li class="nav-item"><a class="nav-link <?= basename($_SERVER['PHP_SELF'])=='index.php'?'active':'' ?>" href="index.php">Dashboard</a></li>
        <li class="nav-item"><a class="nav-link <?= basename($_SERVER['PHP_SELF'])=='tasks.php'?'active':'' ?>" href="tasks.php">Task List</a></li>
      </ul>
      <ul class="navbar-nav">
        <?php if(isset($_SESSION['username'])): ?>
          <li class="nav-item"><span class="nav-link">👤 <?= htmlspecialchars($_SESSION['username']) ?></span></li>
          <li class="nav-item"><a class="nav-link" href="logout.php">Logout</a></li>
        <?php else: ?>
          <li class="nav-item"><a class="nav-link" href="login.php">Login</a></li>
        <?php endif; ?>
      </ul>
    </div>
  </div>
</nav>
<div class="container my-4">
