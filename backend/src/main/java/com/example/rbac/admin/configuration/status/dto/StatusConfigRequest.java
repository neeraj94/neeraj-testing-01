package com.example.rbac.admin.configuration.status.dto;

import com.example.rbac.admin.configuration.status.model.StatusCategory;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public class StatusConfigRequest {

    @NotBlank
    private String name;

    @NotNull
    private StatusCategory category;

    @NotBlank
    @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "Color code must be a valid 6-digit hex color (e.g., #06B6D4)")
    private String colorCode;

    private String icon;
    private String description;

    @NotNull
    @JsonProperty("isDefault")
    private Boolean defaultStatus;

    private Boolean active;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public StatusCategory getCategory() {
        return category;
    }

    public void setCategory(StatusCategory category) {
        this.category = category;
    }

    public String getColorCode() {
        return colorCode;
    }

    public void setColorCode(String colorCode) {
        this.colorCode = colorCode;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Boolean getDefaultStatus() {
        return defaultStatus;
    }

    public void setDefaultStatus(Boolean defaultStatus) {
        this.defaultStatus = defaultStatus;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }
}
