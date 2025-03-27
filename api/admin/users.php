<?php


ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);


header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');



include_once '../config/database.php';

$authHeader = null;
if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
} elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
    $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
} elseif (function_exists('apache_request_headers')) {
    $requestHeaders = apache_request_headers();
    if (isset($requestHeaders['Authorization'])) {
        $authHeader = $requestHeaders['Authorization'];
    } elseif (isset($requestHeaders['authorization'])) {
        $authHeader = $requestHeaders['authorization'];
    }
}

// For testing only: if no header is found, set a test token manually
if (!$authHeader) {
    // Remove this fallback when deploying to production!
    $authHeader = "Bearer eyJpYXQiOjE3NDI0MTM3MjgsImV4cCI6MTc0MjUwMDEyOCwidXNlcl9pZCI6MSwiaXNfYWRtaW4iOnRydWV9";
}

error_log("Authorization Header: " . $authHeader);

// Remove the "Bearer " prefix
$token = str_replace('Bearer ', '', $authHeader);

$payload = verifyJWT($token);

if (!$payload || !$payload['is_admin']) {
    echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
    exit();
}

// Handle different HTTP methods
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Get users list or single user
        if (isset($_GET['id'])) {
            getUserById($conn, $_GET['id']);
        } else {
            getUsers($conn);
        }
        break;
    case 'POST':
        // Create new user
        createUser($conn);
        break;
    case 'PUT':
        // Update user
        updateUser($conn);
        break;
    case 'DELETE':
        // Delete user
        deleteUser($conn);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        break;
}

function getUsers($conn) {
    // Get query parameters
    $search = isset($_GET['search']) ? $_GET['search'] : '';
    $status = isset($_GET['status']) ? $_GET['status'] : 'all';
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $offset = ($page - 1) * $limit;

    // Build the query
    $query = "SELECT id, name, email, balance, wallet_address, bitcoin_wallet, ethereum_wallet, usdt_wallet, status, registration_date FROM users";
    $params = [];

    if (!empty($search)) {
        $query .= " WHERE (name LIKE ? OR email LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
        
        if ($status !== 'all') {
            $query .= " AND status = ?";
            $params[] = $status;
        }
    } else if ($status !== 'all') {
        $query .= " WHERE status = ?";
        $params[] = $status;
    }

    // Ensure limit and offset are integers
    $limit = (int)$limit;
    $offset = (int)$offset;
    $query .= " ORDER BY id DESC LIMIT $limit OFFSET $offset";

    $stmt = $conn->prepare($query);
    $stmt->execute($params);  // $params now only contains the earlier parameters (if any)



    // Get users
    $stmt = $conn->prepare($query);
    $stmt->execute($params);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get total count for pagination
    $countQuery = "SELECT COUNT(*) as total FROM users";
    $countParams = [];

    if (!empty($search)) {
        $countQuery .= " WHERE (name LIKE ? OR email LIKE ?)";
        $countParams[] = "%$search%";
        $countParams[] = "%$search%";
        
        if ($status !== 'all') {
            $countQuery .= " AND status = ?";
            $countParams[] = $status;
        }
    } else if ($status !== 'all') {
        $countQuery .= " WHERE status = ?";
        $countParams[] = $status;
    }

    $stmt = $conn->prepare($countQuery);
    $stmt->execute($countParams);
    $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
    $totalPages = ceil($total / $limit);

    echo json_encode([
        'success' => true,
        'data' => $users,
        'pagination' => [
            'total' => (int)$total,
            'totalPages' => $totalPages,
            'currentPage' => $page,
            'limit' => $limit
        ]
    ]);
}

function getUserById($conn, $id) {
    $stmt = $conn->prepare("
        SELECT u.id, u.name, u.email, u.balance, u.wallet_address, u.bitcoin_wallet, u.ethereum_wallet, u.usdt_wallet, u.status, u.registration_date,
               (SELECT COUNT(*) FROM investments WHERE user_id = u.id AND status = 'active') as active_investments,
               (SELECT SUM(amount) FROM transactions WHERE user_id = u.id AND type = 'profit' AND status = 'completed') as total_profit
        FROM users u
        WHERE u.id = ?
    ");
    $stmt->execute([$id]);
    
    if ($stmt->rowCount() == 0) {
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit();
    }
    
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    $user['active_investments'] = (int)$user['active_investments'];
    $user['total_profit'] = (float)($user['total_profit'] ?? 0);
    
    echo json_encode([
        'success' => true,
        'data' => $user
    ]);
}

function createUser($conn) {
    // Get POST data
    $data = json_decode(file_get_contents('php://input'), true);

    // Validate required fields
    if (!isset($data['name']) || !isset($data['email']) || !isset($data['password'])) {
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit();
    }

    $name = $data['name'];
    $email = $data['email'];
    $password = $data['password'];
    $wallet_address = isset($data['walletAddress']) ? $data['walletAddress'] : null;
    $balance = isset($data['balance']) ? (float)$data['balance'] : 0;
    $status = isset($data['status']) ? $data['status'] : 'active';

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Invalid email format']);
        exit();
    }

    // Check if email already exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => false, 'message' => 'Email already exists']);
        exit();
    }

    // Hash the password
    $password_hash = hashPassword($password);

    // Insert new user
    try {
        $stmt = $conn->prepare("INSERT INTO users (name, email, password_hash, wallet_address, bitcoin_wallet, ethereum_wallet, usdt_wallet, balance, status) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$name, $email, $password_hash, $wallet_address, $bitcoin_wallet, $ethereum_wallet, $usdt_wallet, $balance, $status]);
        
        $user_id = $conn->lastInsertId();
        
        echo json_encode([
            'success' => true,
            'message' => 'User created successfully',
            'data' => [
                'id' => $user_id,
                'name' => $name,
                'email' => $email,
                'balance' => $balance,
                'walletAddress' => $wallet_address,
                'bitcoinWallet' => $bitcoin_wallet,
                'ethereumWallet' => $ethereum_wallet,
                'usdtWallet' => $usdt_Wallet,
                'status' => $status
            ]
        ]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'User creation failed: ' . $e->getMessage()]);
    }
}

function updateUser($conn) {
    // Get PUT data
    $data = json_decode(file_get_contents('php://input'), true);

    // Validate required fields
    if (!isset($data['id'])) {
        echo json_encode(['success' => false, 'message' => 'User ID is required']);
        exit();
    }

    $user_id = $data['id'];
    
    // Check if user exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE id = ?");
    $stmt->execute([$user_id]);

    if ($stmt->rowCount() == 0) {
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit();
    }

    // Build update query
    $updateFields = [];
    $params = [];

    if (isset($data['name'])) {
        $updateFields[] = "name = ?";
        $params[] = $data['name'];
    }

    if (isset($data['email'])) {
        // Validate email format
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'message' => 'Invalid email format']);
            exit();
        }
        
        // Check if email already exists for another user
        $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $stmt->execute([$data['email'], $user_id]);

        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => false, 'message' => 'Email already exists']);
            exit();
        }
        
        $updateFields[] = "email = ?";
        $params[] = $data['email'];
    }

    if (isset($data['password']) && !empty($data['password'])) {
        $updateFields[] = "password_hash = ?";
        $params[] = hashPassword($data['password']);
    }

    if (isset($data['walletAddress'])) {
        $updateFields[] = "wallet_address = ?";
        $params[] = $data['walletAddress'];
    }

    if (isset($data['bitcoinWallet'])) {
        $updateFields[] = "bitcoin_wallet = ?";
        $params[] = $data['bitcoinWallet'];
    }

    if (isset($data['ethereum wallet'])) {
        $updateFields[] = "ethereum_wallet = ?";
        $params[] = $data['ethereumWallet'];
    }

    if (isset($data['usdtWallet'])) {
        $updateFields[] = "usdt_wallet = ?";
        $params[] = $data['usdtWallet'];
    }

    if (isset($data['balance'])) {
        $updateFields[] = "balance = ?";
        $params[] = (float)$data['balance'];
    }

    if (isset($data['status'])) {
        $updateFields[] = "status = ?";
        $params[] = $data['status'];
    }

    if (empty($updateFields)) {
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    // Add user_id to params
    $params[] = $user_id;

    // Update user
    try {
        $query = "UPDATE users SET " . implode(", ", $updateFields) . " WHERE id = ?";
        $stmt = $conn->prepare($query);
        $stmt->execute($params);
        
        echo json_encode([
            'success' => true,
            'message' => 'User updated successfully'
        ]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'User update failed: ' . $e->getMessage()]);
    }
}

function deleteUser($conn) {
    // Get DELETE data
    $data = json_decode(file_get_contents('php://input'), true);

    // Validate required fields
    if (!isset($data['id'])) {
        echo json_encode(['success' => false, 'message' => 'User ID is required']);
        exit();
    }

    $user_id = $data['id'];
    
    // Check if user exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE id = ?");
    $stmt->execute([$user_id]);

    if ($stmt->rowCount() == 0) {
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit();
    }

    // Start transaction
    $conn->beginTransaction();

    try {
        // Delete user's investments
        $stmt = $conn->prepare("DELETE FROM investments WHERE user_id = ?");
        $stmt->execute([$user_id]);
        
        // Delete user's transactions
        $stmt = $conn->prepare("DELETE FROM transactions WHERE user_id = ?");
        $stmt->execute([$user_id]);
        
        // Delete user
        $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$user_id]);
        
        $conn->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'User deleted successfully'
        ]);
    } catch (PDOException $e) {
        $conn->rollBack();
        echo json_encode(['success' => false, 'message' => 'User deletion failed: ' . $e->getMessage()]);
    }
}

?>

