CREATE TABLE IF NOT EXISTS coupons (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(30) NOT NULL,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(80) NOT NULL,
    short_description TEXT,
    long_description TEXT,
    discount_type VARCHAR(20) NOT NULL,
    discount_value NUMERIC(12, 2) NOT NULL,
    minimum_cart_value NUMERIC(12, 2),
    start_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    end_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL,
    image_url VARCHAR(500),
    apply_to_all_new_users BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_coupons_code ON coupons (LOWER(code));
CREATE INDEX IF NOT EXISTS idx_coupons_type ON coupons (type);
CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons (status);
CREATE INDEX IF NOT EXISTS idx_coupons_end_date ON coupons (end_date);

CREATE TABLE IF NOT EXISTS coupon_products (
    coupon_id BIGINT NOT NULL REFERENCES coupons (id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    PRIMARY KEY (coupon_id, product_id)
);

CREATE TABLE IF NOT EXISTS coupon_categories (
    coupon_id BIGINT NOT NULL REFERENCES coupons (id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
    PRIMARY KEY (coupon_id, category_id)
);

CREATE TABLE IF NOT EXISTS coupon_users (
    coupon_id BIGINT NOT NULL REFERENCES coupons (id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    PRIMARY KEY (coupon_id, user_id)
);

INSERT INTO permissions (code, name)
VALUES ('COUPON_MANAGE', 'Manage Coupons')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'COUPON_MANAGE'
WHERE r.code = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;
