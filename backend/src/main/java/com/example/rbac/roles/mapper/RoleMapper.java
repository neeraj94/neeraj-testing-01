package com.example.rbac.roles.mapper;

import com.example.rbac.roles.dto.RoleDto;
import com.example.rbac.roles.model.Role;
import com.example.rbac.permissions.model.Permission;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.Set;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface RoleMapper {

    @Mapping(target = "permissions", expression = "java(mapPermissionKeys(role.getPermissions()))")
    RoleDto toDto(Role role);

    default Set<String> mapPermissionKeys(Set<Permission> permissions) {
        if (permissions == null) {
            return Set.of();
        }
        return permissions.stream()
                .map(Permission::getKey)
                .collect(Collectors.toCollection(java.util.LinkedHashSet::new));
    }
}
