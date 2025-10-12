package com.example.rbac.roles.mapper;

import com.example.rbac.roles.dto.RoleDto;
import com.example.rbac.roles.model.Role;
import com.example.rbac.permissions.model.Permission;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class RoleMapper {

    private static final String CUSTOMER_PREFIX = "CUSTOMER_";

    public RoleDto toDto(Role role) {
        if (role == null) {
            return null;
        }
        RoleDto dto = new RoleDto();
        dto.setId(role.getId());
        dto.setKey(role.getKey());
        dto.setName(role.getName());
        dto.setPermissions(mapPermissionKeys(role.getPermissions()));
        return dto;
    }

    private Set<String> mapPermissionKeys(Set<Permission> permissions) {
        if (permissions == null || permissions.isEmpty()) {
            return Set.of();
        }
        return permissions.stream()
                .map(Permission::getKey)
                .filter(key -> key != null && !key.toUpperCase().startsWith(CUSTOMER_PREFIX))
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
