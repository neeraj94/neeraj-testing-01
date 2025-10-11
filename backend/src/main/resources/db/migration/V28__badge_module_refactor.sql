RENAME TABLE wedges TO badges;

SET @fk_name = (
    SELECT constraint_name
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE constraint_schema = DATABASE()
      AND table_name = 'badges'
      AND referenced_table_name = 'categories'
    LIMIT 1
);

SET @drop_fk = IF(@fk_name IS NOT NULL, CONCAT('ALTER TABLE badges DROP FOREIGN KEY ', @fk_name), 'SELECT 1');
PREPARE drop_fk_stmt FROM @drop_fk;
EXECUTE drop_fk_stmt;
DEALLOCATE PREPARE drop_fk_stmt;

ALTER TABLE badges CHANGE COLUMN category_id badge_category_id BIGINT;
ALTER TABLE badges RENAME INDEX idx_wedges_name TO idx_badges_name;
ALTER TABLE badges RENAME INDEX idx_wedges_default TO idx_badges_default;

CREATE TABLE IF NOT EXISTS badge_categories (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    icon_url VARCHAR(255),
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
);

CREATE INDEX idx_badge_categories_title ON badge_categories(title);

UPDATE badges SET badge_category_id = NULL;

ALTER TABLE badges
    ADD CONSTRAINT fk_badges_badge_category
        FOREIGN KEY (badge_category_id) REFERENCES badge_categories(id) ON DELETE SET NULL;

UPDATE permissions SET code = 'BADGE_VIEW', name = 'Badges: View' WHERE code = 'WEDGE_VIEW';
UPDATE permissions SET code = 'BADGE_CREATE', name = 'Badges: Create' WHERE code = 'WEDGE_CREATE';
UPDATE permissions SET code = 'BADGE_UPDATE', name = 'Badges: Update' WHERE code = 'WEDGE_UPDATE';
UPDATE permissions SET code = 'BADGE_DELETE', name = 'Badges: Delete' WHERE code = 'WEDGE_DELETE';

INSERT INTO permissions (code, name)
SELECT 'BADGE_CATEGORY_VIEW', 'Badge categories: View'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'BADGE_CATEGORY_VIEW');

INSERT INTO permissions (code, name)
SELECT 'BADGE_CATEGORY_CREATE', 'Badge categories: Create'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'BADGE_CATEGORY_CREATE');

INSERT INTO permissions (code, name)
SELECT 'BADGE_CATEGORY_UPDATE', 'Badge categories: Update'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'BADGE_CATEGORY_UPDATE');

INSERT INTO permissions (code, name)
SELECT 'BADGE_CATEGORY_DELETE', 'Badge categories: Delete'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'BADGE_CATEGORY_DELETE');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('BADGE_VIEW', 'BADGE_CREATE', 'BADGE_UPDATE', 'BADGE_DELETE',
                                 'BADGE_CATEGORY_VIEW', 'BADGE_CATEGORY_CREATE', 'BADGE_CATEGORY_UPDATE', 'BADGE_CATEGORY_DELETE')
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN')
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
