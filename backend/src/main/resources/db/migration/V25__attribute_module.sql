CREATE TABLE attributes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(160) NOT NULL UNIQUE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
);

CREATE TABLE attribute_values (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    attribute_id BIGINT NOT NULL,
    value VARCHAR(200) NOT NULL,
    sort_order INT NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_attribute_values_attribute FOREIGN KEY (attribute_id) REFERENCES attributes(id) ON DELETE CASCADE
);

CREATE INDEX idx_attributes_name ON attributes(name);
CREATE INDEX idx_attribute_values_attribute_sort ON attribute_values(attribute_id, sort_order);

INSERT INTO permissions (code, name) VALUES
    ('ATTRIBUTE_VIEW', 'Attributes: View'),
    ('ATTRIBUTE_CREATE', 'Attributes: Create'),
    ('ATTRIBUTE_UPDATE', 'Attributes: Update'),
    ('ATTRIBUTE_DELETE', 'Attributes: Delete');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('ATTRIBUTE_VIEW', 'ATTRIBUTE_CREATE', 'ATTRIBUTE_UPDATE', 'ATTRIBUTE_DELETE')
WHERE r.code = 'SUPER_ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('ATTRIBUTE_VIEW', 'ATTRIBUTE_CREATE', 'ATTRIBUTE_UPDATE', 'ATTRIBUTE_DELETE')
WHERE r.code = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);
