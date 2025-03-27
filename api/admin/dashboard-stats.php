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

if (!$payload || !$payload['is_admin']) {
    echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
    exit();
}

// Get total users count
$stmt = $conn->prepare("SELECT COUNT(*) as total_users FROM users");
$stmt->execute();
$total_users = $stmt->fetch(PDO::FETCH_ASSOC)['total_users'];

// Get total deposits
$stmt = $conn->prepare("SELECT SUM(amount) as total_deposits FROM transactions WHERE type = 'deposit' AND status = 'completed'");
$stmt->execute();
$total_deposits = $stmt->fetch(PDO::FETCH_ASSOC)['total_deposits'] ?? 0;

// Get total withdrawals
$stmt = $conn->prepare("SELECT SUM(amount) as total_withdrawals FROM transactions WHERE type = 'withdrawal' AND status = 'completed'");
$stmt->execute();
$total_withdrawals = $stmt->fetch(PDO::FETCH_ASSOC)['total_withdrawals'] ?? 0;

// Get active investments count
$stmt = $conn->prepare("SELECT COUNT(*) as active_investments FROM investments WHERE status = 'active'");
$stmt->execute();
$active_investments = $stmt->fetch(PDO::FETCH_ASSOC)['active_investments'];

// Get pending withdrawals
$stmt = $conn->prepare("SELECT COUNT(*) as pending_withdrawals FROM transactions WHERE type = 'withdrawal' AND status = 'pending'");
$stmt->execute();
$pending_withdrawals = $stmt->fetch(PDO::FETCH_ASSOC)['pending_withdrawals'];

echo json_encode([
    'success' => true,
    'data' => [
        'totalUsers' => (int)$total_users,
        'totalDeposits' => (float)$total_deposits,
        'totalWithdrawals' => (float)$total_withdrawals,
        'activeInvestments' => (int)$active_investments,
        'pendingWithdrawals' => (int)$pending_withdrawals
    ]
]);
?>

