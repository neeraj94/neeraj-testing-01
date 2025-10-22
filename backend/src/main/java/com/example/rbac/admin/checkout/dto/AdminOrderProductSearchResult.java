package com.example.rbac.admin.checkout.dto;

public class AdminOrderProductSearchResult {

    private Long id;
    private String name;
    private String sku;
    private String thumbnailUrl;
    private String brandName;
    private String primaryCategory;

    public AdminOrderProductSearchResult() {
    }

    public AdminOrderProductSearchResult(Long id, String name, String sku) {
        this.id = id;
        this.name = name;
        this.sku = sku;
    }

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
}
