<?php
// Set content type to JSON and allow cross-origin requests for POST method.
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Include the database connection and helper functions (e.g., verifyJWT(), generateTransactionId())
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

// Remove "Bearer " from the token and verify it.
$token = str_replace('Bearer ', '', $headers['Authorization']);
$payload = verifyJWT($token);
if (!$payload) {
    echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
    exit();
}

$user_id = $payload['user_id'];

// Get POST data and decode it from JSON.
$data = json_decode(file_get_contents('php://input'), true);

// Validate that required fields (amount, withdrawalMethod, walletAddress) are provided.
if (!isset($data['amount']) || !isset($data['withdrawalMethod']) || !isset($data['walletAddress'])) {
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit();
}

$amount = (float)$data['amount'];
$withdrawal_method = $data['withdrawalMethod'];
$wallet_address = $data['walletAddress'];

// Validate that the withdrawal amount is at least $50.
if ($amount < 50) {
    echo json_encode(['success' => false, 'message' => 'Minimum withdrawal amount is $50']);
    exit();
}

// Check if the user has sufficient balance for the withdrawal.
// (Note: Since the withdrawal is pending, you might want to check available balance including locked funds.)
$stmt = $conn->prepare("SELECT balance FROM users WHERE id = ?");
$stmt->execute([$user_id]);
$user_balance = $stmt->fetch(PDO::FETCH_ASSOC)['balance'];

if ($amount > $user_balance) {
    echo json_encode(['success' => false, 'message' => 'Insufficient balance']);
    exit();
}

// Calculate fee (1%) and net amount.
$fee = $amount * 0.01;
$net_amount = $amount - $fee;

// Start a database transaction.
$conn->beginTransaction();

try {
    // Create a unique transaction ID.
    $transaction_id = generateTransactionId();

    // Insert the withdrawal transaction into the transactions table.
    // Note: The status is set to 'pending', meaning it awaits admin approval.
    $stmt = $conn->prepare("
        INSERT INTO transactions (id, user_id, type, amount, fee, payment_method, wallet_address, date, status) 
        VALUES (?, ?, 'withdrawal', ?, ?, ?, ?, NOW(), 'pending')
    ");
    $stmt->execute([$transaction_id, $user_id, $amount, $fee, $withdrawal_method, $wallet_address]);

    // *** Do NOT update the user's balance at this point.
    // The user's balance will be updated when an admin approves the withdrawal.

    // Commit the transaction.
    $conn->commit();

    // Return a success message indicating that the withdrawal request is pending approval.
    echo json_encode([
        'success' => true,
        'message' => 'Withdrawal request submitted successfully and is pending approval',
        'data' => [
            'transactionId' => $transaction_id,
            'amount' => $amount,
            'fee' => $fee,
            'netAmount' => $net_amount,
            'date' => date('Y-m-d H:i:s'),
            'status' => 'pending'
        ]
    ]);
} catch (PDOException $e) {
    // Roll back the transaction if an error occurs.
    $conn->rollBack();
    echo json_encode(['success' => false, 'message' => 'Withdrawal failed: ' . $e->getMessage()]);
}
?>
