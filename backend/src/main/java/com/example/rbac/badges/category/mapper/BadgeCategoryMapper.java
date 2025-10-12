package com.example.rbac.badges.category.mapper;

import com.example.rbac.badges.category.dto.BadgeCategoryDto;
import com.example.rbac.badges.category.dto.BadgeCategoryOptionDto;
import com.example.rbac.badges.category.model.BadgeCategory;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface BadgeCategoryMapper {

    BadgeCategoryDto toDto(BadgeCategory category);

    default BadgeCategoryOptionDto toOption(BadgeCategory category) {
        if (category == null) {
            return null;
        }
        return new BadgeCategoryOptionDto(category.getId(), category.getTitle());
    }
}
