CREATE TABLE IF NOT EXISTS checkout_orders (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(64) NULL,
    user_id BIGINT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'PROCESSING',
    customer_name VARCHAR(255) NULL,
    customer_email VARCHAR(255) NULL,
    summary_json LONGTEXT NULL,
    shipping_address_json LONGTEXT NULL,
    billing_address_json LONGTEXT NULL,
    payment_method_json LONGTEXT NULL,
    lines_json LONGTEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_checkout_orders_number (order_number),
    KEY idx_checkout_orders_user (user_id),
    KEY idx_checkout_orders_created (created_at)
);

