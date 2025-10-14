ALTER TABLE product_reviews
    ADD COLUMN IF NOT EXISTS is_published TINYINT(1) NOT NULL DEFAULT 1;

UPDATE product_reviews
SET is_published = 1
WHERE is_published IS NULL;
