-- Align previously seeded ORDER_UPDATE permission with the renamed ORDER_EDIT key
UPDATE permissions
SET code = 'ORDER_EDIT', name = 'Order Management: Edit'
WHERE code = 'ORDER_UPDATE';

-- Update role assignments to reference the renamed permission
UPDATE role_permissions rp
SET permission_id = (
    SELECT id FROM permissions WHERE code = 'ORDER_EDIT'
)
WHERE rp.permission_id = (
    SELECT id FROM permissions WHERE code = 'ORDER_UPDATE' LIMIT 1
);
