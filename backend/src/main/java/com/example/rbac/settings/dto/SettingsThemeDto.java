package com.example.rbac.settings.dto;

public class SettingsThemeDto {
    private String primaryColor;
    private String applicationName;

    public SettingsThemeDto() {
    }

    public SettingsThemeDto(String primaryColor, String applicationName) {
        this.primaryColor = primaryColor;
        this.applicationName = applicationName;
    }

    public String getPrimaryColor() {
        return primaryColor;
    }

    public void setPrimaryColor(String primaryColor) {
        this.primaryColor = primaryColor;
    }

    public String getApplicationName() {
        return applicationName;
    }

    public void setApplicationName(String applicationName) {
        this.applicationName = applicationName;
    }
}
