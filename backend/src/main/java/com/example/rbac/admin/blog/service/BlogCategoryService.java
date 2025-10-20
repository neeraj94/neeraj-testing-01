package com.example.rbac.admin.blog.service;

import com.example.rbac.admin.activity.service.ActivityRecorder;
import com.example.rbac.admin.blog.dto.BlogCategoryDto;
import com.example.rbac.admin.blog.dto.BlogCategoryRequest;
import com.example.rbac.admin.blog.mapper.BlogCategoryMapper;
import com.example.rbac.admin.blog.model.BlogCategory;
import com.example.rbac.admin.blog.repository.BlogCategoryRepository;
import com.example.rbac.admin.blog.repository.BlogPostRepository;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.common.pagination.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class BlogCategoryService {

    private final BlogCategoryRepository blogCategoryRepository;
    private final BlogPostRepository blogPostRepository;
    private final BlogCategoryMapper blogCategoryMapper;
    private final ActivityRecorder activityRecorder;

    public BlogCategoryService(BlogCategoryRepository blogCategoryRepository,
                               BlogPostRepository blogPostRepository,
                               BlogCategoryMapper blogCategoryMapper,
                               ActivityRecorder activityRecorder) {
        this.blogCategoryRepository = blogCategoryRepository;
        this.blogPostRepository = blogPostRepository;
        this.blogCategoryMapper = blogCategoryMapper;
        this.activityRecorder = activityRecorder;
    }

    public PageResponse<BlogCategoryDto> list(int page, int size, String search) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.ASC, "name"));
        Page<BlogCategory> result;
        if (search != null && !search.isBlank()) {
            result = blogCategoryRepository.findByNameContainingIgnoreCase(search.trim(), pageable);
        } else {
            result = blogCategoryRepository.findAll(pageable);
        }
        return PageResponse.from(result.map(blogCategoryMapper::toDto));
    }

    public List<BlogCategoryDto> findAll() {
        return blogCategoryRepository.findAll(Sort.by(Sort.Direction.ASC, "name"))
                .stream()
                .map(blogCategoryMapper::toDto)
                .toList();
    }

    public BlogCategoryDto get(Long id) {
        BlogCategory category = blogCategoryRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Category not found"));
        return blogCategoryMapper.toDto(category);
    }

    @Transactional
    public BlogCategoryDto create(BlogCategoryRequest request) {
        BlogCategory category = new BlogCategory();
        applyRequest(category, request);
        ensureUniqueSlug(category.getSlug(), null);
        BlogCategory saved = blogCategoryRepository.save(category);
        activityRecorder.record("Blog", "CREATE_CATEGORY", "Created category " + saved.getName(), "SUCCESS", buildContext(saved));
        return blogCategoryMapper.toDto(saved);
    }

    @Transactional
    public BlogCategoryDto update(Long id, BlogCategoryRequest request) {
        BlogCategory category = blogCategoryRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Category not found"));
        String previousSlug = category.getSlug();
        applyRequest(category, request);
        ensureUniqueSlug(category.getSlug(), category.getId());
        BlogCategory saved = blogCategoryRepository.save(category);
        activityRecorder.record("Blog", "UPDATE_CATEGORY", "Updated category " + saved.getName(), "SUCCESS", buildContext(saved));
        if (!previousSlug.equalsIgnoreCase(saved.getSlug())) {
            activityRecorder.record("Blog", "CATEGORY_SLUG_CHANGED", "Category slug changed", "SUCCESS", Map.of(
                    "previousSlug", previousSlug,
                    "newSlug", saved.getSlug(),
                    "categoryId", saved.getId()
            ));
        }
        return blogCategoryMapper.toDto(saved);
    }

    @Transactional
    public void delete(Long id) {
        BlogCategory category = blogCategoryRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Category not found"));
        long postCount = blogPostRepository.countByCategoryId(id);
        if (postCount > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cannot delete category with existing posts");
        }
        blogCategoryRepository.delete(category);
        activityRecorder.record("Blog", "DELETE_CATEGORY", "Deleted category " + category.getName(), "SUCCESS", buildContext(category));
    }

    private void applyRequest(BlogCategory category, BlogCategoryRequest request) {
        category.setName(request.getName());
        category.setSlug(normalizeSlug(request.getSlug(), request.getName()));
        category.setDescription(request.getDescription());
    }

    private void ensureUniqueSlug(String slug, Long categoryId) {
        if (slug == null || slug.isBlank()) {
            return;
        }
        boolean exists = categoryId == null
                ? blogCategoryRepository.existsBySlugIgnoreCase(slug)
                : blogCategoryRepository.existsBySlugIgnoreCaseAndIdNot(slug, categoryId);
        if (exists) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Category slug already exists");
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
            sanitized = "category-" + Long.toHexString(System.nanoTime());
        }
        return sanitized.length() > 160 ? sanitized.substring(0, 160) : sanitized;
    }

    private Map<String, Object> buildContext(BlogCategory category) {
        Map<String, Object> context = new HashMap<>();
        context.put("categoryId", category.getId());
        context.put("categorySlug", category.getSlug());
        context.put("categoryName", category.getName());
        return context;
    }
}
