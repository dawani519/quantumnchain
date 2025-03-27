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

if (!$payload) {
    echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
    exit();
}

$user_id = $payload['user_id'];

// Get POST data
$data = json_decode(file_get_contents('php://input'), true);

// Validate required fields
if (!isset($data['amount']) || !isset($data['planType']) || !isset($data['planId'])) {
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit();
}

$amount = (float)$data['amount'];
$plan_type = $data['planType']; // 'package' or 'long_term'
$plan_id = (int)$data['planId'];

// Validate amount
if ($amount <= 0) {
    echo json_encode(['success' => false, 'message' => 'Amount must be greater than zero']);
    exit();
}

// Check user balance
$stmt = $conn->prepare("SELECT balance FROM users WHERE id = ?");
$stmt->execute([$user_id]);
$user_balance = $stmt->fetch(PDO::FETCH_ASSOC)['balance'];

if ($amount > $user_balance) {
    echo json_encode(['success' => false, 'message' => 'Insufficient balance']);
    exit();
}

// Validate plan
if ($plan_type === 'package') {
    $stmt = $conn->prepare("SELECT min_amount, max_amount, duration_days FROM investment_packages WHERE id = ?");
    $stmt->execute([$plan_id]);
    
    if ($stmt->rowCount() == 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid investment package']);
        exit();
    }
    
    $package = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($amount < $package['min_amount']) {
        echo json_encode(['success' => false, 'message' => 'Amount is below the minimum for this package']);
        exit();
    }
    
    if ($package['max_amount'] !== null && $amount > $package['max_amount']) {
        echo json_encode(['success' => false, 'message' => 'Amount exceeds the maximum for this package']);
        exit();
    }
    
    $duration_days = $package['duration_days'];
    $package_id = $plan_id;
    $long_term_plan_id = null;
} else if ($plan_type === 'long_term') {
    $stmt = $conn->prepare("SELECT min_amount, duration_months FROM long_term_plans WHERE id = ?");
    $stmt->execute([$plan_id]);
    
    if ($stmt->rowCount() == 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid long-term plan']);
        exit();
    }
    
    $plan = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($amount < $plan['min_amount']) {
        echo json_encode(['success' => false, 'message' => 'Amount is below the minimum for this plan']);
        exit();
    }
    
    $duration_days = $plan['duration_months'] * 30; // Approximate
    $package_id = null;
    $long_term_plan_id = $plan_id;
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid plan type']);
    exit();
}

// Start transaction
$conn->beginTransaction();

try {
    // Create investment record
    $stmt = $conn->prepare("
        INSERT INTO investments (user_id, package_id, long_term_plan_id, amount, start_date, end_date, status) 
        VALUES (?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), 'active')
    ");
    $stmt->execute([$user_id, $package_id, $long_term_plan_id, $amount, $duration_days]);
    
    $investment_id = $conn->lastInsertId();
    
    // Create transaction record
    $transaction_id = generateTransactionId();
    $stmt = $conn->prepare("
        INSERT INTO transactions (id, user_id, type, amount, payment_method, date, status, investment_id, description) 
        VALUES (?, ?, 'deposit', ?, 'balance', NOW(), 'completed', ?, 'Investment from balance')
    ");
    $stmt->execute([$transaction_id, $user_id, $amount, $investment_id]);
    
    // Update user balance
    $stmt = $conn->prepare("UPDATE users SET balance = balance - ? WHERE id = ?");
    $stmt->execute([$amount, $user_id]);
    
    $conn->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Investment created successfully',
        'data' => [
            'investmentId' => $investment_id,
            'transactionId' => $transaction_id,
            'amount' => $amount,
            'date' => date('Y-m-d H:i:s'),
            'endDate' => date('Y-m-d H:i:s', strtotime("+$duration_days days"))
        ]
    ]);
} catch (PDOException $e) {
    $conn->rollBack();
    echo json_encode(['success' => false, 'message' => 'Investment creation failed: ' . $e->getMessage()]);
}
?>

