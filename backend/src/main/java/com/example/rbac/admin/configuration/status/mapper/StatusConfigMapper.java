package com.example.rbac.admin.configuration.status.mapper;

import com.example.rbac.admin.configuration.status.dto.StatusConfigDto;
import com.example.rbac.admin.configuration.status.model.StatusConfig;
import org.springframework.stereotype.Component;

@Component
public class StatusConfigMapper {

    public StatusConfigDto toDto(StatusConfig statusConfig) {
        if (statusConfig == null) {
            return null;
        }
        StatusConfigDto dto = new StatusConfigDto();
        dto.setId(statusConfig.getId());
        dto.setName(statusConfig.getName());
        dto.setCategory(statusConfig.getCategory());
        dto.setColorCode(statusConfig.getColorCode());
        dto.setIcon(statusConfig.getIcon());
        dto.setDescription(statusConfig.getDescription());
        dto.setDefault(statusConfig.isDefault());
        dto.setActive(statusConfig.isActive());
        dto.setCreatedBy(statusConfig.getCreatedBy());
        dto.setCreatedAt(statusConfig.getCreatedAt());
        dto.setUpdatedAt(statusConfig.getUpdatedAt());
        return dto;
    }
}
