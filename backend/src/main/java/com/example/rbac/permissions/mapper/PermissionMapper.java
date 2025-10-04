package com.example.rbac.permissions.mapper;

import com.example.rbac.permissions.dto.PermissionDto;
import com.example.rbac.permissions.model.Permission;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PermissionMapper {
    PermissionDto toDto(Permission permission);
}
