CREATE TABLE activity_logs (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    occurred_at DATETIME(6) NOT NULL,
    user_id BIGINT NULL,
    user_name VARCHAR(150) NOT NULL,
    user_role VARCHAR(150) NULL,
    department VARCHAR(150) NULL,
    module_name VARCHAR(150) NULL,
    activity_type VARCHAR(100) NOT NULL,
    description VARCHAR(1000) NULL,
    status VARCHAR(50) NULL,
    ip_address VARCHAR(45) NULL,
    device VARCHAR(150) NULL,
    context TEXT NULL
) ENGINE=InnoDB;

CREATE INDEX idx_activity_logs_occurred_at ON activity_logs (occurred_at);
CREATE INDEX idx_activity_logs_module ON activity_logs (module_name);
CREATE INDEX idx_activity_logs_activity_type ON activity_logs (activity_type);
CREATE INDEX idx_activity_logs_status ON activity_logs (status);

INSERT INTO activity_logs (
    occurred_at,
    user_id,
    user_name,
    user_role,
    department,
    module_name,
    activity_type,
    description,
    status,
    ip_address,
    device,
    context
) VALUES
('2024-03-18 09:12:35', 1, 'Super Admin', 'SUPER_ADMIN', 'Operations', 'Users', 'UPDATE',
 'Updated permissions for user "finance@demo.io" to include invoice export rights.', 'SUCCESS', '192.168.1.10', 'Chrome on macOS',
 '{"before": {"permissions": ["INVOICE_VIEW", "INVOICE_UPDATE"]}, "after": {"permissions": ["INVOICE_VIEW", "INVOICE_UPDATE", "INVOICES_EXPORT"]}}'),
('2024-03-18 10:04:18', 2, 'Admin User', 'ADMIN', 'Customer Success', 'Customers', 'CREATE',
 'Created a new customer record for "Globex Manufacturing".', 'SUCCESS', '192.168.1.24', 'Edge on Windows',
 '{"customer": {"name": "Globex Manufacturing", "email": "ops@globex.com"}}'),
('2024-03-18 10:32:49', 3, 'Finance User', 'FINANCE', 'Accounting', 'Invoices', 'EXPORT',
 'Exported 24 invoices to CSV using the finance dashboard.', 'SUCCESS', '10.10.0.54', 'Safari on iPad',
 '{"filters": {"status": "PAID", "from": "2024-02-01", "to": "2024-03-01"}, "format": "CSV"}'),
('2024-03-18 11:14:02', 2, 'Admin User', 'ADMIN', 'Customer Success', 'Users', 'DISABLE',
 'Disabled login for user "contractor@demo.io" after contract end.', 'SUCCESS', '192.168.1.24', 'Edge on Windows',
 '{"targetUser": "contractor@demo.io", "reason": "Contract expired"}'),
('2024-03-18 12:06:41', 1, 'Super Admin', 'SUPER_ADMIN', 'Operations', 'Settings', 'UPDATE',
 'Updated the primary brand color to match new guidelines.', 'SUCCESS', '192.168.1.10', 'Chrome on macOS',
 '{"before": {"appearance.primary_color": "#2563EB"}, "after": {"appearance.primary_color": "#1D4ED8"}}'),
('2024-03-18 12:25:09', 4, 'API Client', 'SYSTEM', 'Integrations', 'Auth', 'LOGIN',
 'Service account authenticated using client credentials.', 'SUCCESS', '52.32.101.18', 'API Client',
 '{"clientId": "svc-analytics", "scopes": ["analytics.read"]}'),
('2024-03-18 13:17:32', 3, 'Finance User', 'FINANCE', 'Accounting', 'Invoices', 'UPDATE',
 'Adjusted invoice INV-1001 subtotal after reconciliation.', 'SUCCESS', '10.10.0.54', 'Safari on iPad',
 '{"invoice": "INV-1001", "before": {"subtotal": 1500.00}, "after": {"subtotal": 1525.00}}'),
('2024-03-18 14:02:11', 5, 'Security Monitor', 'SYSTEM', 'Security', 'Auth', 'LOGIN',
 'Failed login attempt detected for user "admin@demo.io".', 'FAILURE', '203.0.113.45', 'Firefox on Linux',
 '{"username": "admin@demo.io", "result": "INVALID_PASSWORD"}'),
('2024-03-18 14:48:27', 2, 'Admin User', 'ADMIN', 'Customer Success', 'Customers', 'UPDATE',
 'Updated billing contact information for "Soylent Industries".', 'SUCCESS', '192.168.1.24', 'Edge on Windows',
 '{"customer": "Soylent Industries", "before": {"email": "finance@soylent.co"}, "after": {"email": "billing@soylent.co"}}'),
('2024-03-18 15:36:55', 1, 'Super Admin', 'SUPER_ADMIN', 'Operations', 'Permissions', 'DELETE',
 'Removed legacy permission "REPORT_EXPORT" from the system.', 'SUCCESS', '192.168.1.10', 'Chrome on macOS',
 '{"permission": "REPORT_EXPORT", "impact": "No active roles assigned."}');

INSERT IGNORE INTO permissions (code, name) VALUES
  ('ACTIVITY_VIEW', 'View Activity Log'),
  ('ACTIVITY_EXPORT', 'Export Activity Log');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('ACTIVITY_VIEW', 'ACTIVITY_EXPORT')
WHERE r.code IN ('SUPER_ADMIN');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'ACTIVITY_VIEW'
WHERE r.code IN ('ADMIN');
