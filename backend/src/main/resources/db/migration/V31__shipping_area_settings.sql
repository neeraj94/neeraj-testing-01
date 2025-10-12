ALTER TABLE shipping_countries
    ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT FALSE AFTER code,
    ADD COLUMN base_cost DECIMAL(12,2) NULL AFTER enabled;

ALTER TABLE shipping_states
    ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT FALSE AFTER name,
    ADD COLUMN override_cost DECIMAL(12,2) NULL AFTER enabled;

ALTER TABLE shipping_cities
    ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT FALSE AFTER name,
    ADD COLUMN override_cost DECIMAL(12,2) NULL AFTER enabled;
