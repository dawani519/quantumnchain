<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Adjust include path: since this file is in the api folder,
// and your config folder is inside the api folder, use "config/database.php"
include_once "config/database.php";

// Retrieve the Authorization header
$headers = getallheaders();
$authHeader = isset($headers['Authorization']) 
    ? $headers['Authorization'] 
    : (isset($headers['authorization']) ? $headers['authorization'] : null);

if (!$authHeader) {
    echo json_encode(['success' => false, 'message' => 'Authorization header is required']);
    exit();
}

// Remove the "Bearer " prefix from the token
$token = str_replace("Bearer ", "", $authHeader);

// Verify the JWT token using verifyJWT() from database.php
$payload = verifyJWT($token);
if (!$payload) {
    echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
    exit();
}

// Retrieve the user ID from the token payload
$user_id = $payload['user_id'];

// Fetch user data from the database
$stmt = $conn->prepare("SELECT id, name, email, balance, wallet_address, status, registration_date, last_login, bitcoin_wallet, ethereum_wallet, usdt_wallet FROM users WHERE id = ?");
$stmt->execute([$user_id]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    echo json_encode(['success' => false, 'message' => 'User not found']);
    exit();
}

// Return user data as JSON
echo json_encode(['success' => true, 'user' => $user]);
exit();
?>
