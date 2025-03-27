<?php
// calculate_profits.php - Run this script daily via cron job

// Include database configuration
include_once 'api/config/database.php';

// Get active investments
$stmt = $conn->prepare("
    SELECT i.id, i.user_id, i.amount, i.current_profit, i.profit_percentage, i.start_date, 
           CASE 
               WHEN i.package_id IS NOT NULL THEN p.daily_profit_rate 
               WHEN i.long_term_plan_id IS NOT NULL THEN l.weekly_profit_rate / 7
           END as daily_rate,
           CASE 
               WHEN i.package_id IS NOT NULL THEN 100
               WHEN i.long_term_plan_id IS NOT NULL THEN l.duration_months * 30 * (l.weekly_profit_rate / 7)
           END as max_profit_percentage
    FROM investments i
    LEFT JOIN investment_packages p ON i.package_id = p.id
    LEFT JOIN long_term_plans l ON i.long_term_plan_id = l.id
    WHERE i.status = 'active' AND i.profit_stopped = 0
");
$stmt->execute();
$investments = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($investments as $investment) {
    // Skip if profit already reached maximum
    if ($investment['profit_percentage'] >= $investment['max_profit_percentage']) {
        // Mark investment as completed
        $stmt = $conn->prepare("UPDATE investments SET status = 'completed' WHERE id = ?");
        $stmt->execute([$investment['id']]);
        continue;
    }
    
    // Calculate daily profit
    $daily_profit_amount = $investment['amount'] * ($investment['daily_rate'] / 100);
    $new_profit = $investment['current_profit'] + $daily_profit_amount;
    $new_percentage = $investment['profit_percentage'] + $investment['daily_rate'];
    
    // Start transaction
    $conn->beginTransaction();
    
    try {
        // Update investment profit
        $stmt = $conn->prepare("
            UPDATE investments 
            SET current_profit = ?, profit_percentage = ? 
            WHERE id = ?
        ");
        $stmt->execute([$new_profit, $new_percentage, $investment['id']]);
        
        // Create profit transaction
        $transaction_id = generateTransactionId();
        $stmt = $conn->prepare("
            INSERT INTO transactions (id, user_id, type, amount, date, status, investment_id, description) 
            VALUES (?, ?, 'profit', ?, NOW(), 'completed', ?, 'Daily profit')
        ");
        $stmt->execute([$transaction_id, $investment['user_id'], $daily_profit_amount, $investment['id']]);
        
        // Update user balance
        $stmt = $conn->prepare("UPDATE users SET balance = balance + ? WHERE id = ?");
        $stmt->execute([$daily_profit_amount, $investment['user_id']]);
        
        // Check if profit reached maximum after this update
        if ($new_percentage >= $investment['max_profit_percentage']) {
            // Mark investment as completed
            $stmt = $conn->prepare("UPDATE investments SET status = 'completed' WHERE id = ?");
            $stmt->execute([$investment['id']]);
        }
        
        $conn->commit();
        
        echo "Processed profit for investment ID: {$investment['id']}, Amount: \${$daily_profit_amount}\n";
    } catch (PDOException $e) {
        $conn->rollBack();
        echo "Error processing profit for investment ID: {$investment['id']}: " . $e->getMessage() . "\n";
    }
}

echo "Profit calculation completed at " . date('Y-m-d H:i:s') . "\n";
?>

