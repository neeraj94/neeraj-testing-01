package com.example.rbac.auth.dto;

import com.example.rbac.settings.dto.SettingsThemeDto;
import com.example.rbac.users.dto.UserDto;

import java.util.Set;

public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private UserDto user;
    private Set<String> roles;
    private Set<String> permissions;
    private Set<String> directPermissions;
    private Set<String> revokedPermissions;
    private SettingsThemeDto theme;

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getRefreshToken() {
        return refreshToken;
    }

    public void setRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }

    public UserDto getUser() {
        return user;
    }

    public void setUser(UserDto user) {
        this.user = user;
    }

    public Set<String> getRoles() {
        return roles;
    }

    public void setRoles(Set<String> roles) {
        this.roles = roles;
    }

    public Set<String> getPermissions() {
        return permissions;
    }

    public void setPermissions(Set<String> permissions) {
        this.permissions = permissions;
    }

    public Set<String> getDirectPermissions() {
        return directPermissions;
    }

    public void setDirectPermissions(Set<String> directPermissions) {
        this.directPermissions = directPermissions;
    }

    public Set<String> getRevokedPermissions() {
        return revokedPermissions;
    }

    public void setRevokedPermissions(Set<String> revokedPermissions) {
        this.revokedPermissions = revokedPermissions;
    }

    public SettingsThemeDto getTheme() {
        return theme;
    }

    public void setTheme(SettingsThemeDto theme) {
        this.theme = theme;
    }
}
