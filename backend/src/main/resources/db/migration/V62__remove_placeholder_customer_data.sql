-- Remove legacy placeholder customers and related accounting records
DELETE FROM invoice_items
WHERE invoice_id IN (
    SELECT id FROM invoices
    WHERE customer_id IN (
        SELECT id FROM customers WHERE LOWER(name) IN ('acme corporation', 'globex llc', 'soylent industries')
    )
);

DELETE FROM invoices
WHERE customer_id IN (
    SELECT id FROM customers WHERE LOWER(name) IN ('acme corporation', 'globex llc', 'soylent industries')
);

DELETE FROM customers
WHERE LOWER(name) IN ('acme corporation', 'globex llc', 'soylent industries');

-- Remove activity log entries referring to placeholder organizations
DELETE FROM activity_logs
WHERE LOWER(description) LIKE '%globex%'
   OR LOWER(description) LIKE '%soylent%'
   OR LOWER(description) LIKE '%acme%';
