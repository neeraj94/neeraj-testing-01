DELETE FROM user_permission_revocations
WHERE permission_id IN (
    SELECT id FROM permissions WHERE code LIKE 'CUSTOMER_%' OR code = 'CUSTOMERS_EXPORT'
);

DELETE FROM user_permission_overrides
WHERE permission_id IN (
    SELECT id FROM permissions WHERE code LIKE 'CUSTOMER_%' OR code = 'CUSTOMERS_EXPORT'
);

DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions WHERE code LIKE 'CUSTOMER_%' OR code = 'CUSTOMERS_EXPORT'
);

DELETE FROM permissions WHERE code LIKE 'CUSTOMER_%' OR code = 'CUSTOMERS_EXPORT';
