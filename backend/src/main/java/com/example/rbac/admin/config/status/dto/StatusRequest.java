package com.example.rbac.admin.config.status.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public class StatusRequest {

    @NotBlank
    private String type;

    @NotBlank
    @Size(max = 80)
    private String name;

    @NotBlank
    @Size(max = 80)
    @Pattern(regexp = "^[A-Z0-9_]+$", message = "Code must be uppercase alphanumeric with optional underscores")
    private String code;

    private String icon;

    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Color must be in #RRGGBB format")
    private String colorHex;

    private String description;

    private Boolean isDefault;

    private Boolean isActive;

    private Boolean visibleToCustomer;

    private List<Long> allowedTransitionIds;

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public String getColorHex() {
        return colorHex;
    }

    public void setColorHex(String colorHex) {
        this.colorHex = colorHex;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Boolean getDefault() {
        return isDefault;
    }

    public void setDefault(Boolean aDefault) {
        isDefault = aDefault;
    }

    public Boolean getActive() {
        return isActive;
    }

    public void setActive(Boolean active) {
        isActive = active;
    }

    public Boolean getVisibleToCustomer() {
        return visibleToCustomer;
    }

    public void setVisibleToCustomer(Boolean visibleToCustomer) {
        this.visibleToCustomer = visibleToCustomer;
    }

    public List<Long> getAllowedTransitionIds() {
        return allowedTransitionIds;
    }

    public void setAllowedTransitionIds(List<Long> allowedTransitionIds) {
        this.allowedTransitionIds = allowedTransitionIds;
    }
}
