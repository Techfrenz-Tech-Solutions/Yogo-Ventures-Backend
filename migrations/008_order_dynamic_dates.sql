-- Migration 008: dynamic order date columns
--
-- Replaces order_tracking's 15 fixed date columns (order_placed_date,
-- product_initiated_date, ..., order_complete_date) with a scalable
-- title + value structure, so an admin can attach any number of
-- arbitrarily-named milestone dates to an order instead of being limited
-- to a fixed, hardcoded set.
--
-- The 15 legacy columns are intentionally NOT dropped — they stay as
-- frozen, unused columns so nothing that still reads them breaks. New
-- code reads/writes milestone dates exclusively through order_dates /
-- order_date_titles from here on.
--
-- order_tracking currently has zero rows (verified before writing this
-- migration), so there is no legacy date data to migrate — the backfill
-- block below is still included (guarded, idempotent) in case this ever
-- runs against an environment that does have existing rows.

USE yogoventures;

CREATE TABLE IF NOT EXISTS order_date_titles (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    display_name    VARCHAR(100) NOT NULL,
    normalised_name VARCHAR(100) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_order_date_titles_normalised (normalised_name)
);

CREATE TABLE IF NOT EXISTS order_dates (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    order_tracking_id  INT NOT NULL,
    date_title_id      INT NOT NULL,
    date_value         DATE NOT NULL,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_order_dates_order_title (order_tracking_id, date_title_id),
    CONSTRAINT fk_order_dates_order
        FOREIGN KEY (order_tracking_id) REFERENCES order_tracking(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_order_dates_title
        FOREIGN KEY (date_title_id) REFERENCES order_date_titles(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Seed the title table with the old fixed columns' display names, purely
-- so the admin's date-title autocomplete isn't empty on first use and
-- keeps continuity with the previous naming. These are title rows only —
-- no order_dates rows are implied by seeding a title.
INSERT IGNORE INTO order_date_titles (display_name, normalised_name) VALUES
    ('Order Placed',                'order-placed'),
    ('Product Initiated',           'product-initiated'),
    ('Inspection Initiated',        'inspection-initiated'),
    ('Certification In Progress',   'certification-in-progress'),
    ('Packing In Progress',         'packing-in-progress'),
    ('Shipped From Manufacturer',   'shipped-from-manufacturer'),
    ('In Yogo Warehouse',           'in-yogo-warehouse'),
    ('Shipped From Yogo',           'shipped-from-yogo'),
    ('Customer Clearance (Loading)','customer-clearance-loading'),
    ('Bill of Loading',             'bill-of-loading'),
    ('Sold On',                     'sold-on'),
    ('Reached Destination (On)',    'reached-destination'),
    ('Customer Clearance (Dest)',   'customer-clearance-dest'),
    ('Reached Customer Warehouse',  'reached-customer-warehouse'),
    ('Order Completed',             'order-completed');

-- Backfill (idempotent, guarded per order+title pair) — a no-op today
-- since order_tracking has no rows, but safe to (re)run if that changes.
INSERT INTO order_dates (order_tracking_id, date_title_id, date_value)
SELECT ot.id, odt.id, ot.order_placed_date
FROM order_tracking ot
JOIN order_date_titles odt ON odt.normalised_name = 'order-placed'
WHERE ot.order_placed_date IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM order_dates od WHERE od.order_tracking_id = ot.id AND od.date_title_id = odt.id);

INSERT INTO order_dates (order_tracking_id, date_title_id, date_value)
SELECT ot.id, odt.id, ot.product_initiated_date
FROM order_tracking ot
JOIN order_date_titles odt ON odt.normalised_name = 'product-initiated'
WHERE ot.product_initiated_date IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM order_dates od WHERE od.order_tracking_id = ot.id AND od.date_title_id = odt.id);

INSERT INTO order_dates (order_tracking_id, date_title_id, date_value)
SELECT ot.id, odt.id, ot.inspection_initiated_date
FROM order_tracking ot
JOIN order_date_titles odt ON odt.normalised_name = 'inspection-initiated'
WHERE ot.inspection_initiated_date IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM order_dates od WHERE od.order_tracking_id = ot.id AND od.date_title_id = odt.id);

INSERT INTO order_dates (order_tracking_id, date_title_id, date_value)
SELECT ot.id, odt.id, ot.certification_in_progress_date
FROM order_tracking ot
JOIN order_date_titles odt ON odt.normalised_name = 'certification-in-progress'
WHERE ot.certification_in_progress_date IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM order_dates od WHERE od.order_tracking_id = ot.id AND od.date_title_id = odt.id);

INSERT INTO order_dates (order_tracking_id, date_title_id, date_value)
SELECT ot.id, odt.id, ot.packing_in_progress_date
FROM order_tracking ot
JOIN order_date_titles odt ON odt.normalised_name = 'packing-in-progress'
WHERE ot.packing_in_progress_date IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM order_dates od WHERE od.order_tracking_id = ot.id AND od.date_title_id = odt.id);

INSERT INTO order_dates (order_tracking_id, date_title_id, date_value)
SELECT ot.id, odt.id, ot.shipped_from_manufacturer_date
FROM order_tracking ot
JOIN order_date_titles odt ON odt.normalised_name = 'shipped-from-manufacturer'
WHERE ot.shipped_from_manufacturer_date IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM order_dates od WHERE od.order_tracking_id = ot.id AND od.date_title_id = odt.id);

INSERT INTO order_dates (order_tracking_id, date_title_id, date_value)
SELECT ot.id, odt.id, ot.in_yogo_warehouse_date
FROM order_tracking ot
JOIN order_date_titles odt ON odt.normalised_name = 'in-yogo-warehouse'
WHERE ot.in_yogo_warehouse_date IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM order_dates od WHERE od.order_tracking_id = ot.id AND od.date_title_id = odt.id);

INSERT INTO order_dates (order_tracking_id, date_title_id, date_value)
SELECT ot.id, odt.id, ot.shipped_from_yogo_date
FROM order_tracking ot
JOIN order_date_titles odt ON odt.normalised_name = 'shipped-from-yogo'
WHERE ot.shipped_from_yogo_date IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM order_dates od WHERE od.order_tracking_id = ot.id AND od.date_title_id = odt.id);

INSERT INTO order_dates (order_tracking_id, date_title_id, date_value)
SELECT ot.id, odt.id, ot.customer_clearance_date
FROM order_tracking ot
JOIN order_date_titles odt ON odt.normalised_name = 'customer-clearance-loading'
WHERE ot.customer_clearance_date IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM order_dates od WHERE od.order_tracking_id = ot.id AND od.date_title_id = odt.id);

INSERT INTO order_dates (order_tracking_id, date_title_id, date_value)
SELECT ot.id, odt.id, ot.bill_of_loading_date
FROM order_tracking ot
JOIN order_date_titles odt ON odt.normalised_name = 'bill-of-loading'
WHERE ot.bill_of_loading_date IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM order_dates od WHERE od.order_tracking_id = ot.id AND od.date_title_id = odt.id);

INSERT INTO order_dates (order_tracking_id, date_title_id, date_value)
SELECT ot.id, odt.id, ot.sold_on_date
FROM order_tracking ot
JOIN order_date_titles odt ON odt.normalised_name = 'sold-on'
WHERE ot.sold_on_date IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM order_dates od WHERE od.order_tracking_id = ot.id AND od.date_title_id = odt.id);

INSERT INTO order_dates (order_tracking_id, date_title_id, date_value)
SELECT ot.id, odt.id, ot.reached_destination_date
FROM order_tracking ot
JOIN order_date_titles odt ON odt.normalised_name = 'reached-destination'
WHERE ot.reached_destination_date IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM order_dates od WHERE od.order_tracking_id = ot.id AND od.date_title_id = odt.id);

INSERT INTO order_dates (order_tracking_id, date_title_id, date_value)
SELECT ot.id, odt.id, ot.customer_clearance_destination_date
FROM order_tracking ot
JOIN order_date_titles odt ON odt.normalised_name = 'customer-clearance-dest'
WHERE ot.customer_clearance_destination_date IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM order_dates od WHERE od.order_tracking_id = ot.id AND od.date_title_id = odt.id);

INSERT INTO order_dates (order_tracking_id, date_title_id, date_value)
SELECT ot.id, odt.id, ot.reached_customer_warehouse_date
FROM order_tracking ot
JOIN order_date_titles odt ON odt.normalised_name = 'reached-customer-warehouse'
WHERE ot.reached_customer_warehouse_date IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM order_dates od WHERE od.order_tracking_id = ot.id AND od.date_title_id = odt.id);

INSERT INTO order_dates (order_tracking_id, date_title_id, date_value)
SELECT ot.id, odt.id, ot.order_complete_date
FROM order_tracking ot
JOIN order_date_titles odt ON odt.normalised_name = 'order-completed'
WHERE ot.order_complete_date IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM order_dates od WHERE od.order_tracking_id = ot.id AND od.date_title_id = odt.id);
