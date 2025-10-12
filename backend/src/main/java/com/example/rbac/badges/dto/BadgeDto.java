package com.example.rbac.badges.dto;

import com.example.rbac.badges.category.dto.BadgeCategoryOptionDto;

import java.time.Instant;

public class BadgeDto {

    private Long id;
    private String name;
    private String iconUrl;
    private String shortDescription;
    private String longDescription;
    private boolean defaultBadge;
    private BadgeCategoryOptionDto badgeCategory;
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

    public String getIconUrl() {
        return iconUrl;
    }

    public void setIconUrl(String iconUrl) {
        this.iconUrl = iconUrl;
    }

    public String getShortDescription() {
        return shortDescription;
    }

    public void setShortDescription(String shortDescription) {
        this.shortDescription = shortDescription;
    }

    public String getLongDescription() {
        return longDescription;
    }

    public void setLongDescription(String longDescription) {
        this.longDescription = longDescription;
    }

    public boolean isDefaultBadge() {
        return defaultBadge;
    }

    public void setDefaultBadge(boolean defaultBadge) {
        this.defaultBadge = defaultBadge;
    }

    public BadgeCategoryOptionDto getBadgeCategory() {
        return badgeCategory;
    }

    public void setBadgeCategory(BadgeCategoryOptionDto badgeCategory) {
        this.badgeCategory = badgeCategory;
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
