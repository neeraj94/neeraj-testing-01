CREATE TABLE blog_categories (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(160) NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
);

CREATE TABLE blog_posts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    category_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(210) NOT NULL UNIQUE,
    description LONGTEXT NOT NULL,
    banner_image VARCHAR(255),
    meta_title VARCHAR(200),
    meta_description TEXT,
    meta_keywords TEXT,
    meta_image VARCHAR(255),
    published TINYINT(1) NOT NULL DEFAULT 0,
    published_at DATETIME(6),
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_blog_posts_category FOREIGN KEY (category_id) REFERENCES blog_categories(id) ON DELETE RESTRICT
);

CREATE INDEX idx_blog_posts_category ON blog_posts(category_id);
CREATE INDEX idx_blog_posts_published ON blog_posts(published);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at);

INSERT INTO permissions (code, name) VALUES
    ('BLOG_CATEGORY_VIEW', 'Blog Categories: View'),
    ('BLOG_CATEGORY_CREATE', 'Blog Categories: Create'),
    ('BLOG_CATEGORY_UPDATE', 'Blog Categories: Update'),
    ('BLOG_CATEGORY_DELETE', 'Blog Categories: Delete'),
    ('BLOG_POST_VIEW', 'Blog Posts: View'),
    ('BLOG_POST_CREATE', 'Blog Posts: Create'),
    ('BLOG_POST_UPDATE', 'Blog Posts: Update'),
    ('BLOG_POST_DELETE', 'Blog Posts: Delete');

-- Assign new permissions to super admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'BLOG_CATEGORY_VIEW',
    'BLOG_CATEGORY_CREATE',
    'BLOG_CATEGORY_UPDATE',
    'BLOG_CATEGORY_DELETE',
    'BLOG_POST_VIEW',
    'BLOG_POST_CREATE',
    'BLOG_POST_UPDATE',
    'BLOG_POST_DELETE'
)
WHERE r.code = 'SUPER_ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- Provide blog management access to administrators by default
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'BLOG_CATEGORY_VIEW',
    'BLOG_CATEGORY_CREATE',
    'BLOG_CATEGORY_UPDATE',
    'BLOG_CATEGORY_DELETE',
    'BLOG_POST_VIEW',
    'BLOG_POST_CREATE',
    'BLOG_POST_UPDATE',
    'BLOG_POST_DELETE'
)
WHERE r.code = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);
