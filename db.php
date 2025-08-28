<?php
$host = "localhost";
$user = "root";     // default user Laragon/XAMPP
$pass = "";         // default password kosong
$db   = "solveria_app"; // sesuai db di phpMyAdmin

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    die("Koneksi gagal: " . $conn->connect_error);
}
?>
