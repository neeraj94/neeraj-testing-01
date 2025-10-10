package com.example.rbac.wedges.dto;

import com.example.rbac.categories.dto.CategoryOptionDto;

import java.time.Instant;

public class WedgeDto {

    private Long id;
    private String name;
    private String iconUrl;
    private String shortDescription;
    private String longDescription;
    private boolean defaultWedge;
    private CategoryOptionDto category;
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

    public boolean isDefaultWedge() {
        return defaultWedge;
    }

    public void setDefaultWedge(boolean defaultWedge) {
        this.defaultWedge = defaultWedge;
    }

    public CategoryOptionDto getCategory() {
        return category;
    }

    public void setCategory(CategoryOptionDto category) {
        this.category = category;
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
