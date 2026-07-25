-- Migration 016: supporting indexes for authenticated admin global search.
-- These indexes help the common exact/prefix lookup fields used by
-- /dashboard/global-search. Free-text contains searches still work via LIKE;
-- at larger catalog/order volume, move that part to FULLTEXT or a search
-- service such as Meilisearch/Typesense/Elasticsearch.

USE yogoventures;

DROP PROCEDURE IF EXISTS add_index_if_missing;
DELIMITER //
CREATE PROCEDURE add_index_if_missing(
    IN table_name_in VARCHAR(64),
    IN index_name_in VARCHAR(64),
    IN ddl_in TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = table_name_in
          AND index_name = index_name_in
    ) THEN
        SET @sql := ddl_in;
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END//
DELIMITER ;

CALL add_index_if_missing('product_master', 'idx_product_code', 'ALTER TABLE product_master ADD INDEX idx_product_code (product_code)');
CALL add_index_if_missing('product_master', 'idx_product_name', 'ALTER TABLE product_master ADD INDEX idx_product_name (product_name)');
CALL add_index_if_missing('customer_master', 'idx_customer_name', 'ALTER TABLE customer_master ADD INDEX idx_customer_name (customer_name)');
CALL add_index_if_missing('customer_master', 'idx_customer_email', 'ALTER TABLE customer_master ADD INDEX idx_customer_email (email_id)');
CALL add_index_if_missing('customer_master', 'idx_customer_phone', 'ALTER TABLE customer_master ADD INDEX idx_customer_phone (phone_number)');
CALL add_index_if_missing('order_tracking', 'idx_order_tracking_order_id', 'ALTER TABLE order_tracking ADD INDEX idx_order_tracking_order_id (order_id)');
CALL add_index_if_missing('get_enquire_quote', 'idx_quote_reference', 'ALTER TABLE get_enquire_quote ADD INDEX idx_quote_reference (reference_number)');
CALL add_index_if_missing('get_enquire_quote', 'idx_quote_email', 'ALTER TABLE get_enquire_quote ADD INDEX idx_quote_email (email_id)');
CALL add_index_if_missing('get_enquire_quote', 'idx_quote_phone', 'ALTER TABLE get_enquire_quote ADD INDEX idx_quote_phone (phone_number)');
CALL add_index_if_missing('contact_us_enquiry', 'idx_contact_reference', 'ALTER TABLE contact_us_enquiry ADD INDEX idx_contact_reference (reference_number)');
CALL add_index_if_missing('contact_us_enquiry', 'idx_contact_email', 'ALTER TABLE contact_us_enquiry ADD INDEX idx_contact_email (email_id)');
CALL add_index_if_missing('contact_us_enquiry', 'idx_contact_phone', 'ALTER TABLE contact_us_enquiry ADD INDEX idx_contact_phone (phone_number)');
CALL add_index_if_missing('enquiries', 'idx_enquiry_reference', 'ALTER TABLE enquiries ADD INDEX idx_enquiry_reference (reference_number)');
CALL add_index_if_missing('enquiries', 'idx_enquiry_email', 'ALTER TABLE enquiries ADD INDEX idx_enquiry_email (email_id)');
CALL add_index_if_missing('enquiries', 'idx_enquiry_phone', 'ALTER TABLE enquiries ADD INDEX idx_enquiry_phone (phone_number)');
CALL add_index_if_missing('sample_enquiry', 'idx_sample_customer', 'ALTER TABLE sample_enquiry ADD INDEX idx_sample_customer (customer_id)');
CALL add_index_if_missing('sample_enquiry', 'idx_sample_product', 'ALTER TABLE sample_enquiry ADD INDEX idx_sample_product (product_name)');

DROP PROCEDURE IF EXISTS add_index_if_missing;
