CREATE TABLE IF NOT EXISTS product_frequently_bought_products (
    product_id BIGINT NOT NULL,
    related_product_id BIGINT NOT NULL,
    PRIMARY KEY (product_id, related_product_id),
    CONSTRAINT fk_fbp_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    CONSTRAINT fk_fbp_related FOREIGN KEY (related_product_id) REFERENCES products (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_frequently_bought_categories (
    product_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    PRIMARY KEY (product_id, category_id),
    CONSTRAINT fk_fbc_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    CONSTRAINT fk_fbc_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
);
