package com.example.rbac.publicapi.blog.mapper;

import com.example.rbac.common.blog.model.BlogCategory;
import com.example.rbac.common.blog.model.BlogPost;
import com.example.rbac.publicapi.blog.dto.BlogCategoryDto;
import com.example.rbac.publicapi.blog.dto.PublicBlogPostDto;
import org.springframework.stereotype.Component;

@Component
public class PublicBlogMapper {

    public BlogCategoryDto toCategoryDto(BlogCategory category) {
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

    public PublicBlogPostDto toPublicDto(BlogPost post) {
        if (post == null) {
            return null;
        }
        PublicBlogPostDto dto = new PublicBlogPostDto();
        dto.setTitle(post.getTitle());
        dto.setSlug(post.getSlug());
        dto.setDescription(post.getDescription());
        dto.setBannerImage(post.getBannerImage());
        dto.setMetaTitle(post.getMetaTitle());
        dto.setMetaDescription(post.getMetaDescription());
        dto.setMetaKeywords(post.getMetaKeywords());
        dto.setMetaImage(post.getMetaImage());
        dto.setPublishedAt(post.getPublishedAt());
        BlogCategory category = post.getCategory();
        dto.setCategory(category != null ? category.getName() : null);
        return dto;
    }
}
