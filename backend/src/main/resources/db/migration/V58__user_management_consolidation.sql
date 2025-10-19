-- Ensure global user management permission exists and align naming
INSERT INTO permissions (code, name)
SELECT 'USER_VIEW_GLOBAL', 'User Management: View (Global)'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'USER_VIEW_GLOBAL');

-- Refresh naming for the consolidated User Management permissions
UPDATE permissions SET name = 'User Management: View (Global)' WHERE code = 'USER_VIEW_GLOBAL';
UPDATE permissions SET name = 'User Management: View (Own)' WHERE code = 'USER_VIEW';
UPDATE permissions SET name = 'User Management: Create' WHERE code = 'USER_CREATE';
UPDATE permissions SET name = 'User Management: Edit' WHERE code = 'USER_UPDATE';
UPDATE permissions SET name = 'User Management: Delete' WHERE code = 'USER_DELETE';

-- Assign the global view capability to roles already managing users (excluding customer roles)
INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, globalPerm.id
FROM role_permissions rp
JOIN permissions perm ON perm.id = rp.permission_id AND perm.code IN ('USER_CREATE', 'USER_UPDATE', 'USER_DELETE')
JOIN permissions globalPerm ON globalPerm.code = 'USER_VIEW_GLOBAL'
LEFT JOIN role_permissions existing ON existing.role_id = rp.role_id AND existing.permission_id = globalPerm.id
WHERE existing.role_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM roles r
    WHERE r.id = rp.role_id AND UPPER(r.code) = 'CUSTOMER'
  );

-- Grant the global view permission to non-customer roles that previously held scoped user view access
INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, globalPerm.id
FROM role_permissions rp
JOIN permissions perm ON perm.id = rp.permission_id AND perm.code = 'USER_VIEW'
JOIN permissions globalPerm ON globalPerm.code = 'USER_VIEW_GLOBAL'
LEFT JOIN role_permissions existing ON existing.role_id = rp.role_id AND existing.permission_id = globalPerm.id
WHERE existing.role_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM roles r
    WHERE r.id = rp.role_id AND UPPER(r.code) = 'CUSTOMER'
  );
