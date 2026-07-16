-- Migration 009: country_master iso3 + active status
--
-- Adds an ISO 3166-1 alpha-3 code and an active/inactive flag to
-- country_master, so it can hold the full canonical country reference data
-- (ISO2 + ISO3 + E.164 phone code) as the single source of truth used by
-- the admin Country Master page and the public website's forms.
--
-- Guarded via information_schema rather than `ADD COLUMN IF NOT EXISTS`,
-- which MySQL 8.0 (unlike MariaDB) does not support. Both columns are
-- added with safe defaults so existing rows remain valid.

USE yogoventures;

SET @iso3_exists := (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'country_master' AND column_name = 'iso3'
);
SET @sql := IF(@iso3_exists = 0,
    'ALTER TABLE country_master ADD COLUMN iso3 VARCHAR(3) NULL AFTER country_code',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @active_exists := (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'country_master' AND column_name = 'is_active'
);
SET @sql := IF(@active_exists = 0,
    'ALTER TABLE country_master ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
