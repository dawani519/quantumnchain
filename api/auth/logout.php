<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Check if it's a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Only POST requests are allowed']);
    exit();
}

// Since we're using JWT tokens stored in localStorage, 
// the actual logout happens on the client side by removing the token.
// This endpoint is just for completeness.

echo json_encode([
    'success' => true,
    'message' => 'Logout successful'
]);
?>

