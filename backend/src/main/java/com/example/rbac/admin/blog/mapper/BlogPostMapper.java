package com.example.rbac.admin.blog.mapper;

import com.example.rbac.admin.blog.dto.BlogPostDto;
import com.example.rbac.admin.blog.dto.PublicBlogPostDto;
import com.example.rbac.admin.blog.model.BlogPost;
import org.springframework.stereotype.Component;

@Component
public class BlogPostMapper {

    public BlogPostDto toDto(BlogPost post) {
        if (post == null) {
            return null;
        }
        BlogPostDto dto = new BlogPostDto();
        dto.setId(post.getId());
        if (post.getCategory() != null) {
            dto.setCategoryId(post.getCategory().getId());
            dto.setCategoryName(post.getCategory().getName());
        }
        dto.setTitle(post.getTitle());
        dto.setSlug(post.getSlug());
        dto.setDescription(post.getDescription());
        dto.setBannerImage(post.getBannerImage());
        dto.setMetaTitle(post.getMetaTitle());
        dto.setMetaDescription(post.getMetaDescription());
        dto.setMetaKeywords(post.getMetaKeywords());
        dto.setMetaImage(post.getMetaImage());
        dto.setPublished(post.isPublished());
        dto.setPublishedAt(post.getPublishedAt());
        dto.setCreatedAt(post.getCreatedAt());
        dto.setUpdatedAt(post.getUpdatedAt());
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
        dto.setCategory(post.getCategory() != null ? post.getCategory().getName() : null);
        dto.setPublishedAt(post.getPublishedAt());
        return dto;
    }
}
