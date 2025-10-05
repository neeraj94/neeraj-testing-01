package com.example.rbac.users.mapper;

import com.example.rbac.users.dto.UserDto;
import com.example.rbac.users.model.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.Set;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(target = "roles", expression = "java(extractRoleKeys(user))")
    @Mapping(target = "permissions", expression = "java(extractAllPermissions(user))")
    @Mapping(target = "directPermissions", expression = "java(extractDirectPermissions(user))")
    @Mapping(target = "revokedPermissions", expression = "java(extractRevokedPermissions(user))")
    UserDto toDto(User user);

    default Set<String> extractRoleKeys(User user) {
        return user.getRoles().stream().map(role -> role.getKey()).collect(Collectors.toSet());
    }

    default Set<String> extractAllPermissions(User user) {
        Set<String> permissions = user.getRoles().stream()
                .flatMap(role -> role.getPermissions().stream())
                .map(permission -> permission.getKey())
                .collect(Collectors.toSet());
        permissions.addAll(extractDirectPermissions(user));
        permissions.removeAll(extractRevokedPermissions(user));
        return permissions;
    }

    default Set<String> extractDirectPermissions(User user) {
        return user.getDirectPermissions().stream()
                .map(permission -> permission.getKey())
                .collect(Collectors.toSet());
    }

    default Set<String> extractRevokedPermissions(User user) {
        return user.getRevokedPermissions().stream()
                .map(permission -> permission.getKey())
                .collect(Collectors.toSet());
    }
}
