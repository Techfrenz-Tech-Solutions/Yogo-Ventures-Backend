-- Migration 003: contact enquiry customer-facing reference number
--
-- Same pattern as migration 002's get_enquire_quote.reference_number: adds a
-- server-generated, unique, non-guessable "Contact Request ID" (format
-- CR-YYYYMMDD-XXXXXXXX) to contact_us_enquiry so it can be shown to the
-- customer/admin instead of the internal auto-increment id.
--
-- Guarded via information_schema rather than `ADD COLUMN IF NOT EXISTS`,
-- which MySQL 8.0 (unlike MariaDB) does not support. Existing
-- contact_us_enquiry rows remain valid since the new column is nullable —
-- pre-existing enquiries simply have a NULL reference_number.

USE yogoventures;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'contact_us_enquiry' AND column_name = 'reference_number'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE contact_us_enquiry ADD COLUMN reference_number VARCHAR(30) NULL UNIQUE',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
