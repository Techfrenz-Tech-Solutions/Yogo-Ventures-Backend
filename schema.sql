-- Yogo Ventures — database schema
-- Run against a MySQL server as: mysql -u root -p < schema.sql
-- (or paste into a MySQL client). Matches the columns/queries used in
-- controllers/itemMasterController.js and controllers/authController.js.

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
