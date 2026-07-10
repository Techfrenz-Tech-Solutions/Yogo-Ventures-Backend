-- Migration 002: quote-confirmation email + general site settings
--
-- Combined into a single file since this project has no migration-tracking
-- runner (schema.sql is the canonical DDL; ad-hoc *.sql files like this one
-- are just meant to be run once by hand against an already-deployed DB —
-- see local-migration.sql for the existing precedent). Every statement here
-- is independently idempotent, so it's also safe to re-run in full.
--
-- Part 1: adds a server-generated quote reference + structured line-item
-- snapshot to get_enquire_quote, a DB-backed email_templates table (so the
-- confirmation email's copy/design lives in the DB, not hardcoded), and an
-- email_log delivery-tracking table.
--
-- Part 2: adds site_settings — a singleton table backing the admin panel's
-- pre-existing General / Social Media / Invoice settings tabs, which called
-- GET/PUT /settings but had no backend route or table until now.
--
-- The two ALTER TABLE column additions in Part 1 are guarded via
-- information_schema + a prepared statement, since plain
-- `ADD COLUMN IF NOT EXISTS` is a MariaDB-only extension not supported by
-- this server (confirmed: MySQL 8.0.46 rejects it with a syntax error).
-- Existing get_enquire_quote rows remain valid since the new columns are
-- nullable.

USE yogoventures;

-- ═══════════════════════════════════════════════════════════════════════
-- Part 1 — quote-confirmation email
-- ═══════════════════════════════════════════════════════════════════════

-- ── Extend get_enquire_quote (idempotent column adds) ────────────────────
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

-- ── Email templates (DB-backed, admin-editable structured fields only) ───
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

-- ── Email delivery log (idempotency + troubleshooting) ───────────────────
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

-- ═══════════════════════════════════════════════════════════════════════
-- Part 2 — general site settings (admin panel General/Social/Invoice tabs)
-- ═══════════════════════════════════════════════════════════════════════

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

-- Singleton row — the app always reads/writes id=1. INSERT IGNORE means this
-- never clobbers an already-customised row on re-run.
INSERT IGNORE INTO site_settings (id, invoice_prefix) VALUES (1, 'INV');
