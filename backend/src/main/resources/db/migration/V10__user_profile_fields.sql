ALTER TABLE users
    ADD COLUMN IF NOT EXISTS first_name VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS facebook_url VARCHAR(255),
    ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(255),
    ADD COLUMN IF NOT EXISTS skype_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS email_signature TEXT;

UPDATE users
SET first_name = CASE
        WHEN full_name IS NULL OR TRIM(full_name) = '' THEN ''
        WHEN TRIM(full_name) LIKE '% %' THEN SUBSTRING_INDEX(TRIM(full_name), ' ', 1)
        ELSE TRIM(full_name)
    END,
    last_name = CASE
        WHEN full_name IS NULL OR TRIM(full_name) = '' THEN ''
        WHEN TRIM(full_name) LIKE '% %' THEN TRIM(SUBSTRING(TRIM(full_name), LENGTH(SUBSTRING_INDEX(TRIM(full_name), ' ', 1)) + 1))
        ELSE ''
    END;

UPDATE users
SET first_name = ''
WHERE first_name IS NULL;

UPDATE users
SET last_name = ''
WHERE last_name IS NULL;

ALTER TABLE users
    MODIFY COLUMN first_name VARCHAR(100) NOT NULL DEFAULT '',
    MODIFY COLUMN last_name VARCHAR(100) NOT NULL DEFAULT '';
