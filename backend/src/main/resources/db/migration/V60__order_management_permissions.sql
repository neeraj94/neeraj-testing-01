-- Seed dedicated order management permissions
INSERT INTO permissions (code, name)
SELECT 'ORDER_VIEW_GLOBAL', 'Order Management: View (Global)'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'ORDER_VIEW_GLOBAL');

INSERT INTO permissions (code, name)
SELECT 'ORDER_CREATE', 'Order Management: Create'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'ORDER_CREATE');

INSERT INTO permissions (code, name)
SELECT 'ORDER_UPDATE', 'Order Management: Edit'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'ORDER_UPDATE');

INSERT INTO permissions (code, name)
SELECT 'ORDER_DELETE', 'Order Management: Delete'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'ORDER_DELETE');

-- Align naming
UPDATE permissions SET name = 'Order Management: View (Global)' WHERE code = 'ORDER_VIEW_GLOBAL';
UPDATE permissions SET name = 'Order Management: Create' WHERE code = 'ORDER_CREATE';
UPDATE permissions SET name = 'Order Management: Edit' WHERE code = 'ORDER_UPDATE';
UPDATE permissions SET name = 'Order Management: Delete' WHERE code = 'ORDER_DELETE';

-- Grant order view access to roles that could previously view users globally
INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, orderView.id
FROM role_permissions rp
JOIN permissions perm ON perm.id = rp.permission_id AND perm.code = 'USER_VIEW_GLOBAL'
JOIN permissions orderView ON orderView.code = 'ORDER_VIEW_GLOBAL'
LEFT JOIN role_permissions existing ON existing.role_id = rp.role_id AND existing.permission_id = orderView.id
WHERE existing.role_id IS NULL;

-- Grant order create access to roles that could create users
INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, orderCreate.id
FROM role_permissions rp
JOIN permissions perm ON perm.id = rp.permission_id AND perm.code = 'USER_CREATE'
JOIN permissions orderCreate ON orderCreate.code = 'ORDER_CREATE'
LEFT JOIN role_permissions existing ON existing.role_id = rp.role_id AND existing.permission_id = orderCreate.id
WHERE existing.role_id IS NULL;

-- Grant order update access to roles that could update users
INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, orderUpdate.id
FROM role_permissions rp
JOIN permissions perm ON perm.id = rp.permission_id AND perm.code = 'USER_UPDATE'
JOIN permissions orderUpdate ON orderUpdate.code = 'ORDER_UPDATE'
LEFT JOIN role_permissions existing ON existing.role_id = rp.role_id AND existing.permission_id = orderUpdate.id
WHERE existing.role_id IS NULL;

-- Grant order delete access to roles that could delete users
INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, orderDelete.id
FROM role_permissions rp
JOIN permissions perm ON perm.id = rp.permission_id AND perm.code = 'USER_DELETE'
JOIN permissions orderDelete ON orderDelete.code = 'ORDER_DELETE'
LEFT JOIN role_permissions existing ON existing.role_id = rp.role_id AND existing.permission_id = orderDelete.id
WHERE existing.role_id IS NULL;
