-- Migration 005: activity log for the admin notifications feed
--
-- Backs the real (non-mocked) admin notification popup. Most notification
-- types (new quote/contact/general/sample enquiries, new orders, products
-- added/updated) can be reconstructed directly from existing tables' own
-- created_date/updated_date columns — no duplicate storage needed for those.
--
-- Deletions (deleted orders, deleted products) can't be reconstructed after
-- the fact since the row is gone, so this table exists specifically to
-- record those events (and any other one-off admin actions worth surfacing)
-- at the time they happen.

USE yogoventures;

CREATE TABLE IF NOT EXISTS activity_log (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    action_type   VARCHAR(50) NOT NULL,
    description   VARCHAR(500) NOT NULL,
    reference_id  VARCHAR(100) NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
