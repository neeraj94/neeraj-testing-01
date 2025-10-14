package com.example.rbac.products.dto;

import java.math.BigDecimal;
import java.util.List;

public class ProductVariantDto {

    private Long id;
    private String key;
    private BigDecimal priceAdjustment;
    private String sku;
    private Integer quantity;
    private List<ProductVariantValueDto> values;
    private List<MediaAssetDto> media;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public BigDecimal getPriceAdjustment() {
        return priceAdjustment;
    }

    public void setPriceAdjustment(BigDecimal priceAdjustment) {
        this.priceAdjustment = priceAdjustment;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public List<ProductVariantValueDto> getValues() {
        return values;
    }

    public void setValues(List<ProductVariantValueDto> values) {
        this.values = values;
    }

    public List<MediaAssetDto> getMedia() {
        return media;
    }

    public void setMedia(List<MediaAssetDto> media) {
        this.media = media;
    }
}
