package com.example.rbac.users.dto;

import jakarta.validation.constraints.NotNull;

import java.util.Set;

public class UpdateUserPermissionsRequest {

    @NotNull
    private Set<String> grantedPermissionKeys;

    @NotNull
    private Set<String> revokedPermissionKeys;

    public Set<String> getGrantedPermissionKeys() {
        return grantedPermissionKeys;
    }

    public void setGrantedPermissionKeys(Set<String> grantedPermissionKeys) {
        this.grantedPermissionKeys = grantedPermissionKeys;
    }

    public Set<String> getRevokedPermissionKeys() {
        return revokedPermissionKeys;
    }

    public void setRevokedPermissionKeys(Set<String> revokedPermissionKeys) {
        this.revokedPermissionKeys = revokedPermissionKeys;
    }
}
