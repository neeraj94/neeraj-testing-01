SET @schema := DATABASE();

SET @sql := IF (
    EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'users' AND COLUMN_NAME = 'profile_image_url'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN profile_image_url VARCHAR(500)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
