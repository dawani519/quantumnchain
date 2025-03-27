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

// Get active investments
$stmt = $conn->prepare("
    SELECT i.id, i.amount, i.current_profit, i.profit_percentage, i.start_date, i.end_date,
           CASE 
               WHEN i.package_id IS NOT NULL THEN p.name 
               WHEN i.long_term_plan_id IS NOT NULL THEN l.name 
           END as plan_name
    FROM investments i
    LEFT JOIN investment_packages p ON i.package_id = p.id
    LEFT JOIN long_term_plans l ON i.long_term_plan_id = l.id
    WHERE i.user_id = ? AND i.status = 'active'
    ORDER BY i.start_date DESC
");
$stmt->execute([$user_id]);
$investments = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    'success' => true,
    'data' => $investments
]);
?>

