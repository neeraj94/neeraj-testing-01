package com.example.rbac.publicapi.blog.repository;

import com.example.rbac.common.blog.model.BlogPost;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface PublicBlogPostRepository extends JpaRepository<BlogPost, Long>, JpaSpecificationExecutor<BlogPost> {

    @EntityGraph(attributePaths = "category")
    Optional<BlogPost> findBySlugIgnoreCaseAndPublishedTrueAndPublishedAtIsNotNull(String slug);
}
