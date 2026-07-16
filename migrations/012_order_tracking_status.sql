-- Migration 012: order-level status on order_tracking
--
-- Adds a single status field per order (not per order_item) so the admin
-- can mark an entire order Pending / Processing / Delivered from the
-- Order Tracking table. Matches the ENUM convention already used for
-- status columns elsewhere in this schema (e.g. get_enquire_quote.status).
--
-- Guarded via information_schema rather than `ADD COLUMN IF NOT EXISTS`,
-- which MySQL 8.0 (unlike MariaDB) does not support. Existing orders
-- default to 'pending' since none had a stored status before this.

USE yogoventures;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'order_tracking' AND column_name = 'status'
);
SET @sql := IF(@col_exists = 0,
    "ALTER TABLE order_tracking ADD COLUMN status ENUM('pending','processing','delivered') NOT NULL DEFAULT 'pending'",
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
