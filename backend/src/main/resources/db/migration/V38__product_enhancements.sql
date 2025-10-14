UPDATE products
SET sku = CONCAT('LEGACY-', LPAD(id, 8, '0'))
WHERE sku IS NULL OR sku = '';

ALTER TABLE products
    MODIFY sku VARCHAR(160) NOT NULL;

CREATE UNIQUE INDEX uk_products_sku ON products (sku);

ALTER TABLE products
    ADD COLUMN discount_start_at DATETIME(6) NULL,
    ADD COLUMN discount_end_at DATETIME(6) NULL;

CREATE TABLE product_tags (
    product_id BIGINT NOT NULL,
    display_order INT NOT NULL,
    tag_value VARCHAR(120) NOT NULL,
    PRIMARY KEY (product_id, display_order),
    CONSTRAINT fk_product_tags_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB;

ALTER TABLE products
    DROP COLUMN price_tag;
