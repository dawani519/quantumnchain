<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, PUT');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

include_once '../config/database.php';

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

// Handle different HTTP methods
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Get user wallet addresses
        getUserWalletAddresses($conn, $user_id);
        break;
    case 'PUT':
        // Update user wallet addresses
        updateUserWalletAddresses($conn, $user_id);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        break;
}

function getUserWalletAddresses($conn, $user_id) {
    try {
        $stmt = $conn->prepare("SELECT wallet_address, bitcoin_wallet, ethereum_wallet, usdt_wallet FROM users WHERE id = ?");
        $stmt->execute([$user_id]);
        
        if ($stmt->rowCount() == 0) {
            echo json_encode(['success' => false, 'message' => 'User not found']);
            exit();
        }
        
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => [
                'wallet_address' => $user['wallet_address'],
                'bitcoin_wallet' => $user['bitcoin_wallet'],
                'ethereum_wallet' => $user['ethereum_wallet'],
                'usdt_wallet' => $user['usdt_wallet']
            ]
        ]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Failed to fetch wallet addresses: ' . $e->getMessage()]);
    }
}

function updateUserWalletAddresses($conn, $user_id) {
    // Get PUT data
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Build update query
    $updateFields = [];
    $params = [];
    
    if (isset($data['wallet_address'])) {
        $updateFields[] = "wallet_address = ?";
        $params[] = $data['wallet_address'];
    }
    
    if (isset($data['bitcoin_wallet'])) {
        $updateFields[] = "bitcoin_wallet = ?";
        $params[] = $data['bitcoin_wallet'];
    }
    
    if (isset($data['ethereum_wallet'])) {
        $updateFields[] = "ethereum_wallet = ?";
        $params[] = $data['ethereum_wallet'];
    }
    
    if (isset($data['usdt_wallet'])) {
        $updateFields[] = "usdt_wallet = ?";
        $params[] = $data['usdt_wallet'];
    }
    
    if (empty($updateFields)) {
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }
    
    // Add user_id to params
    $params[] = $user_id;
    
    try {
        $query = "UPDATE users SET " . implode(", ", $updateFields) . " WHERE id = ?";
        $stmt = $conn->prepare($query);
        $stmt->execute($params);
        
        echo json_encode([
            'success' => true,
            'message' => 'Wallet addresses updated successfully'
        ]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Failed to update wallet addresses: ' . $e->getMessage()]);
    }
}
?>

