package com.example.rbac.products.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class ProductVariantRequest {

    @NotBlank(message = "Variant key is required")
    @Size(max = 200, message = "Variant key must be at most 200 characters")
    private String key;

    private List<Long> attributeValueIds = new ArrayList<>();

    private BigDecimal priceAdjustment;

    @Size(max = 160, message = "SKU must be at most 160 characters")
    private String sku;

    private Integer quantity;

    @Valid
    private List<MediaSelectionRequest> media = new ArrayList<>();

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public List<Long> getAttributeValueIds() {
        return attributeValueIds;
    }

    public void setAttributeValueIds(List<Long> attributeValueIds) {
        this.attributeValueIds = attributeValueIds;
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

    public List<MediaSelectionRequest> getMedia() {
        return media;
    }

    public void setMedia(List<MediaSelectionRequest> media) {
        this.media = media;
    }
}
