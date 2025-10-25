CREATE TABLE status_config (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(40) NOT NULL,
    color_code VARCHAR(10) NOT NULL,
    icon VARCHAR(255) NULL,
    description TEXT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by BIGINT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_status_config_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_status_config_category CHECK (category IN ('ORDER'))
) ENGINE=InnoDB;

CREATE INDEX idx_status_config_category ON status_config (category);
CREATE INDEX idx_status_config_default ON status_config (category, is_default);

INSERT INTO permissions (code, name)
SELECT 'CONFIG.STATUS.VIEW', 'Status Configuration: View'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'CONFIG.STATUS.VIEW');

INSERT INTO permissions (code, name)
SELECT 'CONFIG.STATUS.MANAGE', 'Status Configuration: Manage'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'CONFIG.STATUS.MANAGE');

DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions WHERE code IN (
        'CONFIG.ORDER_STATUS.VIEW',
        'CONFIG.ORDER_STATUS.MANAGE',
        'CONFIG.PAYMENT_STATUS.VIEW',
        'CONFIG.PAYMENT_STATUS.MANAGE'
    )
);

DELETE FROM permissions
WHERE code IN (
    'CONFIG.ORDER_STATUS.VIEW',
    'CONFIG.ORDER_STATUS.MANAGE',
    'CONFIG.PAYMENT_STATUS.VIEW',
    'CONFIG.PAYMENT_STATUS.MANAGE'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'CONFIG.STATUS.VIEW'
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN')
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'CONFIG.STATUS.MANAGE'
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN')
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
