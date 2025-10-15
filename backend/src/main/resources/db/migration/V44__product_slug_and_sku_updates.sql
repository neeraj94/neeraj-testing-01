ALTER TABLE products
    ADD COLUMN slug VARCHAR(160) NULL AFTER name;

UPDATE products
SET slug = LOWER(REGEXP_REPLACE(TRIM(name), '[^a-zA-Z0-9]+', '-'));

UPDATE products
SET slug = CONCAT('product-', LPAD(id, 8, '0'))
WHERE slug IS NULL OR slug = '' OR slug = '-';

WITH ranked AS (
    SELECT id,
           slug,
           ROW_NUMBER() OVER (PARTITION BY slug ORDER BY id) AS rn
    FROM products
)
UPDATE products p
JOIN ranked r ON p.id = r.id
SET p.slug = CASE
    WHEN r.rn = 1 THEN p.slug
    ELSE CONCAT(p.slug, '-', r.rn - 1)
END;

UPDATE products
SET slug = LEFT(slug, 160);

ALTER TABLE products
    MODIFY slug VARCHAR(160) NOT NULL;

CREATE UNIQUE INDEX uk_products_slug ON products (slug);

UPDATE product_variants v
JOIN products p ON v.product_id = p.id
SET v.sku = UPPER(CONCAT(p.slug, '-VAR-', LPAD(v.id, 4, '0')))
WHERE v.sku IS NULL OR v.sku = '';
