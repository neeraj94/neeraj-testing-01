package com.example.rbac.blog.mapper;

import com.example.rbac.blog.dto.BlogCategoryDto;
import com.example.rbac.blog.model.BlogCategory;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface BlogCategoryMapper {

    BlogCategoryDto toDto(BlogCategory category);
}
