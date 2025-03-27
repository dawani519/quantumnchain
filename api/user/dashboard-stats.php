<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

include_once '../config/database.php';

// Check if it's a GET request
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    echo json_encode(['success' => false, 'message' => 'Only GET requests are allowed']);
    exit();
}

// Get Authorization header
$headers = getallheaders();
if (!isset($headers['Authorization'])) {
    echo json_encode(['success' => false, 'message' => 'Authorization header is required']);
    exit();
}

$token = str_replace('Bearer ', '', $headers['Authorization']);
$payload = verifyJWT($token);

if (!$payload) {
    echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
    exit();
}

$user_id = $payload['user_id'];

// Get user data
$stmt = $conn->prepare("SELECT id, name, email, balance, wallet_address FROM users WHERE id = ?");
$stmt->execute([$user_id]);

if ($stmt->rowCount() == 0) {
    echo json_encode(['success' => false, 'message' => 'User not found']);
    exit();
}

$user = $stmt->fetch(PDO::FETCH_ASSOC);

// Get active investments count
$stmt = $conn->prepare("SELECT COUNT(*) as active_investments FROM investments WHERE user_id = ? AND status = 'active'");
$stmt->execute([$user_id]);
$active_investments = $stmt->fetch(PDO::FETCH_ASSOC)['active_investments'];

// Get total profit
$stmt = $conn->prepare("SELECT SUM(amount) as total_profit FROM transactions WHERE user_id = ? AND type = 'profit' AND status = 'completed'");
$stmt->execute([$user_id]);
$total_profit = $stmt->fetch(PDO::FETCH_ASSOC)['total_profit'] ?? 0;

echo json_encode([
    'success' => true,
    'data' => [
        'id' => $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'balance' => (float)$user['balance'],
        'walletAddress' => $user['wallet_address'],
        'activeInvestments' => (int)$active_investments,
        'totalProfit' => (float)$total_profit
    ]
]);
?>

