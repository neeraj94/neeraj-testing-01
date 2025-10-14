SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'product_reviews'
    AND column_name = 'is_published'
);

SET @add_column_sql := IF(
  @column_exists = 0,
  'ALTER TABLE product_reviews ADD COLUMN is_published TINYINT(1) NOT NULL DEFAULT 1',
  'SELECT 1'
);

PREPARE stmt FROM @add_column_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE product_reviews
SET is_published = 1
WHERE is_published IS NULL;
