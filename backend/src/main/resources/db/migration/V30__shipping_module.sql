CREATE TABLE shipping_countries (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL UNIQUE,
    code VARCHAR(10) UNIQUE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
);

CREATE TABLE shipping_states (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    country_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_shipping_states_country FOREIGN KEY (country_id) REFERENCES shipping_countries(id) ON DELETE CASCADE,
    CONSTRAINT uq_shipping_state_country_name UNIQUE (country_id, name)
);

CREATE TABLE shipping_cities (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    state_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_shipping_cities_state FOREIGN KEY (state_id) REFERENCES shipping_states(id) ON DELETE CASCADE,
    CONSTRAINT uq_shipping_city_state_name UNIQUE (state_id, name)
);

CREATE TABLE shipping_area_rates (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    country_id BIGINT NOT NULL,
    state_id BIGINT NOT NULL,
    city_id BIGINT NOT NULL,
    cost_value DECIMAL(12,2) NOT NULL,
    notes TEXT,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_shipping_area_country FOREIGN KEY (country_id) REFERENCES shipping_countries(id),
    CONSTRAINT fk_shipping_area_state FOREIGN KEY (state_id) REFERENCES shipping_states(id),
    CONSTRAINT fk_shipping_area_city FOREIGN KEY (city_id) REFERENCES shipping_cities(id),
    CONSTRAINT uq_shipping_area_unique UNIQUE (country_id, state_id, city_id)
);

CREATE INDEX idx_shipping_states_country ON shipping_states(country_id);
CREATE INDEX idx_shipping_cities_state ON shipping_cities(state_id);
CREATE INDEX idx_shipping_area_city ON shipping_area_rates(city_id);

INSERT INTO permissions (code, name) VALUES
    ('SHIPPING_LOCATION_MANAGE', 'Shipping: Manage locations'),
    ('SHIPPING_AREA_VIEW', 'Shipping: View area rates'),
    ('SHIPPING_AREA_CREATE', 'Shipping: Create area rates'),
    ('SHIPPING_AREA_UPDATE', 'Shipping: Update area rates'),
    ('SHIPPING_AREA_DELETE', 'Shipping: Delete area rates');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'SHIPPING_LOCATION_MANAGE',
    'SHIPPING_AREA_VIEW',
    'SHIPPING_AREA_CREATE',
    'SHIPPING_AREA_UPDATE',
    'SHIPPING_AREA_DELETE'
)
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN')
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
