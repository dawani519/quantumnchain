<?php
// Set content type to JSON and allow cross-origin requests.
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

include_once '../config/database.php';

// Ensure the request method is POST.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Only POST requests are allowed']);
    exit();
}

// Retrieve the Authorization header.
$headers = getallheaders();
if (!isset($headers['Authorization'])) {
    echo json_encode(['success' => false, 'message' => 'Authorization header is required']);
    exit();
}

// Remove the "Bearer " prefix from the token and verify it.
$token = str_replace('Bearer ', '', $headers['Authorization']);
$payload = verifyJWT($token);
if (!$payload) {
    echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
    exit();
}

$user_id = $payload['user_id'];

// Get POST data and decode it from JSON.
$data = json_decode(file_get_contents('php://input'), true);

// Validate that required fields (amount, paymentMethod, and packageId) are provided.
if (!isset($data['amount']) || !isset($data['paymentMethod']) || !isset($data['packageId'])) {
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit();
}

$amount = (float)$data['amount'];
$payment_method = $data['paymentMethod'];
$package_id = (int)$data['packageId'];

// Validate that amount is greater than zero.
if ($amount <= 0) {
    echo json_encode(['success' => false, 'message' => 'Amount must be greater than zero']);
    exit();
}

// Check if the investment package exists and validate amount against package limits.
$stmt = $conn->prepare("SELECT min_amount, max_amount, duration_days FROM investment_packages WHERE id = ?");
$stmt->execute([$package_id]);
if ($stmt->rowCount() == 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid investment package']);
    exit();
}
$package = $stmt->fetch(PDO::FETCH_ASSOC);

// Check if the deposit amount meets the package minimum and maximum limits.
if ($amount < $package['min_amount']) {
    echo json_encode(['success' => false, 'message' => 'Amount is below the minimum for this package']);
    exit();
}
if ($package['max_amount'] !== null && $amount > $package['max_amount']) {
    echo json_encode(['success' => false, 'message' => 'Amount exceeds the maximum for this package']);
    exit();
}

// Start a database transaction to ensure atomicity.
$conn->beginTransaction();

try {
    // Create a new transaction record with a status of 'pending'.
    // (This deposit will be pending until admin approval.)
    $transaction_id = generateTransactionId();
    $stmt = $conn->prepare("
        INSERT INTO transactions (id, user_id, type, amount, payment_method, date, status) 
        VALUES (?, ?, 'deposit', ?, ?, NOW(), 'pending')
    ");
    $stmt->execute([$transaction_id, $user_id, $amount, $payment_method]);
    
    // Create an investment record with a status of 'pending' as well.
    // (This record will be finalized once the admin approves the deposit.)
    $stmt = $conn->prepare("
        INSERT INTO investments (user_id, package_id, amount, start_date, end_date, status) 
        VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), 'pending')
    ");
    $stmt->execute([$user_id, $package_id, $amount, $package['duration_days']]);
    
    // Retrieve the investment record ID.
    $investment_id = $conn->lastInsertId();
    
    // Update the transaction record to reference the investment record.
    $stmt = $conn->prepare("UPDATE transactions SET investment_id = ? WHERE id = ?");
    $stmt->execute([$investment_id, $transaction_id]);
    
    // *** Note: User balance is NOT updated here because the deposit is pending approval.
    
    // Commit the transaction.
    $conn->commit();
    
    // Return a success message indicating that the deposit is pending approval.
    echo json_encode([
        'success' => true,
        'message' => 'Deposit submitted and is pending approval',
        'data' => [
            'transactionId' => $transaction_id,
            'investmentId' => $investment_id,
            'amount' => $amount,
            'date' => date('Y-m-d H:i:s')
        ]
    ]);
} catch (PDOException $e) {
    // Roll back the transaction if any error occurs.
    $conn->rollBack();
    echo json_encode(['success' => false, 'message' => 'Deposit failed: ' . $e->getMessage()]);
}
?>
