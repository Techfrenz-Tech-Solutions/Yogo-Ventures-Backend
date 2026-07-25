-- Yogo Ventures — database schema
-- Run against a MySQL server as: mysql -u root -p < schema.sql
-- (or paste into a MySQL client). Matches every table/column referenced by
-- the routes actually mounted in app.js — controllers/itemMasterController.js
-- and controllers/authController.js.

CREATE DATABASE IF NOT EXISTS yogoventures;
USE yogoventures;

-- ── Auth ─────────────────────────────────────────────────────────────────
-- No admin user is seeded here on purpose — there is no default/known
-- password baked into this repo. Create your local admin with:
--   node create-admin.js you@example.com "YourOwnPassword123"
-- which hashes the password with bcrypt and prints the INSERT to run. See
-- README.md's "Local Database Setup" section for details.
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    full_name     VARCHAR(255) NOT NULL,
    email_id      VARCHAR(255) NOT NULL UNIQUE,
    phone_number  VARCHAR(20)  DEFAULT NULL,
    password      VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'admin',
    status        VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Country ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS country_master (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    country_code  VARCHAR(10)  NOT NULL,
    country_name  VARCHAR(100) NOT NULL,
    phone_code    VARCHAR(10)  NULL,
    created_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── country_master phone dialing code (see migrations/006_country_phone_code.sql) ──
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

-- ── Category / Sub-category ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS category_master (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    category_code VARCHAR(20)  NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    created_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sub_category_master (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    sub_category_code  VARCHAR(20)  NOT NULL,
    sub_category_name  VARCHAR(100) NOT NULL,
    category_name      VARCHAR(100) NOT NULL,
    created_date       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Products ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_master (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    product_code         VARCHAR(50)  NOT NULL,
    product_name         VARCHAR(255) NOT NULL,
    category_name        VARCHAR(100) NOT NULL,
    sub_category_name    VARCHAR(100) NULL,
    product_description  TEXT,
    index_image          VARCHAR(255),
    image1                VARCHAR(255),
    image2                VARCHAR(255),
    image3                VARCHAR(255),
    image4                VARCHAR(255),
    image5                VARCHAR(255),
    created_date         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Best Selling / New Arrivals (thin: name + one image) ────────────────
CREATE TABLE IF NOT EXISTS best_selling (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    product_name  VARCHAR(255) NOT NULL,
    image         VARCHAR(255),
    created_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS new_arrivals (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    product_name  VARCHAR(255) NOT NULL,
    image         VARCHAR(255),
    created_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Quote enquiries (website "Get a Quote" form) ─────────────────────────
CREATE TABLE IF NOT EXISTS get_enquire_quote (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    product_name  VARCHAR(255) NOT NULL,
    qty           INT          NOT NULL,
    color         VARCHAR(100) NOT NULL,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    email_id      VARCHAR(255) NOT NULL,
    country       VARCHAR(100) NOT NULL,
    phone_number  VARCHAR(20)  NOT NULL,
    message       TEXT,
    status        VARCHAR(50) DEFAULT 'Pending',
    created_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Contact us (website contact form) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_us_enquiry (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    email_id      VARCHAR(255) NOT NULL,
    country       VARCHAR(100) NOT NULL,
    phone_number  VARCHAR(20)  NOT NULL,
    subject       VARCHAR(255) NOT NULL,
    message       TEXT,
    status        VARCHAR(50) DEFAULT 'Pending',
    created_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── General enquiries (website enquiry form) ─────────────────────────────
CREATE TABLE IF NOT EXISTS enquiries (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    first_name        VARCHAR(100) NOT NULL,
    last_name         VARCHAR(100) NOT NULL,
    email_id          VARCHAR(255) NOT NULL,
    country           VARCHAR(100) NOT NULL,
    phone_number      VARCHAR(20)  NOT NULL,
    product_category  VARCHAR(255) NOT NULL,
    message           TEXT,
    status            VARCHAR(50) DEFAULT 'Pending',
    created_date      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Customers (admin-managed) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_master (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    customer_name  VARCHAR(255) NOT NULL,
    email_id       VARCHAR(255) NOT NULL,
    country        VARCHAR(100) NOT NULL,
    phone_number   VARCHAR(20)  NOT NULL,
    created_date   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Order tracking (shipment milestone dates, admin-managed) ────────────
CREATE TABLE IF NOT EXISTS order_tracking (
    id                                    INT AUTO_INCREMENT PRIMARY KEY,
    order_id                              VARCHAR(100) NOT NULL,
    customer_id                           INT NOT NULL,
    product_name                          VARCHAR(255) NOT NULL,
    quantity                              INT NOT NULL,
    order_placed_date                     DATE DEFAULT NULL,
    product_initiated_date                DATE DEFAULT NULL,
    inspection_initiated_date             DATE DEFAULT NULL,
    certification_in_progress_date        DATE DEFAULT NULL,
    packing_in_progress_date              DATE DEFAULT NULL,
    shipped_from_manufacturer_date        DATE DEFAULT NULL,
    in_yogo_warehouse_date                DATE DEFAULT NULL,
    shipped_from_yogo_date                DATE DEFAULT NULL,
    customer_clearance_date               DATE DEFAULT NULL,
    bill_of_loading_date                  DATE DEFAULT NULL,
    sold_on_date                          DATE DEFAULT NULL,
    reached_destination_date              DATE DEFAULT NULL,
    customer_clearance_destination_date   DATE DEFAULT NULL,
    reached_customer_warehouse_date       DATE DEFAULT NULL,
    order_complete_date                   DATE DEFAULT NULL,
    created_date                          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date                          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_tracking_customer
        FOREIGN KEY (customer_id) REFERENCES customer_master(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ── Quote confirmation email support (see migrations/002_quote_confirmation_email.sql) ──
-- Column adds are guarded via information_schema rather than
-- `ADD COLUMN IF NOT EXISTS`, which MySQL 8.0 (unlike MariaDB) does not support.
SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'get_enquire_quote' AND column_name = 'reference_number'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE get_enquire_quote ADD COLUMN reference_number VARCHAR(30) NULL UNIQUE',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'get_enquire_quote' AND column_name = 'items_json'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE get_enquire_quote ADD COLUMN items_json MEDIUMTEXT NULL',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ── Contact enquiry customer-facing reference (see migrations/003_contact_request_id.sql) ──
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

-- ── General enquiry customer-facing reference (see migrations/004_enquiry_id.sql) ──
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

CREATE TABLE IF NOT EXISTS email_templates (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    template_key            VARCHAR(100) NOT NULL UNIQUE,
    name                    VARCHAR(150) NOT NULL,
    subject                 VARCHAR(255) NOT NULL,
    html_content            MEDIUMTEXT NOT NULL,
    text_content            MEDIUMTEXT,
    is_active               TINYINT(1) NOT NULL DEFAULT 1,
    heading                 VARCHAR(255) NOT NULL DEFAULT 'Thank You for Your Enquiry!',
    intro_text              VARCHAR(1000) NOT NULL DEFAULT '',
    response_text           VARCHAR(500) NOT NULL DEFAULT '',
    footer_text             VARCHAR(500) NOT NULL DEFAULT '',
    sender_name             VARCHAR(150) NOT NULL DEFAULT 'YoGo Ventures',
    reply_to                VARCHAR(255) NULL,
    show_phone              TINYINT(1) NOT NULL DEFAULT 1,
    show_message            TINYINT(1) NOT NULL DEFAULT 1,
    show_product_images     TINYINT(1) NOT NULL DEFAULT 1,
    show_product_variants   TINYINT(1) NOT NULL DEFAULT 1,
    show_quantities         TINYINT(1) NOT NULL DEFAULT 1,
    created_date            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_log (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    quote_id             INT NOT NULL,
    template_key         VARCHAR(100) NOT NULL,
    recipient            VARCHAR(255) NOT NULL,
    status               ENUM('pending','sent','failed','skipped') NOT NULL DEFAULT 'pending',
    provider_message_id  VARCHAR(255) NULL,
    error_message        VARCHAR(500) NULL,
    attempted_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at              TIMESTAMP NULL,
    UNIQUE KEY uq_quote_template (quote_id, template_key),
    CONSTRAINT fk_email_log_quote
        FOREIGN KEY (quote_id) REFERENCES get_enquire_quote(id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- ── General site settings (see migrations/003_site_settings.sql) ────────
-- Backs the admin panel's General / Social Media / Invoice settings tabs.
CREATE TABLE IF NOT EXISTS site_settings (
    id                  INT PRIMARY KEY,
    site_name           VARCHAR(150) NOT NULL DEFAULT '',
    site_tagline        VARCHAR(255) NOT NULL DEFAULT '',
    site_url            VARCHAR(255) NOT NULL DEFAULT '',
    support_email       VARCHAR(255) NOT NULL DEFAULT '',
    support_contact     VARCHAR(30)  NOT NULL DEFAULT '',
    maintenance_mode    TINYINT(1)   NOT NULL DEFAULT 0,
    maintenance_message VARCHAR(500) NOT NULL DEFAULT '',
    social_facebook     VARCHAR(255) NOT NULL DEFAULT '',
    social_instagram    VARCHAR(255) NOT NULL DEFAULT '',
    social_twitter      VARCHAR(255) NOT NULL DEFAULT '',
    social_whatsapp     VARCHAR(30)  NOT NULL DEFAULT '',
    invoice_prefix      VARCHAR(20)  NOT NULL DEFAULT 'INV',
    invoice_footer_note VARCHAR(500) NOT NULL DEFAULT '',
    created_date        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
INSERT IGNORE INTO site_settings (id, invoice_prefix) VALUES (1, 'INV');

-- ── Sample enquiries (admin-managed sample request tracking) ─────────────
-- Table already exists in the live DB (created manually via phpMyAdmin);
-- included here so schema.sql remains a complete initializer for fresh
-- environments.
CREATE TABLE IF NOT EXISTS sample_enquiry (
    enquiry_id      INT PRIMARY KEY,
    customer_id     INT NOT NULL,
    enquired_on     DATE NOT NULL,
    product_name    VARCHAR(255) NOT NULL,
    quantity        INT NOT NULL DEFAULT 1,
    responded       ENUM('Yes', 'No') DEFAULT 'No',
    sample_ordered  ENUM('Yes', 'No') DEFAULT 'No',
    sample_shipped  ENUM('Yes', 'No') DEFAULT 'No',
    order_placed    ENUM('Yes', 'No') DEFAULT 'No',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sample_enquiry_customer
        FOREIGN KEY (customer_id) REFERENCES customer_master(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ── Activity log (see migrations/005_activity_log.sql) ───────────────────
-- Backs the admin panel's real (non-mocked) notification feed. Most
-- notification types are reconstructed from existing tables' own
-- created_date/updated_date; this table only records events that can't be
-- reconstructed after the fact, such as deletions.
CREATE TABLE IF NOT EXISTS activity_log (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    action_type   VARCHAR(50) NOT NULL,
    description   VARCHAR(500) NOT NULL,
    reference_id  VARCHAR(100) NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Product variation images (see migrations/007_product_images.sql) ────
-- Replaces the fixed image1..image5 columns (still present on
-- product_master, but frozen/unused going forward) with a scalable,
-- individually-deletable, orderable set of variation images per product.
CREATE TABLE IF NOT EXISTS product_images (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    product_id   INT NOT NULL,
    image_path   VARCHAR(500) NOT NULL,
    sort_order   INT NOT NULL DEFAULT 0,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_images_product
        FOREIGN KEY (product_id) REFERENCES product_master(id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO product_images (product_id, image_path, sort_order)
SELECT pm.id, pm.image1, 0 FROM product_master pm
WHERE pm.image1 IS NOT NULL AND pm.image1 != ''
  AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = pm.id AND pi.sort_order = 0);

INSERT INTO product_images (product_id, image_path, sort_order)
SELECT pm.id, pm.image2, 1 FROM product_master pm
WHERE pm.image2 IS NOT NULL AND pm.image2 != ''
  AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = pm.id AND pi.sort_order = 1);

INSERT INTO product_images (product_id, image_path, sort_order)
SELECT pm.id, pm.image3, 2 FROM product_master pm
WHERE pm.image3 IS NOT NULL AND pm.image3 != ''
  AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = pm.id AND pi.sort_order = 2);

INSERT INTO product_images (product_id, image_path, sort_order)
SELECT pm.id, pm.image4, 3 FROM product_master pm
WHERE pm.image4 IS NOT NULL AND pm.image4 != ''
  AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = pm.id AND pi.sort_order = 3);

INSERT INTO product_images (product_id, image_path, sort_order)
SELECT pm.id, pm.image5, 4 FROM product_master pm
WHERE pm.image5 IS NOT NULL AND pm.image5 != ''
  AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = pm.id AND pi.sort_order = 4);

-- ── Dynamic order date columns (see migrations/008_order_dynamic_dates.sql) ──
-- Replaces order_tracking's 15 fixed date columns with a scalable title +
-- value structure. The legacy columns stay (frozen, unused) for backward
-- compatibility; new code uses order_dates / order_date_titles exclusively.
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
