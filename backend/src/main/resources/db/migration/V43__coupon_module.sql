CREATE TABLE IF NOT EXISTS coupons (
    id BIGINT NOT NULL AUTO_INCREMENT,
    type VARCHAR(30) NOT NULL,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(80) NOT NULL,
    short_description TEXT,
    long_description TEXT,
    discount_type VARCHAR(20) NOT NULL,
    discount_value DECIMAL(12, 2) NOT NULL,
    minimum_cart_value DECIMAL(12, 2),
    start_date DATETIME(6) NOT NULL,
    end_date DATETIME(6) NOT NULL,
    status VARCHAR(20) NOT NULL,
    image_url VARCHAR(500),
    apply_to_all_new_users TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_coupons_code (code),
    KEY idx_coupons_type (type),
    KEY idx_coupons_status (status),
    KEY idx_coupons_end_date (end_date)
);

CREATE TABLE IF NOT EXISTS coupon_products (
    coupon_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    PRIMARY KEY (coupon_id, product_id),
    CONSTRAINT fk_coupon_products_coupon FOREIGN KEY (coupon_id) REFERENCES coupons (id) ON DELETE CASCADE,
    CONSTRAINT fk_coupon_products_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coupon_categories (
    coupon_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    PRIMARY KEY (coupon_id, category_id),
    CONSTRAINT fk_coupon_categories_coupon FOREIGN KEY (coupon_id) REFERENCES coupons (id) ON DELETE CASCADE,
    CONSTRAINT fk_coupon_categories_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coupon_users (
    coupon_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    PRIMARY KEY (coupon_id, user_id),
    CONSTRAINT fk_coupon_users_coupon FOREIGN KEY (coupon_id) REFERENCES coupons (id) ON DELETE CASCADE,
    CONSTRAINT fk_coupon_users_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

INSERT INTO permissions (code, name)
SELECT 'COUPON_MANAGE', 'Manage Coupons'
WHERE NOT EXISTS (
    SELECT 1 FROM permissions WHERE code = 'COUPON_MANAGE'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'COUPON_MANAGE'
WHERE r.code = 'SUPER_ADMIN'
  AND NOT EXISTS (
        SELECT 1
        FROM role_permissions rp
        WHERE rp.role_id = r.id
          AND rp.permission_id = p.id
    );
