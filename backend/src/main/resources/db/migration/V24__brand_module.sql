CREATE TABLE brands (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(160) NOT NULL UNIQUE,
    description TEXT,
    logo_url VARCHAR(255),
    meta_title VARCHAR(200),
    meta_description TEXT,
    meta_keywords TEXT,
    meta_canonical_url VARCHAR(255),
    meta_robots VARCHAR(100),
    meta_og_title VARCHAR(200),
    meta_og_description TEXT,
    meta_og_image VARCHAR(255),
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
);

INSERT INTO permissions (code, name) VALUES
    ('BRAND_VIEW', 'Brands: View'),
    ('BRAND_CREATE', 'Brands: Create'),
    ('BRAND_UPDATE', 'Brands: Update'),
    ('BRAND_DELETE', 'Brands: Delete');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('BRAND_VIEW', 'BRAND_CREATE', 'BRAND_UPDATE', 'BRAND_DELETE')
WHERE r.code = 'SUPER_ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('BRAND_VIEW', 'BRAND_CREATE', 'BRAND_UPDATE', 'BRAND_DELETE')
WHERE r.code = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

CREATE INDEX idx_brands_name ON brands(name);
