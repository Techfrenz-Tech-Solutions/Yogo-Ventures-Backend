-- Migration 013: dedicated workflow status on sample_enquiry
--
-- The admin UI previously reused the `order_placed` Yes/No business flag
-- as a one-directional "Done" indicator, which cannot be cleanly reversed
-- (setting order_placed back to 'No' would incorrectly imply no order was
-- ever placed). This adds a real two-state workflow column, matching the
-- ENUM convention already used for get_enquire_quote.status and
-- order_tracking.status.
--
-- Guarded via information_schema rather than `ADD COLUMN IF NOT EXISTS`,
-- which MySQL 8.0 (unlike MariaDB) does not support. Existing enquiries
-- default to 'pending' since none had a stored status before this.

USE yogoventures;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'sample_enquiry' AND column_name = 'status'
);
SET @sql := IF(@col_exists = 0,
    "ALTER TABLE sample_enquiry ADD COLUMN status ENUM('pending','done') NOT NULL DEFAULT 'pending'",
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
