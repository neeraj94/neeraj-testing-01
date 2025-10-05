package com.example.rbac.users.dto;

import jakarta.validation.constraints.NotNull;

import java.util.Set;

public class UpdateUserPermissionsRequest {

    @NotNull
    private Set<String> permissionKeys;

    public Set<String> getPermissionKeys() {
        return permissionKeys;
    }

    public void setPermissionKeys(Set<String> permissionKeys) {
        this.permissionKeys = permissionKeys;
    }
}
