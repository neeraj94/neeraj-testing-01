CREATE TABLE product_reviews (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    customer_id BIGINT,
    reviewer_name VARCHAR(150),
    reviewer_avatar_url VARCHAR(500),
    reviewer_avatar_storage_key VARCHAR(255),
    reviewer_avatar_original_filename VARCHAR(255),
    reviewer_avatar_mime_type VARCHAR(150),
    reviewer_avatar_size_bytes BIGINT,
    rating INT NOT NULL,
    comment TEXT,
    reviewed_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_product_reviews_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

CREATE TABLE product_review_media (
    review_id BIGINT NOT NULL,
    display_order INT NOT NULL,
    media_url VARCHAR(500),
    media_storage_key VARCHAR(255),
    media_original_filename VARCHAR(255),
    media_mime_type VARCHAR(150),
    media_size_bytes BIGINT,
    PRIMARY KEY (review_id, display_order),
    CONSTRAINT fk_product_review_media_review FOREIGN KEY (review_id) REFERENCES product_reviews(id) ON DELETE CASCADE
);
