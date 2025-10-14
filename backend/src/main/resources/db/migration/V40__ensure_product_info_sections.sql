CREATE TABLE IF NOT EXISTS product_info_sections (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    display_order INT,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_product_info_sections_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_info_section_bullets (
    section_id BIGINT NOT NULL,
    bullet_order INT NOT NULL,
    bullet_text VARCHAR(500) NOT NULL,
    PRIMARY KEY (section_id, bullet_order),
    CONSTRAINT fk_product_info_section_bullets_section FOREIGN KEY (section_id) REFERENCES product_info_sections(id) ON DELETE CASCADE
);
