-- Migration 015: make product sub-category optional
--
-- The admin Product Master form no longer requires a sub-category. Keep
-- product_master.category_name mandatory, but allow sub_category_name to be
-- NULL when a product only belongs to a top-level category.

USE yogoventures;

SET @col_is_nullable := (
    SELECT IS_NULLABLE
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'product_master'
      AND column_name = 'sub_category_name'
);

SET @sql := IF(@col_is_nullable = 'NO',
    "ALTER TABLE product_master MODIFY COLUMN sub_category_name VARCHAR(100) NULL",
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
