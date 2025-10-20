package com.example.rbac.admin.products.repository;

import com.example.rbac.admin.products.dto.storefront.PublicProductFilterValueDto;
import com.example.rbac.admin.products.dto.storefront.PublicProductListItemDto;
import com.example.rbac.admin.products.dto.storefront.PublicProductPriceRangeDto;
import com.example.rbac.admin.products.dto.storefront.PublicProductSearchCriteria;
import com.example.rbac.admin.products.dto.storefront.PublicProductSearchFiltersDto;
import com.example.rbac.admin.products.dto.storefront.PublicProductSearchResponse;
import com.example.rbac.admin.products.dto.storefront.PublicProductSort;
import com.example.rbac.admin.products.model.DiscountType;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.util.CollectionUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Repository
public class PublicProductSearchRepository {

    private static final String FINAL_PRICE_SQL =
            "GREATEST(COALESCE(p.unit_price, 0) - CASE " +
                    "WHEN p.discount_type = 'FLAT' THEN COALESCE(p.discount_value, 0) " +
                    "WHEN p.discount_type = 'PERCENTAGE' THEN COALESCE(p.unit_price, 0) * COALESCE(p.discount_value, 0) / 100 " +
                    "ELSE 0 END, 0)";

    private static final String TAXED_PRICE_SQL = FINAL_PRICE_SQL +
            " + (" + FINAL_PRICE_SQL + " * COALESCE(tax_stats.percent_total, 0) / 100) " +
            " + COALESCE(tax_stats.flat_total, 0)";

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public PublicProductSearchRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public PublicProductSearchResponse search(PublicProductSearchCriteria criteria) {
        Map<String, Object> baseParams = buildBaseParams(criteria);

        String fromClause = buildFromClause();
        String whereClause = buildWhereClause(criteria);
        String orderClause = buildOrderClause(criteria.getSort());

        Map<String, Object> dataParams = new HashMap<>(baseParams);
        dataParams.put("limit", criteria.getSize());
        dataParams.put("offset", criteria.getPage() * criteria.getSize());

        String selectSql = "SELECT p.id, p.name, p.slug, p.unit_price, p.discount_type, p.discount_value, " +
                "p.stock_quantity, p.created_at, b.name AS brand_name, p.thumbnail_url, " +
                "COALESCE(review_stats.average_rating, 0) AS average_rating, " +
                "COALESCE(review_stats.review_count, 0) AS review_count, " +
                "COALESCE(tax_stats.percent_total, 0) AS tax_percent, " +
                "COALESCE(tax_stats.flat_total, 0) AS tax_flat, " +
                FINAL_PRICE_SQL + " AS final_price, " +
                TAXED_PRICE_SQL + " AS taxed_price, " +
                "CASE WHEN EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id) THEN 1 ELSE 0 END AS has_variants " +
                "FROM " + fromClause + whereClause + orderClause + " LIMIT :limit OFFSET :offset";

        List<PublicProductListItemDto> items = jdbcTemplate.query(selectSql, new MapSqlParameterSource(dataParams), new ProductRowMapper());

        Map<String, Object> countParams = new HashMap<>(baseParams);
        String countSql = "SELECT COUNT(*) FROM " + fromClause + whereClause;
        long total = jdbcTemplate.queryForObject(countSql, new MapSqlParameterSource(countParams), Long.class);

        Map<String, Object> priceParams = new HashMap<>(baseParams);
        String priceSql = "SELECT MIN(" + TAXED_PRICE_SQL + ") AS min_price, MAX(" + TAXED_PRICE_SQL + ") AS max_price FROM " + fromClause + whereClause;
        BigDecimal minPrice = null;
        BigDecimal maxPrice = null;
        List<Map<String, Object>> priceRows = jdbcTemplate.queryForList(priceSql, new MapSqlParameterSource(priceParams));
        if (!priceRows.isEmpty()) {
            Object minValue = priceRows.get(0).get("min_price");
            Object maxValue = priceRows.get(0).get("max_price");
            if (minValue instanceof Number number) {
                minPrice = BigDecimal.valueOf(number.doubleValue()).setScale(2, RoundingMode.HALF_UP);
            }
            if (maxValue instanceof Number number) {
                maxPrice = BigDecimal.valueOf(number.doubleValue()).setScale(2, RoundingMode.HALF_UP);
            }
        }

        PublicProductSearchFiltersDto filters = buildFilters(minPrice, maxPrice);

        PublicProductSearchResponse response = new PublicProductSearchResponse();
        response.setItems(items);
        response.setPage(criteria.getPage());
        response.setSize(criteria.getSize());
        response.setTotalElements(total);
        int totalPages = criteria.getSize() == 0 ? 0 : (int) Math.ceil((double) total / criteria.getSize());
        response.setTotalPages(totalPages);
        response.setHasNext(criteria.getPage() + 1 < totalPages);
        response.setFilters(filters);
        return response;
    }

    private Map<String, Object> buildBaseParams(PublicProductSearchCriteria criteria) {
        Map<String, Object> params = new HashMap<>();
        if (!CollectionUtils.isEmpty(criteria.getCategorySlugs())) {
            params.put("categorySlugs", criteria.getCategorySlugs());
        }
        if (!CollectionUtils.isEmpty(criteria.getBrandSlugs())) {
            params.put("brandSlugs", criteria.getBrandSlugs());
        }
        if (criteria.getMinimumPrice() != null) {
            params.put("minPrice", criteria.getMinimumPrice());
        }
        if (criteria.getMaximumPrice() != null) {
            params.put("maxPrice", criteria.getMaximumPrice());
        }
        if (criteria.getMinimumRating() != null) {
            params.put("minRating", criteria.getMinimumRating());
        }
        return params;
    }

    private String buildFromClause() {
        return "products p " +
                "LEFT JOIN brands b ON b.id = p.brand_id " +
                "LEFT JOIN (" +
                "    SELECT product_id, AVG(rating) AS average_rating, COUNT(*) AS review_count " +
                "    FROM product_reviews WHERE is_published = 1 GROUP BY product_id" +
                ") review_stats ON review_stats.product_id = p.id " +
                "LEFT JOIN (" +
                "    SELECT ptr.product_id, " +
                "           SUM(CASE WHEN tr.rate_type = 'PERCENTAGE' THEN tr.rate_value ELSE 0 END) AS percent_total, " +
                "           SUM(CASE WHEN tr.rate_type = 'FLAT' THEN tr.rate_value ELSE 0 END) AS flat_total " +
                "    FROM product_tax_rates ptr JOIN tax_rates tr ON tr.id = ptr.tax_rate_id GROUP BY ptr.product_id" +
                ") tax_stats ON tax_stats.product_id = p.id";
    }

    private String buildWhereClause(PublicProductSearchCriteria criteria) {
        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        if (!CollectionUtils.isEmpty(criteria.getCategorySlugs())) {
            where.append(" AND EXISTS (SELECT 1 FROM product_categories pc JOIN categories c ON c.id = pc.category_id " +
                    "WHERE pc.product_id = p.id AND c.slug IN (:categorySlugs))");
        }
        if (!CollectionUtils.isEmpty(criteria.getBrandSlugs())) {
            where.append(" AND EXISTS (SELECT 1 FROM brands brand_lookup WHERE brand_lookup.id = p.brand_id " +
                    "AND brand_lookup.slug IN (:brandSlugs))");
        }
        if (criteria.getMinimumPrice() != null) {
            where.append(" AND ").append(TAXED_PRICE_SQL).append(" >= :minPrice");
        }
        if (criteria.getMaximumPrice() != null) {
            where.append(" AND ").append(TAXED_PRICE_SQL).append(" <= :maxPrice");
        }
        if (criteria.getMinimumRating() != null) {
            where.append(" AND COALESCE(review_stats.average_rating, 0) >= :minRating");
        }
        if (criteria.getAvailability() != null) {
            switch (criteria.getAvailability()) {
                case IN_STOCK -> where.append(" AND (p.stock_quantity IS NULL OR p.stock_quantity > 0)");
                case OUT_OF_STOCK -> where.append(" AND p.stock_quantity IS NOT NULL AND p.stock_quantity <= 0");
            }
        }
        return where.toString();
    }

    private String buildOrderClause(PublicProductSort sort) {
        return switch (sort) {
            case PRICE_ASC -> " ORDER BY " + TAXED_PRICE_SQL + " ASC, p.name ASC";
            case PRICE_DESC -> " ORDER BY " + TAXED_PRICE_SQL + " DESC, p.name ASC";
            case HIGHEST_RATED -> " ORDER BY COALESCE(review_stats.average_rating, 0) DESC, p.name ASC";
            case MOST_POPULAR -> " ORDER BY COALESCE(review_stats.review_count, 0) DESC, p.name ASC";
            case NEWEST ->  " ORDER BY p.created_at DESC";
        };
    }

    private PublicProductSearchFiltersDto buildFilters(BigDecimal minPrice, BigDecimal maxPrice) {
        PublicProductSearchFiltersDto filters = new PublicProductSearchFiltersDto();
        filters.setCategories(fetchCategoryFilters());
        filters.setBrands(fetchBrandFilters());
        PublicProductPriceRangeDto priceRange = new PublicProductPriceRangeDto();
        priceRange.setMinimum(minPrice);
        priceRange.setMaximum(maxPrice);
        filters.setPriceRange(priceRange);
        return filters;
    }

    private List<PublicProductFilterValueDto> fetchCategoryFilters() {
        String sql = "SELECT c.id, c.name, c.slug, COUNT(DISTINCT pc.product_id) AS product_count " +
                "FROM categories c " +
                "LEFT JOIN product_categories pc ON pc.category_id = c.id " +
                "LEFT JOIN products p ON p.id = pc.product_id " +
                "GROUP BY c.id, c.name, c.slug " +
                "HAVING product_count > 0 " +
                "ORDER BY c.name ASC";
        return jdbcTemplate.query(sql, new FilterRowMapper());
    }

    private List<PublicProductFilterValueDto> fetchBrandFilters() {
        String sql = "SELECT b.id, b.name, b.slug, COUNT(DISTINCT p.id) AS product_count " +
                "FROM brands b " +
                "LEFT JOIN products p ON p.brand_id = b.id " +
                "GROUP BY b.id, b.name, b.slug " +
                "HAVING product_count > 0 " +
                "ORDER BY b.name ASC";
        return jdbcTemplate.query(sql, new FilterRowMapper());
    }

    private static class ProductRowMapper implements RowMapper<PublicProductListItemDto> {

        @Override
        public PublicProductListItemDto mapRow(ResultSet rs, int rowNum) throws SQLException {
            PublicProductListItemDto dto = new PublicProductListItemDto();
            dto.setId(rs.getLong("id"));
            dto.setName(rs.getString("name"));
            dto.setSlug(rs.getString("slug"));
            dto.setBrandName(rs.getString("brand_name"));
            dto.setThumbnailUrl(rs.getString("thumbnail_url"));

            BigDecimal unitPrice = getBigDecimal(rs, "unit_price");
            dto.setUnitPrice(unitPrice);

            String discountTypeValue = rs.getString("discount_type");
            if (discountTypeValue != null) {
                try {
                    dto.setDiscountType(DiscountType.valueOf(discountTypeValue.toUpperCase(Locale.ROOT)));
                } catch (IllegalArgumentException ignored) {
                    dto.setDiscountType(null);
                }
            }

            BigDecimal finalPrice = getBigDecimal(rs, "final_price");
            if (finalPrice == null) {
                finalPrice = unitPrice;
            }
            dto.setFinalPrice(finalPrice);

            BigDecimal discountAmount = BigDecimal.ZERO;
            if (unitPrice != null && finalPrice != null) {
                discountAmount = unitPrice.subtract(finalPrice).max(BigDecimal.ZERO);
            }
            dto.setDiscountAmount(discountAmount);
            dto.setDiscountPercentage(resolveDiscountPercentage(unitPrice, discountAmount));

            dto.setTaxInclusivePrice(getBigDecimal(rs, "taxed_price"));

            double averageRating = rs.getDouble("average_rating");
            if (rs.wasNull()) {
                averageRating = 0;
            }
            dto.setAverageRating(averageRating);
            dto.setReviewCount(rs.getInt("review_count"));

            Integer stockQuantity = getInteger(rs, "stock_quantity");
            boolean inStock = stockQuantity == null || stockQuantity > 0;
            dto.setInStock(inStock);
            dto.setStockStatus(inStock ? "In stock" : "Out of stock");

            int hasVariants = rs.getInt("has_variants");
            dto.setHasVariants(hasVariants == 1);
            return dto;
        }

        private Integer resolveDiscountPercentage(BigDecimal unitPrice, BigDecimal discountAmount) {
            if (unitPrice == null || unitPrice.compareTo(BigDecimal.ZERO) <= 0 || discountAmount == null) {
                return null;
            }
            if (discountAmount.compareTo(BigDecimal.ZERO) <= 0) {
                return 0;
            }
            BigDecimal percentage = discountAmount.multiply(BigDecimal.valueOf(100)).divide(unitPrice, 0, RoundingMode.HALF_UP);
            return percentage.intValue();
        }

        private BigDecimal getBigDecimal(ResultSet rs, String column) throws SQLException {
            BigDecimal value = rs.getBigDecimal(column);
            if (rs.wasNull()) {
                return null;
            }
            return value;
        }

        private Integer getInteger(ResultSet rs, String column) throws SQLException {
            int value = rs.getInt(column);
            if (rs.wasNull()) {
                return null;
            }
            return value;
        }
    }

    private static class FilterRowMapper implements RowMapper<PublicProductFilterValueDto> {

        @Override
        public PublicProductFilterValueDto mapRow(ResultSet rs, int rowNum) throws SQLException {
            PublicProductFilterValueDto dto = new PublicProductFilterValueDto();
            long id = rs.getLong("id");
            if (!rs.wasNull()) {
                dto.setId(id);
            }
            dto.setName(rs.getString("name"));
            dto.setSlug(rs.getString("slug"));
            long count = rs.getLong("product_count");
            if (rs.wasNull()) {
                count = 0;
            }
            dto.setProductCount(Math.max(count, 0));
            return dto;
        }
    }
}
