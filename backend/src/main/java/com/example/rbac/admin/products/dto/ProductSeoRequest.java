package com.example.rbac.admin.products.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

public class ProductSeoRequest {

    @Size(max = 200, message = "Meta title must be at most 200 characters")
    private String title;

    private String description;

    @Valid
    private MediaSelectionRequest image;

    private String keywords;

    @Size(max = 255, message = "Canonical URL must be at most 255 characters")
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

    public MediaSelectionRequest getImage() {
        return image;
    }

    public void setImage(MediaSelectionRequest image) {
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
