INSERT INTO permissions (code, name)
SELECT 'CHECKOUT_MANAGE', 'Checkout: Manage'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'CHECKOUT_MANAGE');

INSERT INTO permissions (code, name)
SELECT 'ORDER_MANAGE', 'Orders: Manage'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'ORDER_MANAGE');

INSERT INTO permissions (code, name)
SELECT 'PAYMENT_MANAGE', 'Payments: Manage'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'PAYMENT_MANAGE');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('CHECKOUT_MANAGE', 'ORDER_MANAGE', 'PAYMENT_MANAGE')
LEFT JOIN role_permissions rp ON rp.role_id = r.id AND rp.permission_id = p.id
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN')
  AND rp.role_id IS NULL;
