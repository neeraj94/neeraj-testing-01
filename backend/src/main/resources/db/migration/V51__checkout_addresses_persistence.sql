CREATE TABLE IF NOT EXISTS checkout_addresses (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    address_type VARCHAR(20) NOT NULL,
    country_id BIGINT NULL,
    state_id BIGINT NULL,
    city_id BIGINT NULL,
    full_name VARCHAR(160) NOT NULL,
    mobile_number VARCHAR(40) NOT NULL,
    pin_code VARCHAR(20) NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255) NULL,
    landmark VARCHAR(255) NULL,
    default_address BIT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_checkout_address_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_checkout_address_country FOREIGN KEY (country_id) REFERENCES shipping_countries(id) ON DELETE SET NULL,
    CONSTRAINT fk_checkout_address_state FOREIGN KEY (state_id) REFERENCES shipping_states(id) ON DELETE SET NULL,
    CONSTRAINT fk_checkout_address_city FOREIGN KEY (city_id) REFERENCES shipping_cities(id) ON DELETE SET NULL
);

CREATE INDEX idx_checkout_addresses_user ON checkout_addresses (user_id, address_type);
CREATE INDEX idx_checkout_addresses_default ON checkout_addresses (user_id, address_type, default_address);
