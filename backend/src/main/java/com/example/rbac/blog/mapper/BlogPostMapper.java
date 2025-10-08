package com.example.rbac.blog.mapper;

import com.example.rbac.blog.dto.BlogPostDto;
import com.example.rbac.blog.dto.PublicBlogPostDto;
import com.example.rbac.blog.model.BlogPost;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface BlogPostMapper {

    @Mapping(target = "categoryId", source = "category.id")
    @Mapping(target = "categoryName", source = "category.name")
    BlogPostDto toDto(BlogPost post);

    @Mapping(target = "category", source = "category.name")
    PublicBlogPostDto toPublicDto(BlogPost post);
}
