package com.example.rbac.products.dto;

public class ProductSeoDto {

    private String title;
    private String description;
    private MediaAssetDto image;
    private String keywords;
    private String canonicalUrl;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public MediaAssetDto getImage() {
        return image;
    }

    public void setImage(MediaAssetDto image) {
        this.image = image;
    }

    public String getKeywords() {
        return keywords;
    }

    public void setKeywords(String keywords) {
        this.keywords = keywords;
    }

    public String getCanonicalUrl() {
        return canonicalUrl;
    }

    public void setCanonicalUrl(String canonicalUrl) {
        this.canonicalUrl = canonicalUrl;
    }
}
