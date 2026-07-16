-- Migration 011: multi-product orders (order_items) + order_value
--
-- order_tracking currently stores exactly one product per order as a free
-- text `product_name` + `quantity` pair, with no link to product_master at
-- all. This introduces a proper order_items child table (order_id,
-- product_id, quantity) so one order can hold multiple products, each
-- referencing a real product_master row, plus a fixed `order_value` column
-- on order_tracking for the admin-entered order total.
--
-- Backward compatibility: the legacy `product_name`/`quantity` columns on
-- order_tracking are left in place (not dropped) until the new multi-item
-- flow has been verified in production — see requirement #9. They simply
-- stop being written to by the updated create/update endpoints.
--
-- Idempotent: column/table guards via information_schema + CREATE TABLE IF
-- NOT EXISTS, and the data migration below is a plain INSERT ... ON
-- DUPLICATE KEY UPDATE keyed on the (order_id, product_id) unique
-- constraint, so re-running this file is always safe.

USE yogoventures;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'order_tracking' AND column_name = 'order_value'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE order_tracking ADD COLUMN order_value DECIMAL(12,2) NULL',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS order_items (
    id INT NOT NULL AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uniq_order_product (order_id, product_id),
    KEY idx_order_items_order (order_id),
    KEY idx_order_items_product (product_id),
    CONSTRAINT fk_order_items_order   FOREIGN KEY (order_id)   REFERENCES order_tracking(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES product_master(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One-time backfill: each existing order's single product_name is matched
-- to product_master by exact name to recover its product_id. Orders whose
-- product_name has no matching product_master row (renamed/deleted product)
-- are intentionally left with no order_items row — they still display via
-- the legacy product_name/quantity fallback in the API until an admin
-- edits them.
INSERT INTO order_items (order_id, product_id, quantity)
SELECT ot.id, pm.id, ot.quantity
FROM order_tracking ot
JOIN product_master pm ON pm.product_name = ot.product_name
ON DUPLICATE KEY UPDATE quantity = VALUES(quantity);
