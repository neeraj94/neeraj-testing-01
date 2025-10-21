-- Align customer permission codes and descriptions with role-based storefront flows
UPDATE permissions
SET code = 'CUSTOMER_MANAGE_PROFILE',
    name = 'Public: Manage Profile',
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'CUSTOMER_PROFILE_MANAGE';

UPDATE permissions
SET code = 'CUSTOMER_MANAGE_ADDRESSES',
    name = 'Public: Manage Addresses',
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'CUSTOMER_ADDRESS_MANAGE';

UPDATE permissions
SET code = 'CUSTOMER_MANAGE_CHECKOUT',
    name = 'Public: Manage Checkout',
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'CUSTOMER_CHECKOUT';

UPDATE permissions
SET code = 'CUSTOMER_VIEW_RECENTLY_VIEWED_PRODUCTS',
    name = 'Public: Recently Viewed Products',
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'CUSTOMER_RECENTLY_VIEWED';

INSERT INTO permissions (code, name)
SELECT 'CUSTOMER_VIEW_ORDER_HISTORY', 'Public: View Order History'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'CUSTOMER_VIEW_ORDER_HISTORY');

INSERT INTO permissions (code, name)
SELECT 'CUSTOMER_VIEW_PROFILE', 'Public: View Profile'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'CUSTOMER_VIEW_PROFILE');

INSERT INTO permissions (code, name)
SELECT 'CUSTOMER_MANAGE_PROFILE', 'Public: Manage Profile'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'CUSTOMER_MANAGE_PROFILE');

INSERT INTO permissions (code, name)
SELECT 'CUSTOMER_MANAGE_ADDRESSES', 'Public: Manage Addresses'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'CUSTOMER_MANAGE_ADDRESSES');

INSERT INTO permissions (code, name)
SELECT 'CUSTOMER_MANAGE_CHECKOUT', 'Public: Manage Checkout'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'CUSTOMER_MANAGE_CHECKOUT');

INSERT INTO permissions (code, name)
SELECT 'CUSTOMER_VIEW_RECENTLY_VIEWED_PRODUCTS', 'Public: Recently Viewed Products'
WHERE NOT EXISTS (
    SELECT 1 FROM permissions WHERE code = 'CUSTOMER_VIEW_RECENTLY_VIEWED_PRODUCTS'
);

INSERT INTO permissions (code, name)
SELECT 'CUSTOMER_PLACE_ORDER', 'Public: Place Orders'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'CUSTOMER_PLACE_ORDER');

INSERT INTO permissions (code, name)
SELECT 'CUSTOMER_MANAGE_CART', 'Public: Manage Cart'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'CUSTOMER_MANAGE_CART');
