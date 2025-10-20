package com.example.rbac.admin.categories.mapper;

import com.example.rbac.admin.categories.dto.CategoryDto;
import com.example.rbac.admin.categories.dto.CategoryOptionDto;
import com.example.rbac.admin.categories.model.Category;
import org.springframework.stereotype.Component;

@Component
public class CategoryMapper {

    public CategoryDto toDto(Category category) {
        CategoryDto dto = new CategoryDto();
        dto.setId(category.getId());
        dto.setName(category.getName());
        dto.setSlug(category.getSlug());
        dto.setType(category.getType() != null ? category.getType().name() : null);
        if (category.getParent() != null) {
            dto.setParentId(category.getParent().getId());
            dto.setParentName(category.getParent().getName());
        }
        dto.setOrderNumber(category.getOrderNumber());
        dto.setBannerUrl(category.getBannerUrl());
        dto.setIconUrl(category.getIconUrl());
        dto.setCoverUrl(category.getCoverUrl());
        dto.setMetaTitle(category.getMetaTitle());
        dto.setMetaDescription(category.getMetaDescription());
        dto.setMetaKeywords(category.getMetaKeywords());
        dto.setMetaCanonicalUrl(category.getMetaCanonicalUrl());
        dto.setMetaRobots(category.getMetaRobots());
        dto.setMetaOgTitle(category.getMetaOgTitle());
        dto.setMetaOgDescription(category.getMetaOgDescription());
        dto.setMetaOgImage(category.getMetaOgImage());
        dto.setCreatedAt(category.getCreatedAt());
        dto.setUpdatedAt(category.getUpdatedAt());
        return dto;
    }

    public CategoryOptionDto toOptionDto(Category category) {
        return new CategoryOptionDto(category.getId(), category.getName(),
                category.getType() != null ? category.getType().name() : null);
    }
}
