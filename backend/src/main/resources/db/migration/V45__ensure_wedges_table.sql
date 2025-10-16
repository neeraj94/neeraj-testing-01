CREATE TABLE IF NOT EXISTS wedges (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    icon_url VARCHAR(255),
    short_description TEXT,
    long_description TEXT,
    is_default BIT NOT NULL DEFAULT 0,
    category_id BIGINT,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    KEY idx_wedges_name (name),
    KEY idx_wedges_default (is_default),
    CONSTRAINT fk_wedges_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

INSERT INTO permissions (code, name)
SELECT * FROM (SELECT 'WEDGE_VIEW', 'Wedges: View') AS tmp
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'WEDGE_VIEW');

INSERT INTO permissions (code, name)
SELECT * FROM (SELECT 'WEDGE_CREATE', 'Wedges: Create') AS tmp
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'WEDGE_CREATE');

INSERT INTO permissions (code, name)
SELECT * FROM (SELECT 'WEDGE_UPDATE', 'Wedges: Update') AS tmp
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'WEDGE_UPDATE');

INSERT INTO permissions (code, name)
SELECT * FROM (SELECT 'WEDGE_DELETE', 'Wedges: Delete') AS tmp
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'WEDGE_DELETE');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('WEDGE_VIEW', 'WEDGE_CREATE', 'WEDGE_UPDATE', 'WEDGE_DELETE')
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN')
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
