package com.example.rbac.roles.mapper;

import com.example.rbac.roles.dto.RoleDto;
import com.example.rbac.roles.model.Role;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface RoleMapper {

    @Mapping(target = "permissions", expression = "java(role.getPermissions().stream().map(p -> p.getKey()).collect(Collectors.toSet()))")
    RoleDto toDto(Role role);
}
