CREATE TABLE wedges (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    icon_url VARCHAR(255),
    short_description TEXT,
    long_description TEXT,
    is_default BIT NOT NULL DEFAULT 0,
    category_id BIGINT,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_wedges_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX idx_wedges_name ON wedges(name);
CREATE INDEX idx_wedges_default ON wedges(is_default);

INSERT INTO permissions (code, name) VALUES
    ('WEDGE_VIEW', 'Wedges: View'),
    ('WEDGE_CREATE', 'Wedges: Create'),
    ('WEDGE_UPDATE', 'Wedges: Update'),
    ('WEDGE_DELETE', 'Wedges: Delete');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('WEDGE_VIEW', 'WEDGE_CREATE', 'WEDGE_UPDATE', 'WEDGE_DELETE')
WHERE r.code = 'SUPER_ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('WEDGE_VIEW', 'WEDGE_CREATE', 'WEDGE_UPDATE', 'WEDGE_DELETE')
WHERE r.code = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);
