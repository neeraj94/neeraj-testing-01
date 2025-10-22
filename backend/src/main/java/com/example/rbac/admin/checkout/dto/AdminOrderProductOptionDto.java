package com.example.rbac.admin.checkout.dto;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

/**
 * Represents a purchasable product (and optionally variant) that can be added to an admin order.
 */
public class AdminOrderProductOptionDto {

    private Long productId;
    private String productName;
    private String productSlug;
    private String productSku;
    private String productVariety;
    private String productSlot;
    private String brandName;
    private String thumbnailUrl;

    private Long variantId;
    private String variantSku;
    private String variantLabel;
    private String variantKey;

    private boolean hasVariants;
    private List<AdminOrderProductVariantOptionDto> variants = Collections.emptyList();

    private Long taxRateId;
    private String taxRateName;
    private BigDecimal taxRate; // expressed as a decimal (e.g. 0.18 for 18%)

    private BigDecimal unitPrice;

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

    public String getProductSku() {
        return productSku;
    }

    public void setProductSku(String productSku) {
        this.productSku = productSku;
    }

    public String getProductVariety() {
        return productVariety;
    }

    public void setProductVariety(String productVariety) {
        this.productVariety = productVariety;
    }

    public String getProductSlot() {
        return productSlot;
    }

    public void setProductSlot(String productSlot) {
        this.productSlot = productSlot;
    }

    public String getBrandName() {
        return brandName;
    }

    public void setBrandName(String brandName) {
        this.brandName = brandName;
    }

    public String getThumbnailUrl() {
        return thumbnailUrl;
    }

    public void setThumbnailUrl(String thumbnailUrl) {
        this.thumbnailUrl = thumbnailUrl;
    }

    public Long getVariantId() {
        return variantId;
    }

    public void setVariantId(Long variantId) {
        this.variantId = variantId;
    }

    public String getVariantSku() {
        return variantSku;
    }

    public void setVariantSku(String variantSku) {
        this.variantSku = variantSku;
    }

    public String getVariantLabel() {
        return variantLabel;
    }

    public void setVariantLabel(String variantLabel) {
        this.variantLabel = variantLabel;
    }

    public String getVariantKey() {
        return variantKey;
    }

    public void setVariantKey(String variantKey) {
        this.variantKey = variantKey;
    }

    public Long getTaxRateId() {
        return taxRateId;
    }

    public void setTaxRateId(Long taxRateId) {
        this.taxRateId = taxRateId;
    }

    public String getTaxRateName() {
        return taxRateName;
    }

    public void setTaxRateName(String taxRateName) {
        this.taxRateName = taxRateName;
    }

    public BigDecimal getTaxRate() {
        return taxRate;
    }

    public void setTaxRate(BigDecimal taxRate) {
        this.taxRate = taxRate;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public boolean isHasVariants() {
        return hasVariants;
    }

    public void setHasVariants(boolean hasVariants) {
        this.hasVariants = hasVariants;
    }

    public List<AdminOrderProductVariantOptionDto> getVariants() {
        return variants;
    }

    public void setVariants(List<AdminOrderProductVariantOptionDto> variants) {
        this.variants = variants != null ? variants : Collections.emptyList();
    }
}
