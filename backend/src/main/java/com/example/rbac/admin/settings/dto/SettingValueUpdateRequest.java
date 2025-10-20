package com.example.rbac.admin.settings.dto;

import jakarta.validation.constraints.NotBlank;

public class SettingValueUpdateRequest {
    @NotBlank
    private String code;

    private String value;

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }
}
