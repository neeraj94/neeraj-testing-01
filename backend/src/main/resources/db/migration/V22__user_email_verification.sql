-- Add email verification tracking and tokens
ALTER TABLE users
    ADD COLUMN email_verified_at DATETIME(6) NULL AFTER email_signature;

-- Mark existing users as verified using their last update timestamp
UPDATE users
SET email_verified_at = IFNULL(email_verified_at, updated_at);

CREATE TABLE IF NOT EXISTS user_verification_tokens (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(120) NOT NULL UNIQUE,
    expires_at DATETIME(6) NOT NULL,
    verified_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_user_verification_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_user_verification_tokens_user ON user_verification_tokens(user_id);
