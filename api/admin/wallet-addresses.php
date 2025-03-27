<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT');
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

if (!$payload || !$payload['is_admin']) {
    echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
    exit();
}

// Handle different HTTP methods
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Get system wallet addresses
        getWalletAddresses($conn);
        break;
    case 'PUT':
        // Update system wallet addresses
        updateWalletAddresses($conn);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        break;
}

function getWalletAddresses($conn) {
    try {
        $stmt = $conn->prepare("SELECT * FROM system_settings WHERE setting_name IN ('bitcoin_wallet', 'ethereum_wallet', 'usdt_wallet')");
        $stmt->execute();
        
        $wallets = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $wallets[$row['setting_name']] = $row['setting_value'];
        }
        
        // If no wallet addresses are found, return default ones
        if (empty($wallets)) {
            $wallets = [
                'bitcoin_wallet' => 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
                'ethereum_wallet' => '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
                'usdt_wallet' => 'TKrJ3wRD1JEjJgmPH9vLsEzpvbP7Xvwvxx'
            ];
            
            // Insert default wallet addresses
            foreach ($wallets as $key => $value) {
                $stmt = $conn->prepare("INSERT INTO system_settings (setting_name, setting_value) VALUES (?, ?)");
                $stmt->execute([$key, $value]);
            }
        }
        
        echo json_encode([
            'success' => true,
            'data' => $wallets
        ]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Failed to fetch wallet addresses: ' . $e->getMessage()]);
    }
}

function updateWalletAddresses($conn) {
    // Get PUT data
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    if (!isset($data['bitcoin_wallet']) || !isset($data['ethereum_wallet']) || !isset($data['usdt_wallet'])) {
        echo json_encode(['success' => false, 'message' => 'Missing required wallet addresses']);
        exit();
    }
    
    try {
        $conn->beginTransaction();
        
        // Update each wallet address
        foreach ($data as $key => $value) {
            if (in_array($key, ['bitcoin_wallet', 'ethereum_wallet', 'usdt_wallet'])) {
                // Check if setting exists
                $stmt = $conn->prepare("SELECT COUNT(*) FROM system_settings WHERE setting_name = ?");
                $stmt->execute([$key]);
                $exists = $stmt->fetchColumn() > 0;
                
                if ($exists) {
                    $stmt = $conn->prepare("UPDATE system_settings SET setting_value = ? WHERE setting_name = ?");
                    $stmt->execute([$value, $key]);
                } else {
                    $stmt = $conn->prepare("INSERT INTO system_settings (setting_name, setting_value) VALUES (?, ?)");
                    $stmt->execute([$key, $value]);
                }
            }
        }
        
        $conn->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Wallet addresses updated successfully'
        ]);
    } catch (PDOException $e) {
        $conn->rollBack();
        echo json_encode(['success' => false, 'message' => 'Failed to update wallet addresses: ' . $e->getMessage()]);
    }
}
?>

