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

// Validate required fields: paymentMethod and walletAddress must be provided
if (!isset($data['paymentMethod']) || !isset($data['walletAddress'])) {
    echo json_encode(['success' => false, 'message' => 'Payment method and wallet address are required']);
    exit();
}

$payment_method = $data['paymentMethod'];
$new_wallet_address = $data['walletAddress'];

// Update the wallet_address in the users table with the provided new address
$stmt = $conn->prepare("UPDATE users SET wallet_address = ? WHERE id = ?");
$stmt->execute([$new_wallet_address, $user_id]);

// Fetch wallet addresses from the users table
$stmt = $conn->prepare("SELECT usdt_wallet, ethereum_wallet, bitcoin_wallet, wallet_address FROM users WHERE id = ?");
$stmt->execute([$user_id]);
$user_wallets = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user_wallets) {
    echo json_encode(['success' => false, 'message' => 'User wallet information not found']);
    exit();
}

echo json_encode([
    'success' => true,
    'walletAddresses' => $user_wallets
]);
exit();
?>
