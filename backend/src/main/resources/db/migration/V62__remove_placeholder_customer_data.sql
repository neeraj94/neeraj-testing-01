-- Remove legacy placeholder customers seeded for the legacy invoice module
DELETE FROM customers
WHERE LOWER(name) IN ('acme corporation', 'globex llc', 'soylent industries');

-- Remove activity log entries referring to placeholder organizations
DELETE FROM activity_logs
WHERE LOWER(description) LIKE '%globex%'
   OR LOWER(description) LIKE '%soylent%'
   OR LOWER(description) LIKE '%acme%';
