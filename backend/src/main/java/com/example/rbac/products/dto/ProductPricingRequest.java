package com.example.rbac.products.dto;

import com.example.rbac.products.model.DiscountType;
import com.example.rbac.products.model.StockVisibilityState;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public class ProductPricingRequest {

    @NotNull(message = "Unit price is required")
    @DecimalMin(value = "0", message = "Unit price cannot be negative")
    private BigDecimal unitPrice;

    @NotNull(message = "Discount type is required")
    private DiscountType discountType;

    private BigDecimal discountValue;

    private Integer discountMinQuantity;

    private Integer discountMaxQuantity;

    @Size(max = 120, message = "Price tag must be at most 120 characters")
    private String priceTag;

    private Integer stockQuantity;

    @Size(max = 160, message = "SKU must be at most 160 characters")
    private String sku;

    @Size(max = 500, message = "External link must be at most 500 characters")
    private String externalLink;

    @Size(max = 120, message = "External button must be at most 120 characters")
    private String externalLinkButton;

    private Integer lowStockWarning;

    @NotNull(message = "Stock visibility is required")
    private StockVisibilityState stockVisibility;

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public DiscountType getDiscountType() {
        return discountType;
    }

    public void setDiscountType(DiscountType discountType) {
        this.discountType = discountType;
    }

    public BigDecimal getDiscountValue() {
        return discountValue;
    }

    public void setDiscountValue(BigDecimal discountValue) {
        this.discountValue = discountValue;
    }

    public Integer getDiscountMinQuantity() {
        return discountMinQuantity;
    }

    public void setDiscountMinQuantity(Integer discountMinQuantity) {
        this.discountMinQuantity = discountMinQuantity;
    }

    public Integer getDiscountMaxQuantity() {
        return discountMaxQuantity;
    }

    public void setDiscountMaxQuantity(Integer discountMaxQuantity) {
        this.discountMaxQuantity = discountMaxQuantity;
    }

    public String getPriceTag() {
        return priceTag;
    }

    public void setPriceTag(String priceTag) {
        this.priceTag = priceTag;
    }

    public Integer getStockQuantity() {
        return stockQuantity;
    }

    public void setStockQuantity(Integer stockQuantity) {
        this.stockQuantity = stockQuantity;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public String getExternalLink() {
        return externalLink;
    }

    public void setExternalLink(String externalLink) {
        this.externalLink = externalLink;
    }

    public String getExternalLinkButton() {
        return externalLinkButton;
    }

    public void setExternalLinkButton(String externalLinkButton) {
        this.externalLinkButton = externalLinkButton;
    }

    public Integer getLowStockWarning() {
        return lowStockWarning;
    }

    public void setLowStockWarning(Integer lowStockWarning) {
        this.lowStockWarning = lowStockWarning;
    }

    public StockVisibilityState getStockVisibility() {
        return stockVisibility;
    }

    public void setStockVisibility(StockVisibilityState stockVisibility) {
        this.stockVisibility = stockVisibility;
    }
}
