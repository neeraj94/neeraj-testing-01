CREATE TABLE IF NOT EXISTS status_types (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(40) NOT NULL UNIQUE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS statuses (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    status_type_id BIGINT NOT NULL,
    name VARCHAR(80) NOT NULL,
    code VARCHAR(80) NOT NULL,
    icon TEXT NULL,
    color_hex CHAR(7) NULL,
    description TEXT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    visible_to_customer BOOLEAN NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 1000,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_statuses_type FOREIGN KEY (status_type_id) REFERENCES status_types(id),
    CONSTRAINT uk_statuses_type_code UNIQUE (status_type_id, code),
    CONSTRAINT uk_statuses_type_name UNIQUE (status_type_id, name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS status_transitions (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    from_status_id BIGINT NOT NULL,
    to_status_id BIGINT NOT NULL,
    CONSTRAINT fk_status_transition_from FOREIGN KEY (from_status_id) REFERENCES statuses(id) ON DELETE CASCADE,
    CONSTRAINT fk_status_transition_to FOREIGN KEY (to_status_id) REFERENCES statuses(id) ON DELETE CASCADE,
    CONSTRAINT uk_status_transition_pair UNIQUE (from_status_id, to_status_id)
) ENGINE=InnoDB;

CREATE INDEX idx_statuses_type_sort ON statuses(status_type_id, sort_order);
CREATE INDEX idx_statuses_type_active ON statuses(status_type_id, is_active);

INSERT INTO status_types(`key`)
SELECT 'ORDER'
WHERE NOT EXISTS (SELECT 1 FROM status_types WHERE `key` = 'ORDER');

INSERT INTO status_types(`key`)
SELECT 'PAYMENT'
WHERE NOT EXISTS (SELECT 1 FROM status_types WHERE `key` = 'PAYMENT');

-- Seed order statuses
INSERT INTO statuses(status_type_id, name, code, icon, color_hex, description, is_default, is_active, visible_to_customer, sort_order)
SELECT st.id, 'Pending', 'PENDING', 'clock', '#6B7280', 'Order has been received and is awaiting processing.', TRUE, TRUE, TRUE, 10
FROM status_types st
WHERE st.`key` = 'ORDER'
  AND NOT EXISTS (SELECT 1 FROM statuses s WHERE s.status_type_id = st.id AND s.code = 'PENDING');

INSERT INTO statuses(status_type_id, name, code, icon, color_hex, description, is_default, is_active, visible_to_customer, sort_order)
SELECT st.id, 'Processing', 'PROCESSING', 'sparkles', '#3B82F6', 'Order is being prepared or packaged.', FALSE, TRUE, TRUE, 20
FROM status_types st
WHERE st.`key` = 'ORDER'
  AND NOT EXISTS (SELECT 1 FROM statuses s WHERE s.status_type_id = st.id AND s.code = 'PROCESSING');

INSERT INTO statuses(status_type_id, name, code, icon, color_hex, description, is_default, is_active, visible_to_customer, sort_order)
SELECT st.id, 'Shipped', 'SHIPPED', 'truck', '#0EA5E9', 'Order has left the warehouse and is in transit.', FALSE, TRUE, TRUE, 30
FROM status_types st
WHERE st.`key` = 'ORDER'
  AND NOT EXISTS (SELECT 1 FROM statuses s WHERE s.status_type_id = st.id AND s.code = 'SHIPPED');

INSERT INTO statuses(status_type_id, name, code, icon, color_hex, description, is_default, is_active, visible_to_customer, sort_order)
SELECT st.id, 'Delivered', 'DELIVERED', 'badge-check', '#10B981', 'Order has been delivered to the customer.', FALSE, TRUE, TRUE, 40
FROM status_types st
WHERE st.`key` = 'ORDER'
  AND NOT EXISTS (SELECT 1 FROM statuses s WHERE s.status_type_id = st.id AND s.code = 'DELIVERED');

INSERT INTO statuses(status_type_id, name, code, icon, color_hex, description, is_default, is_active, visible_to_customer, sort_order)
SELECT st.id, 'Cancelled', 'CANCELLED', 'x-circle', '#EF4444', 'Order was cancelled prior to fulfillment.', FALSE, TRUE, TRUE, 50
FROM status_types st
WHERE st.`key` = 'ORDER'
  AND NOT EXISTS (SELECT 1 FROM statuses s WHERE s.status_type_id = st.id AND s.code = 'CANCELLED');

INSERT INTO statuses(status_type_id, name, code, icon, color_hex, description, is_default, is_active, visible_to_customer, sort_order)
SELECT st.id, 'Return Requested', 'RETURN_REQUESTED', 'arrows-left-right', '#F97316', 'Customer has requested a return.', FALSE, TRUE, TRUE, 60
FROM status_types st
WHERE st.`key` = 'ORDER'
  AND NOT EXISTS (SELECT 1 FROM statuses s WHERE s.status_type_id = st.id AND s.code = 'RETURN_REQUESTED');

INSERT INTO statuses(status_type_id, name, code, icon, color_hex, description, is_default, is_active, visible_to_customer, sort_order)
SELECT st.id, 'Returned', 'RETURNED', 'arrow-uturn-left', '#8B5CF6', 'Order items have been returned.', FALSE, TRUE, TRUE, 70
FROM status_types st
WHERE st.`key` = 'ORDER'
  AND NOT EXISTS (SELECT 1 FROM statuses s WHERE s.status_type_id = st.id AND s.code = 'RETURNED');

-- Ensure only one default order status
UPDATE statuses s
JOIN status_types st ON st.id = s.status_type_id AND st.`key` = 'ORDER'
SET s.is_default = CASE WHEN s.code = 'PENDING' THEN TRUE ELSE FALSE END;

-- Seed payment statuses
INSERT INTO statuses(status_type_id, name, code, icon, color_hex, description, is_default, is_active, visible_to_customer, sort_order)
SELECT st.id, 'Unpaid', 'UNPAID', 'exclamation-triangle', '#F97316', 'Payment has not yet been received.', TRUE, TRUE, NULL, 10
FROM status_types st
WHERE st.`key` = 'PAYMENT'
  AND NOT EXISTS (SELECT 1 FROM statuses s WHERE s.status_type_id = st.id AND s.code = 'UNPAID');

INSERT INTO statuses(status_type_id, name, code, icon, color_hex, description, is_default, is_active, visible_to_customer, sort_order)
SELECT st.id, 'Partially Paid', 'PARTIALLY_PAID', 'adjustments-vertical', '#F59E0B', 'Partial payment has been received.', FALSE, TRUE, NULL, 20
FROM status_types st
WHERE st.`key` = 'PAYMENT'
  AND NOT EXISTS (SELECT 1 FROM statuses s WHERE s.status_type_id = st.id AND s.code = 'PARTIALLY_PAID');

INSERT INTO statuses(status_type_id, name, code, icon, color_hex, description, is_default, is_active, visible_to_customer, sort_order)
SELECT st.id, 'Paid', 'PAID', 'currency-dollar', '#10B981', 'Payment has been completed in full.', FALSE, TRUE, NULL, 30
FROM status_types st
WHERE st.`key` = 'PAYMENT'
  AND NOT EXISTS (SELECT 1 FROM statuses s WHERE s.status_type_id = st.id AND s.code = 'PAID');

INSERT INTO statuses(status_type_id, name, code, icon, color_hex, description, is_default, is_active, visible_to_customer, sort_order)
SELECT st.id, 'Refunded', 'REFUNDED', 'arrow-uturn-right', '#6366F1', 'Payment has been refunded to the customer.', FALSE, TRUE, NULL, 40
FROM status_types st
WHERE st.`key` = 'PAYMENT'
  AND NOT EXISTS (SELECT 1 FROM statuses s WHERE s.status_type_id = st.id AND s.code = 'REFUNDED');

INSERT INTO statuses(status_type_id, name, code, icon, color_hex, description, is_default, is_active, visible_to_customer, sort_order)
SELECT st.id, 'Failed', 'FAILED', 'x-mark', '#DC2626', 'Payment attempt failed.', FALSE, TRUE, NULL, 50
FROM status_types st
WHERE st.`key` = 'PAYMENT'
  AND NOT EXISTS (SELECT 1 FROM statuses s WHERE s.status_type_id = st.id AND s.code = 'FAILED');

UPDATE statuses s
JOIN status_types st ON st.id = s.status_type_id AND st.`key` = 'PAYMENT'
SET s.visible_to_customer = NULL,
    s.is_default = CASE WHEN s.code = 'UNPAID' THEN TRUE ELSE FALSE END;

-- Permissions
INSERT INTO permissions (code, name)
SELECT 'CONFIG.ORDER_STATUS.VIEW', 'Configuration: Order Status - View'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'CONFIG.ORDER_STATUS.VIEW');

INSERT INTO permissions (code, name)
SELECT 'CONFIG.ORDER_STATUS.MANAGE', 'Configuration: Order Status - Manage'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'CONFIG.ORDER_STATUS.MANAGE');

INSERT INTO permissions (code, name)
SELECT 'CONFIG.PAYMENT_STATUS.VIEW', 'Configuration: Payment Status - View'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'CONFIG.PAYMENT_STATUS.VIEW');

INSERT INTO permissions (code, name)
SELECT 'CONFIG.PAYMENT_STATUS.MANAGE', 'Configuration: Payment Status - Manage'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'CONFIG.PAYMENT_STATUS.MANAGE');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'CONFIG.ORDER_STATUS.VIEW',
    'CONFIG.ORDER_STATUS.MANAGE',
    'CONFIG.PAYMENT_STATUS.VIEW',
    'CONFIG.PAYMENT_STATUS.MANAGE'
)
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN')
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
