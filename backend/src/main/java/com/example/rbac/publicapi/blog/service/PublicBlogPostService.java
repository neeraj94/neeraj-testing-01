package com.example.rbac.publicapi.blog.service;

import com.example.rbac.common.blog.model.BlogPost;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.publicapi.blog.dto.PublicBlogPostDto;
import com.example.rbac.publicapi.blog.mapper.PublicBlogMapper;
import com.example.rbac.publicapi.blog.repository.PublicBlogPostRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PublicBlogPostService {

    private final PublicBlogPostRepository publicBlogPostRepository;
    private final PublicBlogMapper publicBlogMapper;

    public PublicBlogPostService(PublicBlogPostRepository publicBlogPostRepository,
                                 PublicBlogMapper publicBlogMapper) {
        this.publicBlogPostRepository = publicBlogPostRepository;
        this.publicBlogMapper = publicBlogMapper;
    }

    @Transactional(readOnly = true)
    public PageResponse<PublicBlogPostDto> listPublished(int page, int size, String categorySlug, String search) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "publishedAt"));
        Specification<BlogPost> specification = Specification
                .where((root, query, builder) -> builder.isTrue(root.get("published")))
                .and((root, query, builder) -> builder.isNotNull(root.get("publishedAt")));
        if (categorySlug != null && !categorySlug.isBlank()) {
            String normalized = categorySlug.trim().toLowerCase();
            specification = specification.and((root, query, builder) ->
                    builder.equal(builder.lower(root.get("category").get("slug")), normalized));
        }
        if (search != null && !search.isBlank()) {
            String like = "%" + search.trim().toLowerCase() + "%";
            specification = specification.and((root, query, builder) -> builder.or(
                    builder.like(builder.lower(root.get("title")), like),
                    builder.like(builder.lower(root.get("slug")), like),
                    builder.like(builder.lower(root.get("metaTitle")), like)
            ));
        }
        Page<BlogPost> result = publicBlogPostRepository.findAll(specification, pageable);
        return PageResponse.from(result.map(publicBlogMapper::toPublicDto));
    }

    @Transactional(readOnly = true)
    public PublicBlogPostDto getPublishedPost(String slug) {
        if (slug == null || slug.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Post slug is required");
        }
        BlogPost post = publicBlogPostRepository
                .findBySlugIgnoreCaseAndPublishedTrueAndPublishedAtIsNotNull(slug.trim())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Post not found"));
        return publicBlogMapper.toPublicDto(post);
    }
}
