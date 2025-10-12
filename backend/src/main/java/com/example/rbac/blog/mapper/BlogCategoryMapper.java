package com.example.rbac.blog.mapper;

import com.example.rbac.blog.dto.BlogCategoryDto;
import com.example.rbac.blog.model.BlogCategory;
import org.springframework.stereotype.Component;

@Component
public class BlogCategoryMapper {

    public BlogCategoryDto toDto(BlogCategory category) {
        if (category == null) {
            return null;
        }
        BlogCategoryDto dto = new BlogCategoryDto();
        dto.setId(category.getId());
        dto.setName(category.getName());
        dto.setSlug(category.getSlug());
        dto.setDescription(category.getDescription());
        dto.setCreatedAt(category.getCreatedAt());
        dto.setUpdatedAt(category.getUpdatedAt());
        return dto;
    }
}
