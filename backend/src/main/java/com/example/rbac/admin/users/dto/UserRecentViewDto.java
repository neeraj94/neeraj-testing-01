package com.example.rbac.admin.users.dto;

import java.math.BigDecimal;
import java.time.Instant;

public class UserRecentViewDto {

    private Long productId;
    private String productName;
    private String productSlug;
    private String thumbnailUrl;
    private String sku;
    private Instant lastViewedAt;
    private BigDecimal unitPrice;
    private BigDecimal finalPrice;

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public String getProductSlug() {
        return productSlug;
    }

    public void setProductSlug(String productSlug) {
        this.productSlug = productSlug;
    }

    public String getThumbnailUrl() {
        return thumbnailUrl;
    }

    public void setThumbnailUrl(String thumbnailUrl) {
        this.thumbnailUrl = thumbnailUrl;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public Instant getLastViewedAt() {
        return lastViewedAt;
    }

    public void setLastViewedAt(Instant lastViewedAt) {
        this.lastViewedAt = lastViewedAt;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public BigDecimal getFinalPrice() {
        return finalPrice;
    }

    public void setFinalPrice(BigDecimal finalPrice) {
        this.finalPrice = finalPrice;
    }
}
