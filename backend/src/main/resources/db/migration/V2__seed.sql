INSERT INTO permissions (code, name) VALUES
 ('USER_VIEW', 'View Users'),
 ('USER_CREATE', 'Create Users'),
 ('USER_UPDATE', 'Update Users'),
 ('USER_DELETE', 'Delete Users'),
 ('ROLE_VIEW', 'View Roles'),
 ('ROLE_CREATE', 'Create Roles'),
 ('ROLE_UPDATE', 'Update Roles'),
 ('ROLE_DELETE', 'Delete Roles'),
 ('PERMISSION_VIEW', 'View Permissions'),
 ('PERMISSION_CREATE', 'Create Permissions'),
 ('PERMISSION_UPDATE', 'Update Permissions'),
 ('PERMISSION_DELETE', 'Delete Permissions'),
 ('CUSTOMER_VIEW', 'View Customers'),
 ('CUSTOMER_CREATE', 'Create Customers'),
 ('CUSTOMER_UPDATE', 'Update Customers'),
 ('CUSTOMER_DELETE', 'Delete Customers'),
 ('INVOICE_VIEW', 'View Invoices'),
 ('INVOICE_CREATE', 'Create Invoices'),
 ('INVOICE_UPDATE', 'Update Invoices'),
 ('INVOICE_DELETE', 'Delete Invoices');

INSERT INTO roles (code, name) VALUES
 ('SUPER_ADMIN', 'Super Administrator'),
 ('ADMIN', 'Administrator'),
 ('FINANCE', 'Finance Manager');

-- Assign permissions to roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'SUPER_ADMIN';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('USER_VIEW', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'CUSTOMER_VIEW', 'CUSTOMER_CREATE', 'CUSTOMER_UPDATE')
WHERE r.code = 'ADMIN';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('INVOICE_VIEW', 'INVOICE_CREATE', 'INVOICE_UPDATE', 'INVOICE_DELETE', 'CUSTOMER_VIEW')
WHERE r.code = 'FINANCE';

-- Seed users
INSERT INTO users (email, password_hash, full_name)
VALUES
 ('superadmin@demo.io', '$2y$12$bq6qY/cSh3Vpvzh5nT533OqtCQkPZbHSAyGIu.vI5NbTOGByN0M0C', 'Super Admin'),
 ('admin@demo.io', '$2y$12$ZD3ZNN5QSPMqqwJ.ghPH3OKCascCvJWgNwwKVdNiNhxHCsnJHfuai', 'Admin User'),
 ('finance@demo.io', '$2y$12$4/QqzEUcSX6qeSSSzIMEt.Gu5M9I4Fv2TvbmaVbL.xSUMIaykSLIK', 'Finance User');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.code = 'SUPER_ADMIN' WHERE u.email = 'superadmin@demo.io';

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.code = 'ADMIN' WHERE u.email = 'admin@demo.io';

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.code = 'FINANCE' WHERE u.email = 'finance@demo.io';

-- Customers
INSERT INTO customers (name, email, phone, address)
VALUES
 ('Acme Corporation', 'billing@acme.io', '+1-555-0100', '123 Market Street, Springfield'),
 ('Globex LLC', 'accounts@globex.com', '+1-555-0101', '45 Industrial Ave, Metropolis'),
 ('Soylent Industries', 'finance@soylent.co', '+1-555-0102', '78 Green Way, Gotham');

-- Invoices
INSERT INTO invoices (customer_id, number, issue_date, due_date, status, subtotal, tax, total)
VALUES
 ((SELECT id FROM customers WHERE name = 'Acme Corporation'), 'INV-1001', '2024-01-05', '2024-01-20', 'SENT', 1500.00, 150.00, 1650.00),
 ((SELECT id FROM customers WHERE name = 'Globex LLC'), 'INV-1002', '2024-02-10', '2024-02-25', 'PAID', 2400.00, 240.00, 2640.00);

INSERT INTO invoice_items (invoice_id, description, qty, unit_price, line_total)
VALUES
 ((SELECT id FROM invoices WHERE number = 'INV-1001'), 'Implementation Services', 10, 120.00, 1200.00),
 ((SELECT id FROM invoices WHERE number = 'INV-1001'), 'Support Retainer', 1, 300.00, 300.00),
 ((SELECT id FROM invoices WHERE number = 'INV-1002'), 'Consulting Services', 15, 160.00, 2400.00);
