<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

include_once '../config/database.php';

// ✅ Ensure Database Connection Exists
if (!$conn) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit();
}

// ✅ Check if it's a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Only POST requests are allowed']);
    exit();
}

// ✅ Get POST data
$data = json_decode(file_get_contents('php://input'), true);

// ✅ Validate required fields
if (!isset($data['email']) || !isset($data['password'])) {
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit();
}

$email = trim($data['email']);
$password = $data['password'];

// ✅ Get user by email
$stmt = $conn->prepare("SELECT id, name, email, password_hash, balance, status FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

// ✅ Check if user exists
if (!$user) {
    echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
    exit();
}

// ✅ Debugging: Log password hash
error_log("Stored Hash: " . $user['password_hash']);
error_log("Entered Password: " . $password);

// ✅ Verify password
if (!password_verify($password, $user['password_hash'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
    exit();
}

// ✅ Check if user is blocked
if ($user['status'] === 'blocked') {
    echo json_encode(['success' => false, 'message' => 'Your account has been blocked. Please contact support.']);
    exit();
}

// ✅ Update last login time
$stmt = $conn->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
$stmt->execute([$user['id']]);

// ✅ Generate JWT token
$token = generateJWT($user['id']);

// ✅ Return response
echo json_encode([
    'success' => true,
    'message' => 'Login successful',
    'token' => $token,
    'user' => [
        'id' => $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'balance' => $user['balance']
    ]
]);
?>
