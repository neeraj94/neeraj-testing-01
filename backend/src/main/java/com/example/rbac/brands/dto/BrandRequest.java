package com.example.rbac.brands.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class BrandRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 150, message = "Name must be at most 150 characters")
    private String name;

    @Size(max = 160, message = "Slug must be at most 160 characters")
    private String slug;

    @Size(max = 5000, message = "Description is too long")
    private String description;

    @Size(max = 255, message = "Logo URL must be at most 255 characters")
    private String logoUrl;

    @Size(max = 200, message = "Meta title must be at most 200 characters")
    private String metaTitle;

    private String metaDescription;

    private String metaKeywords;

    @Size(max = 255, message = "Canonical URL must be at most 255 characters")
    private String metaCanonicalUrl;

    @Size(max = 100, message = "Robots directive must be at most 100 characters")
    private String metaRobots;

    @Size(max = 200, message = "Open Graph title must be at most 200 characters")
    private String metaOgTitle;

    private String metaOgDescription;

    @Size(max = 255, message = "Open Graph image URL must be at most 255 characters")
    private String metaOgImage;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLogoUrl() {
        return logoUrl;
    }

    public void setLogoUrl(String logoUrl) {
        this.logoUrl = logoUrl;
    }

    public String getMetaTitle() {
        return metaTitle;
    }

    public void setMetaTitle(String metaTitle) {
        this.metaTitle = metaTitle;
    }

    public String getMetaDescription() {
        return metaDescription;
    }

    public void setMetaDescription(String metaDescription) {
        this.metaDescription = metaDescription;
    }

    public String getMetaKeywords() {
        return metaKeywords;
    }

    public void setMetaKeywords(String metaKeywords) {
        this.metaKeywords = metaKeywords;
    }

    public String getMetaCanonicalUrl() {
        return metaCanonicalUrl;
    }

    public void setMetaCanonicalUrl(String metaCanonicalUrl) {
        this.metaCanonicalUrl = metaCanonicalUrl;
    }

    public String getMetaRobots() {
        return metaRobots;
    }

    public void setMetaRobots(String metaRobots) {
        this.metaRobots = metaRobots;
    }

    public String getMetaOgTitle() {
        return metaOgTitle;
    }

    public void setMetaOgTitle(String metaOgTitle) {
        this.metaOgTitle = metaOgTitle;
    }

    public String getMetaOgDescription() {
        return metaOgDescription;
    }

    public void setMetaOgDescription(String metaOgDescription) {
        this.metaOgDescription = metaOgDescription;
    }

    public String getMetaOgImage() {
        return metaOgImage;
    }

    public void setMetaOgImage(String metaOgImage) {
        this.metaOgImage = metaOgImage;
    }
}
