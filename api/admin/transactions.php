<?php
// Set JSON content type and CORS headers for GET and PUT requests.
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, PUT');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

include_once '../config/database.php';

// Retrieve the Authorization header.
$headers = getallheaders();
if (!isset($headers['Authorization'])) {
    echo json_encode(['success' => false, 'message' => 'Authorization header is required']);
    exit();
}

// Remove "Bearer " from token and verify it.
$token = str_replace('Bearer ', '', $headers['Authorization']);
$payload = verifyJWT($token);

if (!$payload || !$payload['is_admin']) {
    echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
    exit();
}

// Handle different HTTP methods.
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // If a transaction ID is provided, return that transaction's details.
        if (isset($_GET['id'])) {
            getTransactionById($conn, $_GET['id']);
        } else {
            // Otherwise, return a list of transactions, filtered by search/type/status.
            getTransactions($conn);
        }
        break;
    case 'PUT':
        // Update a transaction's status (e.g., from pending to completed/failed).
        updateTransactionStatus($conn);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        break;
}

/**
 * Fetch a list of transactions with optional filters for search, type, and status,
 * and apply pagination.
 */
function getTransactions($conn) {
    $search = isset($_GET['search']) ? $_GET['search'] : '';
    $type = isset($_GET['type']) ? $_GET['type'] : 'all';
    $status = isset($_GET['status']) ? $_GET['status'] : 'all';
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $offset = ($page - 1) * $limit;

    $query = "SELECT t.id, t.type, t.amount, t.fee, t.payment_method, t.wallet_address, t.date, t.status,
                     u.id AS user_id, u.name AS user_name, u.email AS user_email
              FROM transactions t
              JOIN users u ON t.user_id = u.id";

    $params = [];
    $conditions = [];

    if (!empty($search)) {
        $conditions[] = "(t.id LIKE ? OR u.name LIKE ? OR u.email LIKE ?)";
        array_push($params, "%$search%", "%$search%", "%$search%");
    }

    if ($type !== 'all') {
        $conditions[] = "t.type = ?";
        $params[] = $type;
    }

    if ($status !== 'all') {
        $conditions[] = "t.status = ?";
        $params[] = $status;
    }

    if (!empty($conditions)) {
        $query .= " WHERE " . implode(" AND ", $conditions);
    }

    // Order by date (descending), and apply limit and offset.
    $query .= " ORDER BY t.date DESC LIMIT $limit OFFSET $offset";

    $stmt = $conn->prepare($query);
    $stmt->execute($params);
    $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get total count for pagination.
    $countQuery = "SELECT COUNT(*) as total FROM transactions t JOIN users u ON t.user_id = u.id";
    if (!empty($conditions)) {
        $countQuery .= " WHERE " . implode(" AND ", $conditions);
    }

    $stmt = $conn->prepare($countQuery);
    $stmt->execute($params);
    $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
    $totalPages = ceil($total / $limit);

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
}

/**
 * Retrieve a specific transaction by its ID.
 */
function getTransactionById($conn, $id) {
    $stmt = $conn->prepare("
        SELECT t.id, t.type, t.amount, t.fee, t.payment_method, t.wallet_address, t.date, t.status, t.description,
               u.id as user_id, u.name as user_name, u.email as user_email
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        WHERE t.id = ?
    ");
    $stmt->execute([$id]);
    
    if ($stmt->rowCount() == 0) {
        echo json_encode(['success' => false, 'message' => 'Transaction not found']);
        exit();
    }
    
    echo json_encode(['success' => true, 'data' => $stmt->fetch(PDO::FETCH_ASSOC)]);
}

/**
 * Update the status of a transaction (e.g., approve or reject).
 * If a deposit is approved (status changed to 'completed'), update the user's balance.
 * If a withdrawal is rejected (status changed to 'failed'), refund the user by adding the withdrawn amount back to their balance.
 */
function updateTransactionStatus($conn) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['id']) || !isset($data['status'])) {
        echo json_encode(['success' => false, 'message' => 'Transaction ID and status are required']);
        exit();
    }

    $transaction_id = $data['id'];
    $status = $data['status'];

    // Fetch the transaction details.
    $stmt = $conn->prepare("SELECT id, user_id, type, amount, status FROM transactions WHERE id = ?");
    $stmt->execute([$transaction_id]);

    if ($stmt->rowCount() == 0) {
        echo json_encode(['success' => false, 'message' => 'Transaction not found']);
        exit();
    }

    $transaction = $stmt->fetch(PDO::FETCH_ASSOC);

    // If the transaction already has the desired status, return early.
    if ($transaction['status'] === $status) {
        echo json_encode(['success' => true, 'message' => "Transaction status is already set to $status"]);
        exit();
    }

    // Begin database transaction for atomicity.
    $conn->beginTransaction();
    try {
        // Update the transaction status.
        $stmt = $conn->prepare("UPDATE transactions SET status = ? WHERE id = ?");
        $stmt->execute([$status, $transaction_id]);

        // If it's a deposit and the admin approves it (status 'completed'), update the user's balance.
        if ($transaction['type'] === 'deposit') {
            if ($status === 'completed') {
                $stmt = $conn->prepare("UPDATE users SET balance = balance + ? WHERE id = ?");
                $stmt->execute([$transaction['amount'], $transaction['user_id']]);
            }
        }
        // If it's a withdrawal and the admin rejects it (status 'failed'), refund the user's balance.
        if ($transaction['type'] === 'withdrawal') {
            if ($status === 'completed') {
                // Deduct the withdrawal amount from the user's balance
                $stmt = $conn->prepare("UPDATE users SET balance = balance - ? WHERE id = ?");
                $stmt->execute([$transaction['amount'], $transaction['user_id']]);
            } elseif ($status === 'failed') {
                // Refund the amount if the withdrawal is rejected
                $stmt = $conn->prepare("UPDATE users SET balance = balance + ? WHERE id = ?");
                $stmt->execute([$transaction['amount'], $transaction['user_id']]);
            }
        }
        

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Transaction status updated successfully']);
    } catch (PDOException $e) {
        $conn->rollBack();
        echo json_encode(['success' => false, 'message' => 'Transaction status update failed: ' . $e->getMessage()]);
    }
}
?>
