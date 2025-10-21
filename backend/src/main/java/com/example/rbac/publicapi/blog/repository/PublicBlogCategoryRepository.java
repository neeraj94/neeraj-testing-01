package com.example.rbac.publicapi.blog.repository;

import com.example.rbac.common.blog.model.BlogCategory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PublicBlogCategoryRepository extends JpaRepository<BlogCategory, Long> {
}
