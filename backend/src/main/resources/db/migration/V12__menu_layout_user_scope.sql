SET @has_user_column := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'menu_layouts'
      AND COLUMN_NAME = 'user_id'
);

SET @add_user_column_sql := IF(
    @has_user_column = 0,
    'ALTER TABLE menu_layouts ADD COLUMN user_id BIGINT NULL AFTER layout_key',
    'SELECT 1'
);
PREPARE add_user_column_stmt FROM @add_user_column_sql;
EXECUTE add_user_column_stmt;
DEALLOCATE PREPARE add_user_column_stmt;

SET @has_layout_key_index := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'menu_layouts'
      AND INDEX_NAME = 'layout_key'
);

SET @drop_unique_index_sql := IF(
    @has_layout_key_index > 0,
    'ALTER TABLE menu_layouts DROP INDEX layout_key',
    'SELECT 1'
);
PREPARE drop_unique_index_stmt FROM @drop_unique_index_sql;
EXECUTE drop_unique_index_stmt;
DEALLOCATE PREPARE drop_unique_index_stmt;

SET @has_composite_index := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'menu_layouts'
      AND INDEX_NAME = 'uk_menu_layouts_key_user'
);

SET @add_composite_index_sql := IF(
    @has_composite_index = 0,
    'ALTER TABLE menu_layouts ADD UNIQUE KEY uk_menu_layouts_key_user (layout_key, user_id)',
    'SELECT 1'
);
PREPARE add_composite_index_stmt FROM @add_composite_index_sql;
EXECUTE add_composite_index_stmt;
DEALLOCATE PREPARE add_composite_index_stmt;

SET @has_fk := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME = 'fk_menu_layouts_user'
);

SET @add_fk_sql := IF(
    @has_fk = 0,
    'ALTER TABLE menu_layouts ADD CONSTRAINT fk_menu_layouts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE',
    'SELECT 1'
);
PREPARE add_fk_stmt FROM @add_fk_sql;
EXECUTE add_fk_stmt;
DEALLOCATE PREPARE add_fk_stmt;
