package com.example.rbac.admin.checkout.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class AdminOrderProductOption {

    private Long id;
    private String name;
    private String sku;
    private String slug;
    private String thumbnailUrl;
    private String brandName;
    private String primaryCategory;
    private BigDecimal baseUnitPrice;
    private BigDecimal effectiveTaxRate;
    private final List<AdminOrderProductVariantOption> variants = new ArrayList<>();

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getThumbnailUrl() {
        return thumbnailUrl;
    }

    public void setThumbnailUrl(String thumbnailUrl) {
        this.thumbnailUrl = thumbnailUrl;
    }

    public String getBrandName() {
        return brandName;
    }

    public void setBrandName(String brandName) {
        this.brandName = brandName;
    }

    public String getPrimaryCategory() {
        return primaryCategory;
    }

    public void setPrimaryCategory(String primaryCategory) {
        this.primaryCategory = primaryCategory;
    }

    public BigDecimal getBaseUnitPrice() {
        return baseUnitPrice;
    }

    public void setBaseUnitPrice(BigDecimal baseUnitPrice) {
        this.baseUnitPrice = baseUnitPrice;
    }

    public BigDecimal getEffectiveTaxRate() {
        return effectiveTaxRate;
    }

    public void setEffectiveTaxRate(BigDecimal effectiveTaxRate) {
        this.effectiveTaxRate = effectiveTaxRate;
    }

    public List<AdminOrderProductVariantOption> getVariants() {
        return variants;
    }
}
