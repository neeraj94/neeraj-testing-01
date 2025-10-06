INSERT IGNORE INTO permissions (code, name) VALUES
  ('CUSTOMERS_EXPORT', 'Export Customers');

-- Ensure the super admin role can access every export capability
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
  'USERS_EXPORT',
  'ROLES_EXPORT',
  'PERMISSIONS_EXPORT',
  'INVOICES_EXPORT',
  'CUSTOMERS_EXPORT'
)
WHERE r.code = 'SUPER_ADMIN';
