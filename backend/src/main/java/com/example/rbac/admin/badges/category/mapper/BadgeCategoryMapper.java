package com.example.rbac.admin.badges.category.mapper;

import com.example.rbac.admin.badges.category.dto.BadgeCategoryDto;
import com.example.rbac.admin.badges.category.dto.BadgeCategoryOptionDto;
import com.example.rbac.admin.badges.category.model.BadgeCategory;
import org.springframework.stereotype.Component;

@Component
public class BadgeCategoryMapper {

    public BadgeCategoryDto toDto(BadgeCategory category) {
        if (category == null) {
            return null;
        }
        BadgeCategoryDto dto = new BadgeCategoryDto();
        dto.setId(category.getId());
        dto.setTitle(category.getTitle());
        dto.setDescription(category.getDescription());
        dto.setIconUrl(category.getIconUrl());
        dto.setCreatedAt(category.getCreatedAt());
        dto.setUpdatedAt(category.getUpdatedAt());
        return dto;
    }

    public BadgeCategoryOptionDto toOption(BadgeCategory category) {
        if (category == null) {
            return null;
        }
        return new BadgeCategoryOptionDto(category.getId(), category.getTitle());
    }
}
