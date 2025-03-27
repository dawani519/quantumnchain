<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

include_once "../config/database.php"; // Ensure this path is correct

// For testing, we remove authentication and simply use a GET parameter for user_id.
// If no user_id is provided, default to 1 (adjust as needed).
$user_id = isset($_GET['user_id']) ? $_GET['user_id'] : 1;

// Fetch user data from the database
$stmt = $conn->prepare("SELECT id, name, email, balance, wallet_address, status, registration_date, last_login, bitcoin_wallet, ethereum_wallet, usdt_wallet FROM users WHERE id = ?");
$stmt->execute([$user_id]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    echo json_encode(['success' => false, 'message' => 'User not found']);
    exit();
}

// Return user data as JSON
echo json_encode(['success' => true, 'data' => $user]);
exit();
?>
