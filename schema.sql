-- Yogo Ventures — database schema
-- Run against a MySQL server as: mysql -u root -p < schema.sql
-- (or paste into a MySQL client). Matches every table/column referenced by
-- the routes actually mounted in app.js — controllers/itemMasterController.js
-- and controllers/authController.js.
--
-- NOT included here: the mo_* tables referenced by controllers/userController.js
-- (mo_user_info, mo_user_wallet, mo_wallet_request, mo_user_tickets, etc.) and
-- sitesetting (helper.appMaintenance). That controller/router pair belongs to
-- an unrelated project and userRouter.js is never mounted in app.js, so it's
-- dead code — see the audit summary for details.

CREATE DATABASE IF NOT EXISTS yogoventures;
USE yogoventures;

-- ── Auth (see QUICK_START.md) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    full_name     VARCHAR(255) NOT NULL,
    email_id      VARCHAR(255) NOT NULL UNIQUE,
    phone_number  VARCHAR(20)  DEFAULT NULL,
    password      VARCHAR(255) NOT NULL,
    created_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Real admin login matching the credentials shown on the admin panel's
-- LoginPage.jsx (admin@yogoventures.com / Yogo@123). Hash generated with
-- bcrypt.hash('Yogo@123', 10) — safe to re-run, INSERT IGNORE skips if it exists.
INSERT IGNORE INTO users (full_name, email_id, phone_number, password)
VALUES (
    'Admin',
    'admin@yogoventures.com',
    NULL,
    '$2b$10$4AE0.O4iXXmAW8WvY5uNr.7EssRMDvkuZlRQY8hQDOB45sAMr0T0.'
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
