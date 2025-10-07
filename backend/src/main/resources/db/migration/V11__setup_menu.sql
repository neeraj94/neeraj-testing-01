CREATE TABLE IF NOT EXISTS menu_layouts (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    layout_key VARCHAR(100) NOT NULL UNIQUE,
    structure_json TEXT NOT NULL,
    updated_by_user_id BIGINT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_menu_layouts_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO menu_layouts (layout_key, structure_json)
VALUES ('PRIMARY', '[]')
ON DUPLICATE KEY UPDATE structure_json = VALUES(structure_json);

INSERT INTO permissions (code, name)
SELECT 'SETUP_MANAGE', 'Manage Setup'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'SETUP_MANAGE');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'SETUP_MANAGE'
LEFT JOIN role_permissions rp ON rp.role_id = r.id AND rp.permission_id = p.id
WHERE r.code = 'SUPER_ADMIN' AND rp.role_id IS NULL;
