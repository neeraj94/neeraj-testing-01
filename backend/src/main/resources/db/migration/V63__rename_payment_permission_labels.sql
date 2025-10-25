-- Ensure payment permission labels reflect "Payment Modes"
UPDATE permissions
SET name = 'Payment Modes: Manage'
WHERE code = 'PAYMENT_MANAGE';

UPDATE permissions
SET name = 'Payment Modes: View'
WHERE code = 'PAYMENT_VIEW';
