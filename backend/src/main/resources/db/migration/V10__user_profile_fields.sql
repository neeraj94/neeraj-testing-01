SET @schema := DATABASE();

SET @sql := IF (
    EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'users' AND COLUMN_NAME = 'first_name'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN first_name VARCHAR(100) NULL'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF (
    EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_name'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN last_name VARCHAR(100) NULL'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF (
    EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'users' AND COLUMN_NAME = 'phone_number'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN phone_number VARCHAR(50)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF (
    EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'users' AND COLUMN_NAME = 'whatsapp_number'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN whatsapp_number VARCHAR(50)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF (
    EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'users' AND COLUMN_NAME = 'facebook_url'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN facebook_url VARCHAR(255)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF (
    EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'users' AND COLUMN_NAME = 'linkedin_url'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN linkedin_url VARCHAR(255)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF (
    EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'users' AND COLUMN_NAME = 'skype_id'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN skype_id VARCHAR(100)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF (
    EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email_signature'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN email_signature TEXT'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

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
