package com.example.rbac.permissions.mapper;

import com.example.rbac.permissions.dto.PermissionDto;
import com.example.rbac.permissions.model.Permission;
import org.springframework.stereotype.Component;

@Component
public class PermissionMapper {

    public PermissionDto toDto(Permission permission) {
        if (permission == null) {
            return null;
        }
        PermissionDto dto = new PermissionDto();
        dto.setId(permission.getId());
        dto.setKey(permission.getKey());
        dto.setName(permission.getName());
        return dto;
    }
}
