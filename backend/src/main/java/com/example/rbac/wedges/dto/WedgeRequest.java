package com.example.rbac.wedges.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public class WedgeRequest {

    @NotBlank
    @Size(max = 150)
    private String name;

    @Size(max = 255)
    private String iconUrl;

    private String shortDescription;

    private String longDescription;

    private boolean defaultWedge;

    @Positive
    private Long categoryId;

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

    public boolean isDefaultWedge() {
        return defaultWedge;
    }

    public void setDefaultWedge(boolean defaultWedge) {
        this.defaultWedge = defaultWedge;
    }

    public Long getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(Long categoryId) {
        this.categoryId = categoryId;
    }
}
