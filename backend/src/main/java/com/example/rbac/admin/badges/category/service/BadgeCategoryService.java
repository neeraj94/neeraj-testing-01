package com.example.rbac.admin.badges.category.service;

import com.example.rbac.admin.activity.service.ActivityRecorder;
import com.example.rbac.admin.badges.category.dto.BadgeCategoryDto;
import com.example.rbac.admin.badges.category.dto.BadgeCategoryOptionDto;
import com.example.rbac.admin.badges.category.dto.BadgeCategoryRequest;
import com.example.rbac.admin.badges.category.mapper.BadgeCategoryMapper;
import com.example.rbac.admin.badges.category.model.BadgeCategory;
import com.example.rbac.admin.badges.category.repository.BadgeCategoryRepository;
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

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@Service
public class BadgeCategoryService {

    private final BadgeCategoryRepository repository;
    private final BadgeCategoryMapper mapper;
    private final BadgeCategoryIconStorageService iconStorageService;
    private final ActivityRecorder activityRecorder;

    public BadgeCategoryService(BadgeCategoryRepository repository,
                                BadgeCategoryMapper mapper,
                                BadgeCategoryIconStorageService iconStorageService,
                                ActivityRecorder activityRecorder) {
        this.repository = repository;
        this.mapper = mapper;
        this.iconStorageService = iconStorageService;
        this.activityRecorder = activityRecorder;
    }

    @Transactional(readOnly = true)
    public PageResponse<BadgeCategoryDto> list(int page, int size, String search) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by("title").ascending());
        Page<BadgeCategory> categories;
        if (StringUtils.hasText(search)) {
            categories = repository.findByTitleContainingIgnoreCase(search.trim(), pageable);
        } else {
            categories = repository.findAll(pageable);
        }
        return PageResponse.from(categories.map(this::mapToDto));
    }

    @Transactional(readOnly = true)
    public BadgeCategoryDto get(Long id) {
        BadgeCategory category = repository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Badge category not found"));
        return mapToDto(category);
    }

    @Transactional
    public BadgeCategoryDto create(BadgeCategoryRequest request) {
        ensureUniqueTitle(request.getTitle(), null);
        BadgeCategory category = new BadgeCategory();
        applyRequest(category, request);
        BadgeCategory saved = repository.save(category);
        activityRecorder.record("Catalog", "BADGE_CATEGORY_CREATED", "Created badge category " + saved.getTitle(), "SUCCESS", buildContext(saved));
        return mapToDto(saved);
    }

    @Transactional
    public BadgeCategoryDto update(Long id, BadgeCategoryRequest request) {
        BadgeCategory category = repository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Badge category not found"));
        ensureUniqueTitle(request.getTitle(), id);
        applyRequest(category, request);
        BadgeCategory saved = repository.save(category);
        activityRecorder.record("Catalog", "BADGE_CATEGORY_UPDATED", "Updated badge category " + saved.getTitle(), "SUCCESS", buildContext(saved));
        return mapToDto(saved);
    }

    @Transactional
    public void delete(Long id) {
        BadgeCategory category = repository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Badge category not found"));
        repository.delete(category);
        activityRecorder.record("Catalog", "BADGE_CATEGORY_DELETED", "Deleted badge category " + category.getTitle(), "SUCCESS", buildContext(category));
    }

    @Transactional(readOnly = true)
    public List<BadgeCategoryOptionDto> options() {
        return repository.findAll(Sort.by("title").ascending()).stream()
                .map(mapper::toOption)
                .toList();
    }

    public String resolveIconUrl(String value) {
        return iconStorageService.resolvePublicUrl(value);
    }

    private void ensureUniqueTitle(String title, Long excludeId) {
        if (!StringUtils.hasText(title)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Badge category title is required");
        }
        String trimmed = title.trim();
        boolean exists = excludeId == null
                ? repository.existsByTitleIgnoreCase(trimmed)
                : repository.existsByTitleIgnoreCaseAndIdNot(trimmed, excludeId);
        if (exists) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A badge category with this title already exists");
        }
    }

    private void applyRequest(BadgeCategory category, BadgeCategoryRequest request) {
        category.setTitle(request.getTitle().trim());
        category.setDescription(trimToNull(request.getDescription()));
        category.setIconUrl(iconStorageService.resolvePublicUrl(trimToNull(request.getIconUrl())));
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private Map<String, Object> buildContext(BadgeCategory category) {
        Map<String, Object> context = new HashMap<>();
        context.put("badgeCategoryId", category.getId());
        context.put("title", category.getTitle());
        if (category.getIconUrl() != null) {
            context.put("iconUrl", category.getIconUrl());
        }
        return context;
    }

    private BadgeCategoryDto mapToDto(BadgeCategory category) {
        BadgeCategoryDto dto = mapper.toDto(category);
        dto.setIconUrl(iconStorageService.resolvePublicUrl(dto.getIconUrl()));
        return dto;
    }
}
