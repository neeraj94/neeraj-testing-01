package com.example.rbac.admin.config.status.dto;

public class StatusPatchRequest {

    private Boolean isActive;
    private Boolean isDefault;

    public Boolean getActive() {
        return isActive;
    }

    public void setActive(Boolean active) {
        isActive = active;
    }

    public Boolean getDefault() {
        return isDefault;
    }

    public void setDefault(Boolean aDefault) {
        isDefault = aDefault;
    }
}
