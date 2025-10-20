package com.example.rbac.admin.settings.dto;

import java.util.List;

public class SettingsResponse {
    private List<SettingsCategoryDto> categories;

    public SettingsResponse() {
    }

    public SettingsResponse(List<SettingsCategoryDto> categories) {
        this.categories = categories;
    }

    public List<SettingsCategoryDto> getCategories() {
        return categories;
    }

    public void setCategories(List<SettingsCategoryDto> categories) {
        this.categories = categories;
    }
}
