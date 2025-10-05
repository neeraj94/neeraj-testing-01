package com.example.rbac.users.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Set;

public class UpdateUserRequest {
    @Email
    @NotBlank
    private String email;

    @NotBlank
    private String fullName;

    private boolean active = true;

    @Size(min = 8)
    private String password;

    private Set<Long> roleIds;

    private Set<String> permissionKeys;

    private Set<String> revokedPermissionKeys;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Set<Long> getRoleIds() {
        return roleIds;
    }

    public void setRoleIds(Set<Long> roleIds) {
        this.roleIds = roleIds;
    }

    public Set<String> getPermissionKeys() {
        return permissionKeys;
    }

    public void setPermissionKeys(Set<String> permissionKeys) {
        this.permissionKeys = permissionKeys;
    }

    public Set<String> getRevokedPermissionKeys() {
        return revokedPermissionKeys;
    }

    public void setRevokedPermissionKeys(Set<String> revokedPermissionKeys) {
        this.revokedPermissionKeys = revokedPermissionKeys;
    }
}
