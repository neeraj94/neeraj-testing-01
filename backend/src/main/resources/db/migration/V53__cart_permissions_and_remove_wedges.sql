-- Cart permission restructuring
INSERT INTO permissions (code, name)
SELECT 'CART_VIEW_GLOBAL', 'Carts: View (Global)'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'CART_VIEW_GLOBAL');

INSERT INTO permissions (code, name)
SELECT 'CART_CREATE', 'Carts: Create'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'CART_CREATE');

INSERT INTO permissions (code, name)
SELECT 'CART_EDIT', 'Carts: Edit'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'CART_EDIT');

INSERT INTO permissions (code, name)
SELECT 'CART_DELETE', 'Carts: Delete'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'CART_DELETE');

INSERT INTO permissions (code, name)
SELECT 'CART_EXPORT', 'Carts: Export'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'CART_EXPORT');

INSERT INTO permissions (code, name)
SELECT 'CUSTOMER_CART_MANAGE', 'Public: Cart Manage'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'CUSTOMER_CART_MANAGE');

INSERT INTO permissions (code, name)
SELECT 'CUSTOMER_CHECKOUT', 'Public: Checkout'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'CUSTOMER_CHECKOUT');

INSERT INTO permissions (code, name)
SELECT 'CUSTOMER_PROFILE_MANAGE', 'Public: Profile Manage'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'CUSTOMER_PROFILE_MANAGE');

-- Migrate role assignments from legacy cart permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, new_perm.id
FROM role_permissions rp
JOIN permissions old_perm ON old_perm.id = rp.permission_id AND old_perm.code = 'CART_VIEW'
JOIN permissions new_perm ON new_perm.code = 'CART_VIEW_GLOBAL'
LEFT JOIN role_permissions existing ON existing.role_id = rp.role_id AND existing.permission_id = new_perm.id
WHERE existing.role_id IS NULL;

INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, new_perm.id
FROM role_permissions rp
JOIN permissions old_perm ON old_perm.id = rp.permission_id AND old_perm.code = 'CART_MANAGE'
JOIN permissions new_perm ON new_perm.code IN ('CART_CREATE', 'CART_EDIT', 'CART_DELETE', 'CART_EXPORT')
LEFT JOIN role_permissions existing ON existing.role_id = rp.role_id AND existing.permission_id = new_perm.id
WHERE existing.role_id IS NULL;

-- Remove legacy cart permissions
DELETE FROM role_permissions
WHERE permission_id IN (SELECT id FROM permissions WHERE code IN ('CART_VIEW', 'CART_MANAGE'));

DELETE FROM permissions WHERE code IN ('CART_VIEW', 'CART_MANAGE');

-- Remove wedge permissions and table
DELETE FROM role_permissions
WHERE permission_id IN (SELECT id FROM permissions WHERE code LIKE 'WEDGE_%');

DELETE FROM permissions WHERE code LIKE 'WEDGE_%';

DROP TABLE IF EXISTS wedges;
