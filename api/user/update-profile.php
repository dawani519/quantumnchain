<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT');
header('Access-Control-Allow-Headers: Content-Type');

include_once '../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        getUserProfile($conn);
        break;
    case 'PUT':
        updateUserProfile($conn);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        break;
}

function getUserProfile($conn) {
    // Get user ID from query params (default to 1 if not provided)
    $user_id = isset($_GET['user_id']) ? $_GET['user_id'] : 1;

    $stmt = $conn->prepare("SELECT id, name, email, wallet_address FROM users WHERE id = ?");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit();
    }

    echo json_encode(['success' => true, 'data' => $user]);
    exit();
}

function updateUserProfile($conn) {
    // Get user ID from query params (default to 1 if not provided)
    $user_id = isset($_GET['user_id']) ? $_GET['user_id'] : 1;

    // Get input data
    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data) {
        echo json_encode(['success' => false, 'message' => 'Invalid or missing data']);
        exit();
    }

    // Debugging: Check input data
    file_put_contents('debug_log.txt', "Received Data: " . print_r($data, true) . "\n", FILE_APPEND);

    // Fetch current user data before update
    $stmt = $conn->prepare("SELECT wallet_address FROM users WHERE id = ?");
    $stmt->execute([$user_id]);
    $oldData = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$oldData) {
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit();
    }

    // Debugging: Log old wallet address
    file_put_contents('debug_log.txt', "Before Update: " . print_r($oldData, true) . "\n", FILE_APPEND);

    $updateFields = [];
    $params = [];

    if (isset($data['wallet_address'])) {
        $updateFields[] = "wallet_address = ?";
        $params[] = $data['wallet_address'];
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

        // Fetch updated data after update
        $stmt = $conn->prepare("SELECT wallet_address FROM users WHERE id = ?");
        $stmt->execute([$user_id]);
        $newData = $stmt->fetch(PDO::FETCH_ASSOC);

        // Debugging: Log new wallet address
        file_put_contents('debug_log.txt', "After Update: " . print_r($newData, true) . "\n", FILE_APPEND);

        echo json_encode([
            'success' => true,
            'message' => 'Profile updated successfully',
            'before' => $oldData,
            'after' => $newData
        ]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Update failed: ' . $e->getMessage()]);
    }
}
?>
