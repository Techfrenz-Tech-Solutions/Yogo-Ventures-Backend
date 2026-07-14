-- Migration 007: dynamic product variation images
--
-- Replaces the fixed image1..image5 columns on product_master with a
-- proper related table, so the admin panel can store any number of
-- variation images per product (not capped at 5), delete individual ones,
-- and preserve ordering.
--
-- image1..image5 are intentionally NOT dropped — they stay as frozen,
-- unused legacy columns so nothing that still reads them (older deployed
-- frontend bundles, direct DB tooling) breaks. New code reads/writes
-- variation images exclusively through product_images from here on.
--
-- Existing image1..image5 values are migrated into product_images with
-- sort_order 0..4 (in that column order), one row per non-empty value, so
-- existing products keep every image they already had.

USE yogoventures;

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

-- One-time backfill — each insert is guarded per (product_id, sort_order)
-- slot so re-running this migration never duplicates rows.
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
