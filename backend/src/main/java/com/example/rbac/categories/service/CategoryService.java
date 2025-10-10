package com.example.rbac.categories.service;

import com.example.rbac.activity.service.ActivityRecorder;
import com.example.rbac.categories.dto.CategoryDto;
import com.example.rbac.categories.dto.CategoryOptionDto;
import com.example.rbac.categories.dto.CategoryRequest;
import com.example.rbac.categories.mapper.CategoryMapper;
import com.example.rbac.categories.model.Category;
import com.example.rbac.categories.model.CategoryType;
import com.example.rbac.categories.repository.CategoryRepository;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.common.pagination.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final CategoryMapper categoryMapper;
    private final ActivityRecorder activityRecorder;
    private final CategoryAssetStorageService assetStorageService;

    public CategoryService(CategoryRepository categoryRepository,
                           CategoryMapper categoryMapper,
                           ActivityRecorder activityRecorder,
                           CategoryAssetStorageService assetStorageService) {
        this.categoryRepository = categoryRepository;
        this.categoryMapper = categoryMapper;
        this.activityRecorder = activityRecorder;
        this.assetStorageService = assetStorageService;
    }

    public PageResponse<CategoryDto> list(int page, int size, String search) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.ASC, "name"));
        Page<Category> result;
        if (StringUtils.hasText(search)) {
            String term = search.trim();
            result = categoryRepository.findByNameContainingIgnoreCaseOrSlugContainingIgnoreCase(term, term, pageable);
        } else {
            result = categoryRepository.findAll(pageable);
        }
        return PageResponse.from(result.map(this::mapToDto));
    }

    public CategoryDto get(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Category not found"));
        return mapToDto(category);
    }

    public List<CategoryOptionDto> options(Long excludeId) {
        List<Category> categories;
        if (excludeId != null) {
            categories = categoryRepository.findAllExcept(excludeId);
        } else {
            categories = categoryRepository.findAllByOrderByNameAsc();
        }
        List<CategoryOptionDto> options = new ArrayList<>(categories.size());
        for (Category category : categories) {
            options.add(categoryMapper.toOptionDto(category));
        }
        return options;
    }

    @Transactional
    public CategoryDto create(CategoryRequest request) {
        Category category = new Category();
        applyRequest(category, request);
        ensureUniqueSlug(category.getSlug(), null);
        Category saved = categoryRepository.save(category);
        activityRecorder.record("Catalog", "CATEGORY_CREATED", "Created category " + saved.getName(), "SUCCESS", buildContext(saved));
        return mapToDto(saved);
    }

    @Transactional
    public CategoryDto update(Long id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Category not found"));
        String previousSlug = category.getSlug();
        applyRequest(category, request);
        ensureUniqueSlug(category.getSlug(), category.getId());
        Category saved = categoryRepository.save(category);
        activityRecorder.record("Catalog", "CATEGORY_UPDATED", "Updated category " + saved.getName(), "SUCCESS", buildContext(saved));
        if (previousSlug != null && !previousSlug.equalsIgnoreCase(saved.getSlug())) {
            Map<String, Object> context = new HashMap<>();
            context.put("categoryId", saved.getId());
            context.put("previousSlug", previousSlug);
            context.put("newSlug", saved.getSlug());
            activityRecorder.record("Catalog", "CATEGORY_SLUG_CHANGED", "Category slug updated", "SUCCESS", context);
        }
        return mapToDto(saved);
    }

    @Transactional
    public void delete(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Category not found"));
        if (categoryRepository.existsByParentId(id)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cannot delete a category that has child categories");
        }
        categoryRepository.delete(category);
        activityRecorder.record("Catalog", "CATEGORY_DELETED", "Deleted category " + category.getName(), "SUCCESS", buildContext(category));
    }

    private void applyRequest(Category category, CategoryRequest request) {
        category.setName(request.getName().trim());
        category.setSlug(normalizeSlug(request.getSlug(), request.getName()));
        category.setType(Optional.ofNullable(request.getType()).orElse(CategoryType.PHYSICAL));
        Category parent = resolveParent(request.getParentId(), category.getId());
        category.setParent(parent);
        category.setOrderNumber(request.getOrderNumber());
        category.setBannerUrl(assetStorageService.resolvePublicUrl(trimToNull(request.getBannerUrl())));
        category.setIconUrl(assetStorageService.resolvePublicUrl(trimToNull(request.getIconUrl())));
        category.setCoverUrl(assetStorageService.resolvePublicUrl(trimToNull(request.getCoverUrl())));
        category.setMetaTitle(trimToNull(request.getMetaTitle()));
        category.setMetaDescription(trimToNull(request.getMetaDescription()));
        category.setMetaKeywords(trimToNull(request.getMetaKeywords()));
        category.setMetaCanonicalUrl(trimToNull(request.getMetaCanonicalUrl()));
        category.setMetaRobots(trimToNull(request.getMetaRobots()));
        category.setMetaOgTitle(trimToNull(request.getMetaOgTitle()));
        category.setMetaOgDescription(trimToNull(request.getMetaOgDescription()));
        category.setMetaOgImage(trimToNull(request.getMetaOgImage()));
    }

    private Category resolveParent(Long parentId, Long currentId) {
        if (parentId == null) {
            return null;
        }
        Category parent = categoryRepository.findById(parentId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Parent category not found"));
        if (currentId != null && parent.getId().equals(currentId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A category cannot be its own parent");
        }
        Category ancestor = parent.getParent();
        while (ancestor != null) {
            if (currentId != null && ancestor.getId().equals(currentId)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Circular category hierarchy detected");
            }
            ancestor = ancestor.getParent();
        }
        return parent;
    }

    private void ensureUniqueSlug(String slug, Long categoryId) {
        if (!StringUtils.hasText(slug)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Category slug is required");
        }
        boolean exists = categoryId == null
                ? categoryRepository.existsBySlugIgnoreCase(slug)
                : categoryRepository.existsBySlugIgnoreCaseAndIdNot(slug, categoryId);
        if (exists) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Category slug already exists");
        }
    }

    private String normalizeSlug(String slug, String fallback) {
        String candidate = Optional.ofNullable(slug)
                .filter(StringUtils::hasText)
                .map(String::trim)
                .orElseGet(() -> Optional.ofNullable(fallback).map(String::trim).orElse(null));
        if (!StringUtils.hasText(candidate)) {
            candidate = "category-" + Long.toHexString(System.nanoTime());
        }
        String sanitized = candidate.toLowerCase()
                .replaceAll("[^a-z0-9\\s-_]", "")
                .replaceAll("[\\s-_]+", "-");
        if (!StringUtils.hasText(sanitized)) {
            sanitized = "category-" + Long.toHexString(System.nanoTime());
        }
        return sanitized.length() > 160 ? sanitized.substring(0, 160) : sanitized;
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private Map<String, Object> buildContext(Category category) {
        Map<String, Object> context = new HashMap<>();
        context.put("categoryId", category.getId());
        context.put("categoryName", category.getName());
        context.put("categorySlug", category.getSlug());
        context.put("categoryType", category.getType() != null ? category.getType().name() : null);
        context.put("parentId", category.getParent() != null ? category.getParent().getId() : null);
        return context;
    }

    private CategoryDto mapToDto(Category category) {
        CategoryDto dto = categoryMapper.toDto(category);
        dto.setBannerUrl(assetStorageService.resolvePublicUrl(dto.getBannerUrl()));
        dto.setIconUrl(assetStorageService.resolvePublicUrl(dto.getIconUrl()));
        dto.setCoverUrl(assetStorageService.resolvePublicUrl(dto.getCoverUrl()));
        return dto;
    }
}
