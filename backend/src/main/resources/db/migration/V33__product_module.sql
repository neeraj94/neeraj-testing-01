CREATE TABLE products (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    brand_id BIGINT,
    name VARCHAR(200) NOT NULL,
    unit VARCHAR(100) NOT NULL,
    weight_kg DECIMAL(12,3),
    min_purchase_quantity INT,
    featured BIT NOT NULL DEFAULT 0,
    todays_deal BIT NOT NULL DEFAULT 0,
    description TEXT,
    video_provider VARCHAR(50),
    video_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    thumbnail_storage_key VARCHAR(255),
    thumbnail_original_filename VARCHAR(255),
    thumbnail_mime_type VARCHAR(150),
    thumbnail_size_bytes BIGINT,
    pdf_url VARCHAR(500),
    pdf_storage_key VARCHAR(255),
    pdf_original_filename VARCHAR(255),
    pdf_mime_type VARCHAR(150),
    pdf_size_bytes BIGINT,
    meta_image_url VARCHAR(500),
    meta_image_storage_key VARCHAR(255),
    meta_image_original_filename VARCHAR(255),
    meta_image_mime_type VARCHAR(150),
    meta_image_size_bytes BIGINT,
    meta_title VARCHAR(200),
    meta_description TEXT,
    meta_keywords TEXT,
    meta_canonical_url VARCHAR(255),
    price_tag VARCHAR(120),
    unit_price DECIMAL(12,2),
    discount_type VARCHAR(20),
    discount_value DECIMAL(12,2),
    discount_min_qty INT,
    discount_max_qty INT,
    stock_quantity INT,
    sku VARCHAR(160),
    external_link VARCHAR(500),
    external_link_button VARCHAR(120),
    low_stock_warning INT,
    stock_visibility VARCHAR(20),
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL
);

CREATE TABLE product_categories (
    product_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    PRIMARY KEY (product_id, category_id),
    CONSTRAINT fk_product_categories_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_product_categories_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE product_tax_rates (
    product_id BIGINT NOT NULL,
    tax_rate_id BIGINT NOT NULL,
    PRIMARY KEY (product_id, tax_rate_id),
    CONSTRAINT fk_product_tax_rates_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_product_tax_rates_tax FOREIGN KEY (tax_rate_id) REFERENCES tax_rates(id) ON DELETE CASCADE
);

CREATE TABLE product_attribute_values (
    product_id BIGINT NOT NULL,
    attribute_value_id BIGINT NOT NULL,
    PRIMARY KEY (product_id, attribute_value_id),
    CONSTRAINT fk_product_attribute_values_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_product_attribute_values_value FOREIGN KEY (attribute_value_id) REFERENCES attribute_values(id) ON DELETE CASCADE
);

CREATE TABLE product_gallery_images (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    image_storage_key VARCHAR(255),
    image_original_filename VARCHAR(255),
    image_mime_type VARCHAR(150),
    image_size_bytes BIGINT,
    display_order INT,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_product_gallery_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE product_variants (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    variant_key VARCHAR(200) NOT NULL,
    price_adjustment DECIMAL(12,2),
    sku VARCHAR(160),
    quantity INT,
    display_order INT,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_product_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE product_variant_values (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    variant_id BIGINT NOT NULL,
    attribute_value_id BIGINT NOT NULL,
    position INT,
    CONSTRAINT fk_variant_values_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    CONSTRAINT fk_variant_values_attribute FOREIGN KEY (attribute_value_id) REFERENCES attribute_values(id) ON DELETE CASCADE
);

CREATE TABLE product_variant_media (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    variant_id BIGINT NOT NULL,
    media_url VARCHAR(500) NOT NULL,
    media_storage_key VARCHAR(255),
    media_original_filename VARCHAR(255),
    media_mime_type VARCHAR(150),
    media_size_bytes BIGINT,
    display_order INT,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_variant_media_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
);

CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_product_gallery_product ON product_gallery_images(product_id);
CREATE INDEX idx_product_variants_product ON product_variants(product_id);
CREATE INDEX idx_product_variant_values_variant ON product_variant_values(variant_id);

INSERT INTO permissions (code, name) VALUES
    ('PRODUCT_VIEW', 'Products: View'),
    ('PRODUCT_CREATE', 'Products: Create'),
    ('PRODUCT_UPDATE', 'Products: Update'),
    ('PRODUCT_DELETE', 'Products: Delete');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('PRODUCT_VIEW', 'PRODUCT_CREATE', 'PRODUCT_UPDATE', 'PRODUCT_DELETE')
WHERE r.code = 'SUPER_ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('PRODUCT_VIEW', 'PRODUCT_CREATE', 'PRODUCT_UPDATE', 'PRODUCT_DELETE')
WHERE r.code = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);
