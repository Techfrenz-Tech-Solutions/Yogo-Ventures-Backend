-- local-migration.sql
-- Run this AFTER importing `yogoventures (1).sql` — brings that dump's
-- structure up to date with the current schema.sql, without touching any
-- existing rows. Every statement here is additive/non-destructive and safe
-- to re-run.
--
-- Differences found between the dump and schema.sql:
--   1. users            — missing `role`, `status` columns (added by the
--                          recent bcrypt/JWT security work)
--   2. contact_us_enquiry,
--      enquiries,
--      get_enquire_quote — missing `updated_date` column (present in
--                          schema.sql; not required by any live query, but
--                          added here for consistency/future-proofing)
--   3. customer_master  — has an extra `customer_id VARCHAR(50) NOT NULL`
--                          column with a UNIQUE constraint that predates the
--                          current code. Live code's createCustomer never
--                          sets this column, so as-is it would fail on the
--                          very next customer insert ("Field 'customer_id'
--                          doesn't have a default value") and a second insert
--                          would then collide on the UNIQUE constraint (both
--                          defaulting to ''). Fixed by giving it a default
--                          and dropping the now-inapplicable uniqueness
--                          constraint. The column and its existing data are
--                          kept, not dropped.
--   4. order_tracking   — missing the FK to customer_master(id) that
--                          schema.sql declares. Table has 0 rows in the
--                          dump, so adding it is risk-free.

USE yogoventures;

-- 1. users — add role/status (existing rows default to role='admin',
--    status='active', matching schema.sql's defaults)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role   VARCHAR(20) NOT NULL DEFAULT 'admin',
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

-- 2. add missing updated_date columns
ALTER TABLE contact_us_enquiry
    ADD COLUMN IF NOT EXISTS updated_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE enquiries
    ADD COLUMN IF NOT EXISTS updated_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE get_enquire_quote
    ADD COLUMN IF NOT EXISTS updated_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 3. customer_master.customer_id — give it a safe default so inserts that
--    omit it (which is what the live code does) don't fail, and drop the
--    UNIQUE constraint so multiple such inserts don't collide on ''.
--    The column + existing data are preserved.
ALTER TABLE customer_master
    MODIFY COLUMN customer_id VARCHAR(50) NOT NULL DEFAULT '';

-- Drop the unique index on customer_id if it exists (name may vary; this
-- matches the index name from the dump's `ALTER TABLE ... ADD UNIQUE KEY
-- customer_id (customer_id)`).
SET @idx_exists = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_master' AND INDEX_NAME = 'customer_id'
);
SET @drop_idx_sql = IF(@idx_exists > 0, 'ALTER TABLE customer_master DROP INDEX customer_id', 'SELECT 1');
PREPARE stmt FROM @drop_idx_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. order_tracking → customer_master FK (table is empty in the dump, so
--    this is safe; skipped automatically if it already exists)
SET @fk_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_tracking' AND CONSTRAINT_NAME = 'fk_order_tracking_customer'
);
SET @add_fk_sql = IF(@fk_exists = 0,
    'ALTER TABLE order_tracking ADD CONSTRAINT fk_order_tracking_customer FOREIGN KEY (customer_id) REFERENCES customer_master(id) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @add_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migration complete.' AS result;
