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
    created_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

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
    sub_category_name    VARCHAR(100) NOT NULL,
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
