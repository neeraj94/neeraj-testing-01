package com.example.rbac.admin.settings.dto;

public class SettingsThemeDto {
    private String primaryColor;
    private String applicationName;
    private String baseCurrency;

    public SettingsThemeDto() {
    }

    public SettingsThemeDto(String primaryColor, String applicationName, String baseCurrency) {
        this.primaryColor = primaryColor;
        this.applicationName = applicationName;
        this.baseCurrency = baseCurrency;
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

    public String getBaseCurrency() {
        return baseCurrency;
    }

    public void setBaseCurrency(String baseCurrency) {
        this.baseCurrency = baseCurrency;
    }
}
