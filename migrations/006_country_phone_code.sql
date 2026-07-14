-- Migration 006: country_master phone dialing code
--
-- Adds an admin-managed international dialing code (e.g. "+91") to
-- country_master so the public forms' phone country-code selector can read
-- it straight from the country the user picked, instead of matching the
-- country name against a hardcoded frontend list.
--
-- Guarded via information_schema rather than `ADD COLUMN IF NOT EXISTS`,
-- which MySQL 8.0 (unlike MariaDB) does not support. Existing country_master
-- rows remain valid since the new column is nullable — pre-existing
-- countries simply have a NULL phone_code until an admin sets one via
-- /country-master (the frontend falls back to its own mapping, then +91,
-- for those).

USE yogoventures;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'country_master' AND column_name = 'phone_code'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE country_master ADD COLUMN phone_code VARCHAR(10) NULL',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
