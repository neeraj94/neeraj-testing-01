ALTER TABLE users
    ADD COLUMN first_name VARCHAR(100),
    ADD COLUMN last_name VARCHAR(100),
    ADD COLUMN phone_number VARCHAR(50),
    ADD COLUMN whatsapp_number VARCHAR(50),
    ADD COLUMN facebook_url VARCHAR(255),
    ADD COLUMN linkedin_url VARCHAR(255),
    ADD COLUMN skype_id VARCHAR(100),
    ADD COLUMN email_signature TEXT;

UPDATE users
SET first_name = COALESCE(NULLIF(split_part(full_name, ' ', 1), ''), full_name),
    last_name = CASE
        WHEN POSITION(' ' IN full_name) > 0 THEN COALESCE(NULLIF(BTRIM(SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)), ''), '')
        ELSE ''
    END;

UPDATE users
SET first_name = full_name
WHERE first_name IS NULL;

UPDATE users
SET last_name = ''
WHERE last_name IS NULL;

ALTER TABLE users
    ALTER COLUMN first_name SET NOT NULL,
    ALTER COLUMN last_name SET NOT NULL,
    ALTER COLUMN first_name SET DEFAULT '',
    ALTER COLUMN last_name SET DEFAULT '';
