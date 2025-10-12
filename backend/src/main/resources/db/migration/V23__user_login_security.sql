ALTER TABLE users
    ADD COLUMN login_attempts INT NOT NULL DEFAULT 0 AFTER email_verified_at,
    ADD COLUMN locked_at DATETIME(6) NULL AFTER login_attempts;

UPDATE users
SET login_attempts = 0
WHERE login_attempts IS NULL;
