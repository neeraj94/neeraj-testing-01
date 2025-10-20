package com.example.rbac.admin.settings.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class SettingsUpdateRequest {
    @NotEmpty
    @Valid
    private List<SettingValueUpdateRequest> updates;

    public List<SettingValueUpdateRequest> getUpdates() {
        return updates;
    }

    public void setUpdates(List<SettingValueUpdateRequest> updates) {
        this.updates = updates;
    }
}
