package com.example.rbac.admin.users.model;

import com.example.rbac.common.security.DefaultUserPermissions;
import com.example.rbac.admin.roles.model.Role;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

public class UserPrincipal implements UserDetails {

    private final User user;

    public UserPrincipal(User user) {
        this.user = user;
    }

    public User getUser() {
        return user;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        Set<String> authorities = user.getRoles().stream()
                .flatMap(role -> role.getPermissions().stream())
                .map(permission -> permission.getKey())
                .collect(Collectors.toSet());

        authorities.addAll(user.getDirectPermissions().stream()
                .map(permission -> permission.getKey())
                .collect(Collectors.toSet()));

        Set<String> revoked = user.getRevokedPermissions().stream()
                .map(permission -> permission.getKey())
                .collect(Collectors.toSet());
        authorities.removeAll(revoked);

        if (hasCustomerRole()) {
            authorities.addAll(DefaultUserPermissions.getCustomerPermissions());
        }

        user.getRoles().stream()
                .map(Role::getKey)
                .filter(key -> key != null && !key.isBlank())
                .map(key -> "ROLE_" + key.trim().toUpperCase())
                .forEach(authorities::add);

        return authorities.stream()
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toSet());
    }

    @Override
    public String getPassword() {
        return user.getPasswordHash();
    }

    @Override
    public String getUsername() {
        return user.getEmail();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return user.isActive() && user.getLockedAt() == null;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return user.isActive();
    }

    public Set<String> getRoleKeys() {
        return user.getRoles().stream().map(Role::getKey).collect(Collectors.toSet());
    }

    private boolean hasCustomerRole() {
        return user.getRoles().stream()
                .anyMatch(role -> role.getKey() != null && role.getKey().equalsIgnoreCase("CUSTOMER"));
    }
}
