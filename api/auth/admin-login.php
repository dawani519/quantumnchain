<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

include_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Only POST requests are allowed']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['email']) || !isset($data['password'])) {
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit();
}

$email = $data['email'];
$password = $data['password'];

// 🔹 Fetch admin details without 'status'
$stmt = $conn->prepare("SELECT id, name, email, password_hash, role FROM admin_users WHERE email = ?");
$stmt->execute([$email]);

$admin = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$admin) {
    echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
    exit();
}

if (!password_verify($password, $admin['password_hash'])) {
    echo json_encode(['success' => false, 'message' => 'Password incorrect']);
    exit();
}

// 🔹 Update last login time
$stmt = $conn->prepare("UPDATE admin_users SET last_login = NOW() WHERE id = ?");
$stmt->execute([$admin['id']]);

// 🔹 Generate JWT token
$token = generateJWT($admin['id'], true);

echo json_encode([
    'success' => true,
    'message' => 'Login successful',
    'token' => $token,
    'admin' => [
        'id' => $admin['id'],
        'name' => $admin['name'],
        'email' => $admin['email'],
        'role' => $admin['role']
    ]
]);
?>
