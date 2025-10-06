package com.example.rbac.settings.dto;

public class SettingsThemeDto {
    private String primaryColor;

    public SettingsThemeDto() {
    }

    public SettingsThemeDto(String primaryColor) {
        this.primaryColor = primaryColor;
    }

    public String getPrimaryColor() {
        return primaryColor;
    }

    public void setPrimaryColor(String primaryColor) {
        this.primaryColor = primaryColor;
    }
}
