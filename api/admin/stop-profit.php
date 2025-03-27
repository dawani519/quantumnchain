<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

include_once '../config/database.php';

// Check if it's a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Only POST requests are allowed']);
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

// Get POST data
$data = json_decode(file_get_contents('php://input'), true);

// Validate required fields
if (!isset($data['userId'])) {
    echo json_encode(['success' => false, 'message' => 'User ID is required']);
    exit();
}

$user_id = $data['userId'];

// Check if user exists
$stmt = $conn->prepare("SELECT id FROM users WHERE id = ?");
$stmt->execute([$user_id]);

if ($stmt->rowCount() == 0) {
    echo json_encode(['success' => false, 'message' => 'User not found']);
    exit();
}

// Update all active investments for this user to stop profit increments
try {
    $stmt = $conn->prepare("UPDATE investments SET profit_stopped = 1 WHERE user_id = ? AND status = 'active'");
    $stmt->execute([$user_id]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Profit increments stopped successfully for all active investments'
    ]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Failed to stop profit increments: ' . $e->getMessage()]);
}
?>

