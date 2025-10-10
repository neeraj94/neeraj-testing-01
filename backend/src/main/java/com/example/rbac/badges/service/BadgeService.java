package com.example.rbac.badges.service;

import com.example.rbac.activity.service.ActivityRecorder;
import com.example.rbac.badges.category.mapper.BadgeCategoryMapper;
import com.example.rbac.badges.category.model.BadgeCategory;
import com.example.rbac.badges.category.repository.BadgeCategoryRepository;
import com.example.rbac.badges.dto.BadgeDto;
import com.example.rbac.badges.dto.BadgeRequest;
import com.example.rbac.badges.mapper.BadgeMapper;
import com.example.rbac.badges.model.Badge;
import com.example.rbac.badges.repository.BadgeRepository;
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

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class BadgeService {

    private final BadgeRepository badgeRepository;
    private final BadgeCategoryRepository badgeCategoryRepository;
    private final BadgeMapper badgeMapper;
    private final BadgeCategoryMapper badgeCategoryMapper;
    private final ActivityRecorder activityRecorder;
    private final BadgeIconStorageService iconStorageService;

    public BadgeService(BadgeRepository badgeRepository,
                        BadgeCategoryRepository badgeCategoryRepository,
                        BadgeMapper badgeMapper,
                        BadgeCategoryMapper badgeCategoryMapper,
                        ActivityRecorder activityRecorder,
                        BadgeIconStorageService iconStorageService) {
        this.badgeRepository = badgeRepository;
        this.badgeCategoryRepository = badgeCategoryRepository;
        this.badgeMapper = badgeMapper;
        this.badgeCategoryMapper = badgeCategoryMapper;
        this.activityRecorder = activityRecorder;
        this.iconStorageService = iconStorageService;
    }

    @Transactional(readOnly = true)
    public PageResponse<BadgeDto> list(int page, int size, String search) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.ASC, "name"));
        Page<Badge> badges;
        if (StringUtils.hasText(search)) {
            String term = search.trim();
            badges = badgeRepository.findByNameContainingIgnoreCase(term, pageable);
        } else {
            badges = badgeRepository.findAll(pageable);
        }
        return PageResponse.from(badges.map(this::mapToDto));
    }

    @Transactional(readOnly = true)
    public BadgeDto get(Long id) {
        Badge badge = badgeRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Badge not found"));
        return mapToDto(badge);
    }

    @Transactional
    public BadgeDto create(BadgeRequest request) {
        validateNameUniqueness(request.getName(), null);
        Badge badge = new Badge();
        applyRequest(badge, request);
        Badge saved = badgeRepository.save(badge);
        handleDefault(saved);
        activityRecorder.record("Catalog", "BADGE_CREATED", "Created badge " + saved.getName(), "SUCCESS", buildContext(saved));
        return mapToDto(saved);
    }

    @Transactional
    public BadgeDto update(Long id, BadgeRequest request) {
        Badge badge = badgeRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Badge not found"));
        validateNameUniqueness(request.getName(), id);
        applyRequest(badge, request);
        Badge saved = badgeRepository.save(badge);
        handleDefault(saved);
        activityRecorder.record("Catalog", "BADGE_UPDATED", "Updated badge " + saved.getName(), "SUCCESS", buildContext(saved));
        return mapToDto(saved);
    }

    @Transactional
    public void delete(Long id) {
        Badge badge = badgeRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Badge not found"));
        badgeRepository.delete(badge);
        activityRecorder.record("Catalog", "BADGE_DELETED", "Deleted badge " + badge.getName(), "SUCCESS", buildContext(badge));
    }

    private void validateNameUniqueness(String name, Long badgeId) {
        if (!StringUtils.hasText(name)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Badge name is required");
        }
        String trimmed = name.trim();
        boolean exists = badgeId == null
                ? badgeRepository.existsByNameIgnoreCase(trimmed)
                : badgeRepository.existsByNameIgnoreCaseAndIdNot(trimmed, badgeId);
        if (exists) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A badge with this name already exists");
        }
    }

    private void applyRequest(Badge badge, BadgeRequest request) {
        badge.setName(request.getName().trim());
        badge.setIconUrl(iconStorageService.resolvePublicUrl(trimToNull(request.getIconUrl())));
        badge.setShortDescription(trimToNull(request.getShortDescription()));
        badge.setLongDescription(trimToNull(request.getLongDescription()));
        badge.setDefaultBadge(request.isDefaultBadge());
        badge.setBadgeCategory(resolveCategory(request.getBadgeCategoryId()));
    }

    private void handleDefault(Badge badge) {
        if (badge.isDefaultBadge()) {
            badgeRepository.clearDefaultExcept(badge.getId());
        }
    }

    private BadgeCategory resolveCategory(Long categoryId) {
        if (categoryId == null) {
            return null;
        }
        Optional<BadgeCategory> category = badgeCategoryRepository.findById(categoryId);
        return category.orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Selected badge category not found"));
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private Map<String, Object> buildContext(Badge badge) {
        Map<String, Object> context = new HashMap<>();
        context.put("badgeId", badge.getId());
        context.put("badgeName", badge.getName());
        context.put("default", badge.isDefaultBadge());
        if (badge.getBadgeCategory() != null) {
            context.put("badgeCategoryId", badge.getBadgeCategory().getId());
            context.put("badgeCategoryTitle", badge.getBadgeCategory().getTitle());
        }
        return context;
    }

    private BadgeDto mapToDto(Badge badge) {
        BadgeDto dto = badgeMapper.toDto(badge);
        dto.setIconUrl(iconStorageService.resolvePublicUrl(dto.getIconUrl()));
        dto.setBadgeCategory(badgeCategoryMapper.toOption(badge.getBadgeCategory()));
        return dto;
    }
}
