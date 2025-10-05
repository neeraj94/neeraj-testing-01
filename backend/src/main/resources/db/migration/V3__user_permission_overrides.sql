CREATE TABLE user_permission_overrides (
    user_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, permission_id),
    CONSTRAINT fk_user_permission_overrides_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_permission_overrides_permission FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
) ENGINE=InnoDB;
