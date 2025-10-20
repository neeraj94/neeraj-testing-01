package com.example.rbac.admin.roles.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.Set;

public class AssignPermissionsRequest {
    @NotEmpty
    private Set<Long> permissionIds;

    public Set<Long> getPermissionIds() {
        return permissionIds;
    }

    public void setPermissionIds(Set<Long> permissionIds) {
        this.permissionIds = permissionIds;
    }
}
