-- Migration 014: admin-only free-text remarks column across five record types
--
-- Adds a nullable remarks TEXT column to get_enquire_quote, contact_us_enquiry,
-- enquiries, sample_enquiry, and order_tracking so admins can attach a note to
-- a record inline from the table row, without opening a modal. Independent of
-- each table's own workflow `status` column — updating remarks must never
-- touch status, and vice versa.
--
-- Guarded via information_schema rather than `ADD COLUMN IF NOT EXISTS`,
-- which MySQL 8.0 (unlike MariaDB) does not support — same pattern as
-- migrations 012/013.

USE yogoventures;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'get_enquire_quote' AND column_name = 'remarks'
);
SET @sql := IF(@col_exists = 0,
    "ALTER TABLE get_enquire_quote ADD COLUMN remarks TEXT NULL",
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'contact_us_enquiry' AND column_name = 'remarks'
);
SET @sql := IF(@col_exists = 0,
    "ALTER TABLE contact_us_enquiry ADD COLUMN remarks TEXT NULL",
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'enquiries' AND column_name = 'remarks'
);
SET @sql := IF(@col_exists = 0,
    "ALTER TABLE enquiries ADD COLUMN remarks TEXT NULL",
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'sample_enquiry' AND column_name = 'remarks'
);
SET @sql := IF(@col_exists = 0,
    "ALTER TABLE sample_enquiry ADD COLUMN remarks TEXT NULL",
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'order_tracking' AND column_name = 'remarks'
);
SET @sql := IF(@col_exists = 0,
    "ALTER TABLE order_tracking ADD COLUMN remarks TEXT NULL",
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
