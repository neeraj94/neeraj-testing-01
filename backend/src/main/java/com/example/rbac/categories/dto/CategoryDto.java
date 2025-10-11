package com.example.rbac.categories.dto;

import java.time.Instant;

public class CategoryDto {

    private Long id;
    private String name;
    private String slug;
    private String type;
    private Long parentId;
    private String parentName;
    private Integer orderNumber;
    private String bannerUrl;
    private String iconUrl;
    private String coverUrl;
    private String metaTitle;
    private String metaDescription;
    private String metaKeywords;
    private String metaCanonicalUrl;
    private String metaRobots;
    private String metaOgTitle;
    private String metaOgDescription;
    private String metaOgImage;
    private Instant createdAt;
    private Instant updatedAt;

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

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Long getParentId() {
        return parentId;
    }

    public void setParentId(Long parentId) {
        this.parentId = parentId;
    }

    public String getParentName() {
        return parentName;
    }

    public void setParentName(String parentName) {
        this.parentName = parentName;
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

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
