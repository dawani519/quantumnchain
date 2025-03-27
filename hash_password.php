<?php
$newPassword = "admin123"; // Change this to your new password
$hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);

echo "Hashed Password: " . $hashedPassword;
?>
