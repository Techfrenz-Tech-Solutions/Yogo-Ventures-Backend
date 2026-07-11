-- Migration 004: general enquiry customer-facing reference number
--
-- Same pattern as migration 002 (get_enquire_quote.reference_number) and
-- migration 003 (contact_us_enquiry.reference_number): adds a
-- server-generated, unique, non-guessable "Enquiry ID" (format
-- ENQ-YYYYMMDD-XXXXXXXX) to the homepage general-enquiry table so it can be
-- shown to the customer/admin instead of the internal auto-increment id.
--
-- Guarded via information_schema rather than `ADD COLUMN IF NOT EXISTS`,
-- which MySQL 8.0 (unlike MariaDB) does not support. Existing enquiries rows
-- remain valid since the new column is nullable — pre-existing enquiries
-- simply have a NULL reference_number.

USE yogoventures;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'enquiries' AND column_name = 'reference_number'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE enquiries ADD COLUMN reference_number VARCHAR(30) NULL UNIQUE',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
