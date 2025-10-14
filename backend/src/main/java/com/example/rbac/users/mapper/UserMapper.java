package com.example.rbac.users.mapper;

import com.example.rbac.permissions.model.Permission;
import com.example.rbac.roles.model.Role;
import com.example.rbac.users.dto.UserDto;
import com.example.rbac.users.model.User;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Component
public class UserMapper {

    private static final String CUSTOMER_PREFIX = "CUSTOMER_";

    public UserDto toDto(User user) {
        if (user == null) {
            return null;
        }
        UserDto dto = new UserDto();
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setFullName(user.getFullName());
        dto.setFirstName(user.getFirstName());
        dto.setLastName(user.getLastName());
        dto.setPhoneNumber(user.getPhoneNumber());
        dto.setWhatsappNumber(user.getWhatsappNumber());
        dto.setFacebookUrl(user.getFacebookUrl());
        dto.setLinkedinUrl(user.getLinkedinUrl());
        dto.setSkypeId(user.getSkypeId());
        dto.setEmailSignature(user.getEmailSignature());
        dto.setProfileImageUrl(user.getProfileImageUrl());
        dto.setEmailVerifiedAt(user.getEmailVerifiedAt());
        dto.setLoginAttempts(user.getLoginAttempts());
        dto.setLockedAt(user.getLockedAt());
        dto.setActive(user.isActive());
        dto.setRoles(extractRoleKeys(user));
        dto.setPermissions(extractAllPermissions(user));
        dto.setDirectPermissions(extractDirectPermissions(user));
        dto.setRevokedPermissions(extractRevokedPermissions(user));
        dto.setCreatedAt(user.getCreatedAt());
        dto.setUpdatedAt(user.getUpdatedAt());
        return dto;
    }

    private Set<String> extractRoleKeys(User user) {
        return safeStream(user.getRoles())
                .map(Role::getKey)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private Set<String> extractAllPermissions(User user) {
        Set<String> permissions = safeStream(user.getRoles())
                .flatMap(role -> safeStream(role.getPermissions()))
                .map(Permission::getKey)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        permissions.addAll(extractDirectPermissions(user));
        permissions.removeAll(extractRevokedPermissions(user));
        return filterCustomerPermissions(permissions);
    }

    private Set<String> extractDirectPermissions(User user) {
        return filterCustomerPermissions(safeStream(user.getDirectPermissions())
                .map(Permission::getKey)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new)));
    }

    private Set<String> extractRevokedPermissions(User user) {
        return filterCustomerPermissions(safeStream(user.getRevokedPermissions())
                .map(Permission::getKey)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new)));
    }

    private Set<String> filterCustomerPermissions(Set<String> permissions) {
        if (permissions == null || permissions.isEmpty()) {
            return Set.of();
        }
        return permissions.stream()
                .filter(key -> key != null && !key.toUpperCase().startsWith(CUSTOMER_PREFIX))
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private <T> Stream<T> safeStream(Collection<T> collection) {
        return collection == null ? Stream.empty() : collection.stream();
    }
}
