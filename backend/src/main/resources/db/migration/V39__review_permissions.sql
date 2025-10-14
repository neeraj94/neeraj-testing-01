INSERT INTO permissions (code, name)
SELECT 'PRODUCT_REVIEW_VIEW', 'Product Reviews: View'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'PRODUCT_REVIEW_VIEW');

INSERT INTO permissions (code, name)
SELECT 'PRODUCT_REVIEW_CREATE', 'Product Reviews: Create'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'PRODUCT_REVIEW_CREATE');

INSERT INTO permissions (code, name)
SELECT 'PRODUCT_REVIEW_UPDATE', 'Product Reviews: Update'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'PRODUCT_REVIEW_UPDATE');

INSERT INTO permissions (code, name)
SELECT 'PRODUCT_REVIEW_DELETE', 'Product Reviews: Delete'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'PRODUCT_REVIEW_DELETE');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'PRODUCT_REVIEW_VIEW'
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'PRODUCT_REVIEW_CREATE'
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'PRODUCT_REVIEW_UPDATE'
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'PRODUCT_REVIEW_DELETE'
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
