package com.example.rbac.categories.dto;

import com.example.rbac.categories.model.CategoryType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class CategoryRequest {

    @NotBlank
    @Size(max = 150)
    private String name;

    @Size(max = 160)
    private String slug;

    @NotNull
    private CategoryType type;

    private Long parentId;

    private Integer orderNumber;

    @Size(max = 255)
    private String bannerUrl;

    @Size(max = 255)
    private String iconUrl;

    @Size(max = 255)
    private String coverUrl;

    @Size(max = 200)
    private String metaTitle;

    private String metaDescription;

    private String metaKeywords;

    @Size(max = 255)
    private String metaCanonicalUrl;

    @Size(max = 100)
    private String metaRobots;

    @Size(max = 200)
    private String metaOgTitle;

    private String metaOgDescription;

    @Size(max = 255)
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

    public CategoryType getType() {
        return type;
    }

    public void setType(CategoryType type) {
        this.type = type;
    }

    public Long getParentId() {
        return parentId;
    }

    public void setParentId(Long parentId) {
        this.parentId = parentId;
    }

    public Integer getOrderNumber() {
        return orderNumber;
    }

    public void setOrderNumber(Integer orderNumber) {
        this.orderNumber = orderNumber;
    }

    public String getBannerUrl() {
        return bannerUrl;
    }

    public void setBannerUrl(String bannerUrl) {
        this.bannerUrl = bannerUrl;
    }

    public String getIconUrl() {
        return iconUrl;
    }

    public void setIconUrl(String iconUrl) {
        this.iconUrl = iconUrl;
    }

    public String getCoverUrl() {
        return coverUrl;
    }

    public void setCoverUrl(String coverUrl) {
        this.coverUrl = coverUrl;
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
