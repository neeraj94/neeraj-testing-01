-- Remove invoice permissions and tables
DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions WHERE code LIKE 'INVOICE_%' OR code = 'INVOICES_EXPORT'
);

DELETE FROM permissions WHERE code LIKE 'INVOICE_%' OR code = 'INVOICES_EXPORT';

DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;
