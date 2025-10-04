package com.example.rbac.permissions.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class PermissionRequest {

    @NotBlank
    @Size(max = 100)
    private String key;

    @NotBlank
    @Size(max = 150)
    private String name;

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
