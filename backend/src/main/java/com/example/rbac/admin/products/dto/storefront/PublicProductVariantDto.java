package com.example.rbac.admin.products.dto.storefront;

import com.example.rbac.admin.products.dto.MediaAssetDto;

import java.math.BigDecimal;
import java.util.List;

public class PublicProductVariantDto {

    private Long id;
    private String key;
    private String sku;
    private Integer quantity;
    private boolean inStock;
    private BigDecimal priceAdjustment;
    private BigDecimal finalPrice;
    private List<PublicProductVariantSelectionDto> selections;
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

    public boolean isInStock() {
        return inStock;
    }

    public void setInStock(boolean inStock) {
        this.inStock = inStock;
    }

    public BigDecimal getPriceAdjustment() {
        return priceAdjustment;
    }

    public void setPriceAdjustment(BigDecimal priceAdjustment) {
        this.priceAdjustment = priceAdjustment;
    }

    public BigDecimal getFinalPrice() {
        return finalPrice;
    }

    public void setFinalPrice(BigDecimal finalPrice) {
        this.finalPrice = finalPrice;
    }

    public List<PublicProductVariantSelectionDto> getSelections() {
        return selections;
    }

    public void setSelections(List<PublicProductVariantSelectionDto> selections) {
        this.selections = selections;
    }

    public List<MediaAssetDto> getMedia() {
        return media;
    }

    public void setMedia(List<MediaAssetDto> media) {
        this.media = media;
    }
}
