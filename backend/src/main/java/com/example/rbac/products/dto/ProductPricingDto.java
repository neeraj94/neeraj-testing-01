package com.example.rbac.products.dto;

import com.example.rbac.products.model.DiscountType;
import com.example.rbac.products.model.StockVisibilityState;

import java.math.BigDecimal;

public class ProductPricingDto {

    private BigDecimal unitPrice;
    private DiscountType discountType;
    private BigDecimal discountValue;
    private Integer discountMinQuantity;
    private Integer discountMaxQuantity;
    private String priceTag;
    private Integer stockQuantity;
    private String sku;
    private String externalLink;
    private String externalLinkButton;
    private Integer lowStockWarning;
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
