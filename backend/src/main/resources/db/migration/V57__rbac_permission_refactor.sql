-- Introduce granular coupon permissions
INSERT INTO permissions (code, name)
SELECT 'COUPON_VIEW_GLOBAL', 'Coupons: View (Global)'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'COUPON_VIEW_GLOBAL');

INSERT INTO permissions (code, name)
SELECT 'COUPON_CREATE', 'Coupons: Create'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'COUPON_CREATE');

INSERT INTO permissions (code, name)
SELECT 'COUPON_UPDATE', 'Coupons: Edit'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'COUPON_UPDATE');

INSERT INTO permissions (code, name)
SELECT 'COUPON_DELETE', 'Coupons: Delete'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'COUPON_DELETE');

-- Ensure roles previously holding coupon manage receive the granular permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, p.id
FROM role_permissions rp
JOIN permissions manage ON manage.id = rp.permission_id AND manage.code = 'COUPON_MANAGE'
JOIN permissions p ON p.code IN ('COUPON_VIEW_GLOBAL', 'COUPON_CREATE', 'COUPON_UPDATE', 'COUPON_DELETE')
LEFT JOIN role_permissions existing
  ON existing.role_id = rp.role_id AND existing.permission_id = p.id
WHERE existing.role_id IS NULL;

-- Drop the legacy coupon manage permission
DELETE FROM role_permissions
WHERE permission_id IN (SELECT id FROM permissions WHERE code = 'COUPON_MANAGE');

DELETE FROM permissions WHERE code = 'COUPON_MANAGE';

-- Add dedicated permissions for payments
INSERT INTO permissions (code, name)
SELECT 'PAYMENT_VIEW', 'Payments: View'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'PAYMENT_VIEW');

INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, viewPerm.id
FROM role_permissions rp
JOIN permissions manage ON manage.id = rp.permission_id AND manage.code = 'PAYMENT_MANAGE'
JOIN permissions viewPerm ON viewPerm.code = 'PAYMENT_VIEW'
LEFT JOIN role_permissions existing
  ON existing.role_id = rp.role_id AND existing.permission_id = viewPerm.id
WHERE existing.role_id IS NULL;

-- Consolidate shipping permissions
INSERT INTO permissions (code, name)
SELECT 'SHIPPING_VIEW', 'Shipping: View'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'SHIPPING_VIEW');

INSERT INTO permissions (code, name)
SELECT 'SHIPPING_MANAGE', 'Shipping: Manage'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'SHIPPING_MANAGE');

-- Grant new shipping permissions to roles that previously had any shipping capability
INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, viewPerm.id
FROM role_permissions rp
JOIN permissions oldPerm ON oldPerm.id = rp.permission_id AND oldPerm.code IN ('SHIPPING_AREA_VIEW')
JOIN permissions viewPerm ON viewPerm.code = 'SHIPPING_VIEW'
LEFT JOIN role_permissions existing
  ON existing.role_id = rp.role_id AND existing.permission_id = viewPerm.id
WHERE existing.role_id IS NULL;

INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, managePerm.id
FROM role_permissions rp
JOIN permissions oldPerm ON oldPerm.id = rp.permission_id AND oldPerm.code IN (
    'SHIPPING_AREA_CREATE', 'SHIPPING_AREA_UPDATE', 'SHIPPING_AREA_DELETE', 'SHIPPING_LOCATION_MANAGE'
)
JOIN permissions managePerm ON managePerm.code = 'SHIPPING_MANAGE'
LEFT JOIN role_permissions existing
  ON existing.role_id = rp.role_id AND existing.permission_id = managePerm.id
WHERE existing.role_id IS NULL;

-- Remove legacy shipping permissions
DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions
    WHERE code IN ('SHIPPING_AREA_VIEW', 'SHIPPING_AREA_CREATE', 'SHIPPING_AREA_UPDATE', 'SHIPPING_AREA_DELETE', 'SHIPPING_LOCATION_MANAGE')
);

DELETE FROM permissions
WHERE code IN ('SHIPPING_AREA_VIEW', 'SHIPPING_AREA_CREATE', 'SHIPPING_AREA_UPDATE', 'SHIPPING_AREA_DELETE', 'SHIPPING_LOCATION_MANAGE');

-- Orders now reuse user permissions, so remove the legacy order manage permission
DELETE FROM role_permissions
WHERE permission_id IN (SELECT id FROM permissions WHERE code = 'ORDER_MANAGE');

DELETE FROM permissions WHERE code = 'ORDER_MANAGE';

-- Refresh naming for key system permissions
UPDATE permissions SET name = 'Settings: View' WHERE code = 'SETTINGS_VIEW';
UPDATE permissions SET name = 'Settings: Edit' WHERE code = 'SETTINGS_UPDATE';
UPDATE permissions SET name = 'Setup: Manage' WHERE code = 'SETUP_MANAGE';
UPDATE permissions SET name = 'Payments: Manage' WHERE code = 'PAYMENT_MANAGE';
UPDATE permissions SET name = 'Coupons: Create' WHERE code = 'COUPON_CREATE';
UPDATE permissions SET name = 'Coupons: Edit' WHERE code = 'COUPON_UPDATE';
UPDATE permissions SET name = 'Coupons: Delete' WHERE code = 'COUPON_DELETE';
UPDATE permissions SET name = 'Coupons: View (Global)' WHERE code = 'COUPON_VIEW_GLOBAL';
UPDATE permissions SET name = 'Shipping: View' WHERE code = 'SHIPPING_VIEW';
UPDATE permissions SET name = 'Shipping: Manage' WHERE code = 'SHIPPING_MANAGE';
UPDATE permissions SET name = 'Public: Self Profile Management' WHERE code = 'CUSTOMER_PROFILE_MANAGE';
UPDATE permissions SET name = 'Public: Self Address Management' WHERE code = 'CUSTOMER_ADDRESS_MANAGE';
UPDATE permissions SET name = 'Public: Self Checkout Management' WHERE code = 'CUSTOMER_CHECKOUT';
UPDATE permissions SET name = 'Public: Recently Viewed Products' WHERE code = 'CUSTOMER_RECENTLY_VIEWED';
