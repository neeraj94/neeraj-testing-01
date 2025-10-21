package com.example.rbac.admin.roles.mapper;

import com.example.rbac.admin.roles.dto.RoleDto;
import com.example.rbac.admin.roles.model.Role;
import com.example.rbac.admin.permissions.model.Permission;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class RoleMapper {

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
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
