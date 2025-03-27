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

$user_id = (int) $payload['user_id']; // Ensure user_id is an integer

// Get query parameters with default values
$type = isset($_GET['type']) && !empty($_GET['type']) ? $_GET['type'] : 'all';
$status = isset($_GET['status']) && !empty($_GET['status']) ? $_GET['status'] : 'all';
$limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 10;
$page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
$offset = ($page - 1) * $limit;

// Validate page number
if ($page < 1) {
    echo json_encode(['success' => false, 'message' => 'Invalid page number']);
    exit();
}

// Build the query dynamically
$query = "SELECT id, type, amount, fee, payment_method, wallet_address, date, status 
          FROM transactions 
          WHERE user_id = ?";
$params = [$user_id];

if ($type !== 'all') {
    $query .= " AND type = ?";
    $params[] = $type;
}

if ($status !== 'all') {
    $query .= " AND status = ?";
    $params[] = $status;
}

// Update: Insert LIMIT and OFFSET directly as integers (no placeholders)
$query .= " ORDER BY date DESC LIMIT " . (int)$limit . " OFFSET " . (int)$offset;

try {
    // Get transactions
    $stmt = $conn->prepare($query);
    $stmt->execute($params);
    $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get total count for pagination
    $countQuery = "SELECT COUNT(*) as total FROM transactions WHERE user_id = ?";
    $countParams = [$user_id];

    if ($type !== 'all') {
        $countQuery .= " AND type = ?";
        $countParams[] = $type;
    }

    if ($status !== 'all') {
        $countQuery .= " AND status = ?";
        $countParams[] = $status;
    }

    $stmt = $conn->prepare($countQuery);
    $stmt->execute($countParams);
    $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
    $totalPages = $limit > 0 ? ceil($total / $limit) : 1;

    echo json_encode([
        'success' => true,
        'data' => $transactions,
        'pagination' => [
            'total' => (int)$total,
            'totalPages' => $totalPages,
            'currentPage' => $page,
            'limit' => $limit
        ]
    ]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
