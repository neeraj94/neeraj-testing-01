package com.example.rbac.admin.blog.service;

import com.example.rbac.admin.activity.service.ActivityRecorder;
import com.example.rbac.admin.blog.dto.BlogPostDto;
import com.example.rbac.admin.blog.dto.BlogPostRequest;
import com.example.rbac.admin.blog.dto.PublicBlogPostDto;
import com.example.rbac.admin.blog.mapper.BlogPostMapper;
import com.example.rbac.common.blog.model.BlogCategory;
import com.example.rbac.common.blog.model.BlogPost;
import com.example.rbac.admin.blog.repository.BlogCategoryRepository;
import com.example.rbac.admin.blog.repository.BlogPostRepository;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.common.pagination.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class BlogPostService {

    private final BlogPostRepository blogPostRepository;
    private final BlogCategoryRepository blogCategoryRepository;
    private final BlogPostMapper blogPostMapper;
    private final ActivityRecorder activityRecorder;
    private final BlogMediaStorageService blogMediaStorageService;

    public BlogPostService(BlogPostRepository blogPostRepository,
                           BlogCategoryRepository blogCategoryRepository,
                           BlogPostMapper blogPostMapper,
                           ActivityRecorder activityRecorder,
                           BlogMediaStorageService blogMediaStorageService) {
        this.blogPostRepository = blogPostRepository;
        this.blogCategoryRepository = blogCategoryRepository;
        this.blogPostMapper = blogPostMapper;
        this.activityRecorder = activityRecorder;
        this.blogMediaStorageService = blogMediaStorageService;
    }

    @Transactional(readOnly = true)
    public PageResponse<BlogPostDto> list(int page,
                                          int size,
                                          String sort,
                                          String direction,
                                          Long categoryId,
                                          Boolean published,
                                          String search) {
        Sort.Direction sortDirection = "asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
        String sortProperty = switch (Optional.ofNullable(sort).orElse("createdAt")) {
            case "title" -> "title";
            case "publishedAt" -> "publishedAt";
            default -> "createdAt";
        };
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(sortDirection, sortProperty));
        Specification<BlogPost> specification = Specification.where(null);
        if (categoryId != null) {
            specification = specification.and((root, query, builder) -> builder.equal(root.get("category").get("id"), categoryId));
        }
        if (published != null) {
            specification = specification.and((root, query, builder) -> builder.equal(root.get("published"), published));
        }
        if (search != null && !search.isBlank()) {
            String like = "%" + search.trim().toLowerCase() + "%";
            specification = specification.and((root, query, builder) -> builder.or(
                    builder.like(builder.lower(root.get("title")), like),
                    builder.like(builder.lower(root.get("slug")), like),
                    builder.like(builder.lower(root.get("metaTitle")), like)
            ));
        }
        Page<BlogPost> result = blogPostRepository.findAll(specification, pageable);
        return PageResponse.from(result.map(blogPostMapper::toDto));
    }

    @Transactional(readOnly = true)
    public PageResponse<PublicBlogPostDto> listPublished(int page, int size, String categorySlug, String search) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "publishedAt"));
        Specification<BlogPost> specification = Specification.where((root, query, builder) -> builder.isTrue(root.get("published")));
        specification = specification.and((root, query, builder) -> builder.isNotNull(root.get("publishedAt")));
        if (categorySlug != null && !categorySlug.isBlank()) {
            specification = specification.and((root, query, builder) -> builder.equal(builder.lower(root.get("category").get("slug")), categorySlug.toLowerCase()));
        }
        if (search != null && !search.isBlank()) {
            String like = "%" + search.trim().toLowerCase() + "%";
            specification = specification.and((root, query, builder) -> builder.or(
                    builder.like(builder.lower(root.get("title")), like),
                    builder.like(builder.lower(root.get("slug")), like),
                    builder.like(builder.lower(root.get("metaTitle")), like)
            ));
        }
        Page<BlogPost> result = blogPostRepository.findAll(specification, pageable);
        return PageResponse.from(result.map(blogPostMapper::toPublicDto));
    }

    @Transactional(readOnly = true)
    public BlogPostDto get(Long id) {
        BlogPost post = blogPostRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Post not found"));
        return blogPostMapper.toDto(post);
    }

    @Transactional
    public PublicBlogPostDto getPublishedPost(String slug) {
        if (slug == null || slug.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Post slug is required");
        }
        BlogPost post = blogPostRepository.findBySlugIgnoreCase(slug.trim())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Post not found"));
        if (!post.isPublished()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Post not found");
        }
        if (post.getPublishedAt() == null) {
            Instant fallback = Optional.ofNullable(post.getUpdatedAt()).orElse(post.getCreatedAt());
            post.setPublishedAt(fallback != null ? fallback : Instant.now());
        }
        return blogPostMapper.toPublicDto(post);
    }

    @Transactional
    public BlogPostDto create(BlogPostRequest request) {
        BlogCategory category = blogCategoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Category not found"));
        BlogPost post = new BlogPost();
        post.setCategory(category);
        applyRequest(post, request);
        ensureUniqueSlug(post.getSlug(), null);
        BlogPost saved = blogPostRepository.save(post);
        activityRecorder.record("Blog", "CREATE_POST", "Created post " + saved.getTitle(), "SUCCESS", buildContext(saved));
        return blogPostMapper.toDto(saved);
    }

    @Transactional
    public BlogPostDto update(Long id, BlogPostRequest request) {
        BlogPost post = blogPostRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Post not found"));
        BlogCategory category = blogCategoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Category not found"));
        String previousBanner = post.getBannerImage();
        String previousMetaImage = post.getMetaImage();
        String previousSlug = post.getSlug();
        post.setCategory(category);
        applyRequest(post, request);
        ensureUniqueSlug(post.getSlug(), post.getId());
        BlogPost saved = blogPostRepository.save(post);
        cleanupMedia(previousBanner, saved.getBannerImage());
        cleanupMedia(previousMetaImage, saved.getMetaImage());
        activityRecorder.record("Blog", "UPDATE_POST", "Updated post " + saved.getTitle(), "SUCCESS", buildContext(saved));
        if (!previousSlug.equalsIgnoreCase(saved.getSlug())) {
            activityRecorder.record("Blog", "POST_SLUG_CHANGED", "Post slug changed", "SUCCESS", Map.of(
                    "previousSlug", previousSlug,
                    "newSlug", saved.getSlug(),
                    "postId", saved.getId()
            ));
        }
        return blogPostMapper.toDto(saved);
    }

    @Transactional
    public void delete(Long id) {
        BlogPost post = blogPostRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Post not found"));
        blogPostRepository.delete(post);
        activityRecorder.record("Blog", "DELETE_POST", "Deleted post " + post.getTitle(), "SUCCESS", buildContext(post));
        cleanupMedia(post.getBannerImage(), null);
        cleanupMedia(post.getMetaImage(), null);
    }

    private void cleanupMedia(String previous, String current) {
        if (previous == null || previous.isBlank()) {
            return;
        }
        if (current != null && current.equals(previous)) {
            return;
        }
        blogMediaStorageService.delete(previous);
    }

    private void applyRequest(BlogPost post, BlogPostRequest request) {
        boolean wasPublished = post.isPublished();
        post.setTitle(request.getTitle());
        post.setSlug(normalizeSlug(request.getSlug(), request.getTitle()));
        post.setDescription(request.getDescription());
        post.setBannerImage(trimToNull(request.getBannerImage()));
        post.setMetaTitle(trimToNull(request.getMetaTitle()));
        post.setMetaDescription(trimToNull(request.getMetaDescription()));
        post.setMetaKeywords(trimToNull(request.getMetaKeywords()));
        post.setMetaImage(trimToNull(request.getMetaImage()));
        post.setPublished(request.isPublished());
        if (!request.isPublished()) {
            post.setPublishedAt(null);
        } else if (!wasPublished || post.getPublishedAt() == null) {
            post.setPublishedAt(Instant.now());
        }
    }

    private void ensureUniqueSlug(String slug, Long postId) {
        if (slug == null || slug.isBlank()) {
            return;
        }
        boolean exists = postId == null
                ? blogPostRepository.existsBySlugIgnoreCase(slug)
                : blogPostRepository.existsBySlugIgnoreCaseAndIdNot(slug, postId);
        if (exists) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Post slug already exists");
        }
    }

    private String normalizeSlug(String slug, String fallback) {
        String value = Optional.ofNullable(slug).filter(s -> !s.isBlank()).orElse(fallback);
        if (value == null || value.isBlank()) {
            return null;
        }
        String sanitized = value.trim().toLowerCase();
        sanitized = sanitized.replaceAll("[^a-z0-9\\s-_]", "");
        sanitized = sanitized.replaceAll("[\\s-_]+", "-");
        if (sanitized.isBlank()) {
            sanitized = "post-" + Long.toHexString(System.nanoTime());
        }
        return sanitized.length() > 210 ? sanitized.substring(0, 210) : sanitized;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Map<String, Object> buildContext(BlogPost post) {
        Map<String, Object> context = new HashMap<>();
        context.put("postId", post.getId());
        context.put("postSlug", post.getSlug());
        context.put("categoryId", post.getCategory().getId());
        context.put("published", post.isPublished());
        return context;
    }
}
