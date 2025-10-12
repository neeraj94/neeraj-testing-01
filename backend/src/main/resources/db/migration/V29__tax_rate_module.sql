CREATE TABLE tax_rates (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL UNIQUE,
    rate_type VARCHAR(20) NOT NULL,
    rate_value DECIMAL(12,4) NOT NULL,
    description TEXT,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
);

INSERT INTO permissions (code, name) VALUES
    ('TAX_RATE_VIEW', 'Tax rates: View'),
    ('TAX_RATE_CREATE', 'Tax rates: Create'),
    ('TAX_RATE_UPDATE', 'Tax rates: Update'),
    ('TAX_RATE_DELETE', 'Tax rates: Delete');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('TAX_RATE_VIEW', 'TAX_RATE_CREATE', 'TAX_RATE_UPDATE', 'TAX_RATE_DELETE')
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN', 'FINANCE')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

CREATE INDEX idx_tax_rates_name ON tax_rates(name);
CREATE INDEX idx_tax_rates_type ON tax_rates(rate_type);
