ALTER TABLE products
    ADD COLUMN short_description TEXT AFTER description;

CREATE TABLE product_expandable_sections (
    product_id BIGINT NOT NULL,
    display_order INT NOT NULL,
    title VARCHAR(200),
    content TEXT,
    PRIMARY KEY (product_id, display_order),
    CONSTRAINT fk_product_sections_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
