<?php
// Database configuration
$host = 'localhost';
$db_name = 'quantum_chain';
$username = 'root';
$password = 'admin123'; // Change this to your actual database password

try {
    $conn = new PDO("mysql:host=$host;dbname=$db_name", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Connection Error: ' . $e->getMessage()]);
    die();
}

// Function to generate a unique transaction ID
function generateTransactionId() {
    return 'TX' . strtoupper(substr(uniqid(), 0, 8));
}

// Function to generate a secure password hash
function hashPassword($password) {
    return password_hash($password, PASSWORD_BCRYPT);
}

// Function to verify password
function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

// Function to generate a JWT token
function generateJWT($user_id, $is_admin = false) {
    $secret_key = "quantum_chain_secret_key"; // Change this to a secure random string
    $issued_at = time();
    $expiration = $issued_at + (60 * 60 * 24); // Valid for 24 hours
    
    $payload = [
        'iat' => $issued_at,
        'exp' => $expiration,
        'user_id' => $user_id,
        'is_admin' => $is_admin
    ];
    
    $jwt = base64_encode(json_encode($payload));
    
    return $jwt;
}

// Function to verify JWT token
function verifyJWT($token) {
    $secret_key = "quantum_chain_secret_key"; // Same as above
    
    try {
        $payload = json_decode(base64_decode($token), true);
        
        if (!$payload || !isset($payload['exp']) || !isset($payload['user_id'])) {
            return false;
        }
        
        if ($payload['exp'] < time()) {
            return false; // Token expired
        }
        
        return $payload;
    } catch (Exception $e) {
        return false;
    }
}
?>

