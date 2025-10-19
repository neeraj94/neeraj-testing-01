-- Remove deprecated cart permissions in favor of user management authorities
DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id
    FROM permissions
    WHERE code IN (
        'CART_VIEW',
        'CART_VIEW_GLOBAL',
        'CART_CREATE',
        'CART_EDIT',
        'CART_DELETE',
        'CART_EXPORT',
        'CART_MANAGE',
        'CUSTOMER_CART_MANAGE'
    )
);

DELETE FROM permissions
WHERE code IN (
    'CART_VIEW',
    'CART_VIEW_GLOBAL',
    'CART_CREATE',
    'CART_EDIT',
    'CART_DELETE',
    'CART_EXPORT',
    'CART_MANAGE',
    'CUSTOMER_CART_MANAGE'
);
