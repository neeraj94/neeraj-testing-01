package com.example.rbac.admin.badges.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public class BadgeRequest {

    @NotBlank
    @Size(max = 150)
    private String name;

    @Size(max = 255)
    private String iconUrl;

    private String shortDescription;

    private String longDescription;

    private boolean defaultBadge;

    @Positive
    private Long badgeCategoryId;

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

    public Long getBadgeCategoryId() {
        return badgeCategoryId;
    }

    public void setBadgeCategoryId(Long badgeCategoryId) {
        this.badgeCategoryId = badgeCategoryId;
    }
}
