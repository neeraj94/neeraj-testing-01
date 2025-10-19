-- Expand default customer permissions for address management and recently viewed products
INSERT INTO permissions (code, name)
SELECT 'CUSTOMER_ADDRESS_MANAGE', 'Public: Address Management'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'CUSTOMER_ADDRESS_MANAGE');

INSERT INTO permissions (code, name)
SELECT 'CUSTOMER_RECENTLY_VIEWED', 'Public: Recently Viewed Products'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'CUSTOMER_RECENTLY_VIEWED');
