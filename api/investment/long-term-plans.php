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

// Get long-term plans
$stmt = $conn->prepare("SELECT id, name, duration_months, weekly_profit_rate, min_amount, early_withdrawal_fee, description FROM long_term_plans ORDER BY duration_months ASC");
$stmt->execute();
$plans = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    'success' => true,
    'data' => $plans
]);
?>

