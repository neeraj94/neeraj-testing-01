package com.example.rbac.admin.configuration.status.service;

import com.example.rbac.admin.activity.service.ActivityRecorder;
import com.example.rbac.admin.configuration.status.dto.StatusConfigDto;
import com.example.rbac.admin.configuration.status.dto.StatusConfigRequest;
import com.example.rbac.admin.configuration.status.mapper.StatusConfigMapper;
import com.example.rbac.admin.configuration.status.model.StatusCategory;
import com.example.rbac.admin.configuration.status.model.StatusConfig;
import com.example.rbac.admin.configuration.status.repository.StatusConfigRepository;
import com.example.rbac.admin.users.model.User;
import com.example.rbac.admin.users.model.UserPrincipal;
import com.example.rbac.common.exception.ApiException;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
public class StatusConfigService {

    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "defaultStatus")
            .and(Sort.by(Sort.Direction.DESC, "createdAt"));

    private final StatusConfigRepository statusConfigRepository;
    private final StatusConfigMapper statusConfigMapper;
    private final ActivityRecorder activityRecorder;

    public StatusConfigService(StatusConfigRepository statusConfigRepository,
                               StatusConfigMapper statusConfigMapper,
                               ActivityRecorder activityRecorder) {
        this.statusConfigRepository = statusConfigRepository;
        this.statusConfigMapper = statusConfigMapper;
        this.activityRecorder = activityRecorder;
    }

    @Transactional(readOnly = true)
    public List<StatusConfigDto> list(StatusCategory category, String search) {
        String normalizedSearch = normalize(search);
        List<StatusConfig> statuses;
        if (category != null && StringUtils.hasText(normalizedSearch)) {
            statuses = statusConfigRepository.findByCategoryAndNameContainingIgnoreCase(category, normalizedSearch, DEFAULT_SORT);
        } else if (category != null) {
            statuses = statusConfigRepository.findByCategory(category, DEFAULT_SORT);
        } else if (StringUtils.hasText(normalizedSearch)) {
            statuses = statusConfigRepository.findByNameContainingIgnoreCase(normalizedSearch, DEFAULT_SORT);
        } else {
            statuses = statusConfigRepository.findAll(DEFAULT_SORT);
        }
        return statuses.stream().map(statusConfigMapper::toDto).toList();
    }

    @Transactional
    public StatusConfigDto create(StatusConfigRequest request) {
        StatusConfig statusConfig = new StatusConfig();
        applyRequest(statusConfig, request, true);
        resolveCurrentUserId().ifPresent(statusConfig::setCreatedBy);
        StatusConfig saved = statusConfigRepository.save(statusConfig);
        if (saved.isDefault()) {
            statusConfigRepository.clearDefaultForCategoryExcludingId(saved.getCategory(), saved.getId());
        }
        activityRecorder.record("Configuration", "STATUS_CREATED",
                "Created status " + saved.getName(), "SUCCESS", buildContext(saved));
        return statusConfigMapper.toDto(saved);
    }

    @Transactional
    public StatusConfigDto update(Long id, StatusConfigRequest request) {
        StatusConfig statusConfig = statusConfigRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Status not found"));
        StatusCategory previousCategory = statusConfig.getCategory();
        boolean previouslyDefault = statusConfig.isDefault();
        applyRequest(statusConfig, request, false);
        StatusConfig saved = statusConfigRepository.save(statusConfig);
        if (saved.isDefault()) {
            statusConfigRepository.clearDefaultForCategoryExcludingId(saved.getCategory(), saved.getId());
            if (previouslyDefault && previousCategory != saved.getCategory()) {
                statusConfigRepository.clearDefaultForCategory(previousCategory);
            }
        }
        activityRecorder.record("Configuration", "STATUS_UPDATED",
                "Updated status " + saved.getName(), "SUCCESS", buildContext(saved));
        return statusConfigMapper.toDto(saved);
    }

    @Transactional
    public void delete(Long id) {
        StatusConfig statusConfig = statusConfigRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Status not found"));
        if (statusConfig.isDefault()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Default statuses cannot be deleted. Please set another status as default before deleting this one.");
        }
        statusConfigRepository.delete(statusConfig);
        activityRecorder.record("Configuration", "STATUS_DELETED",
                "Deleted status " + statusConfig.getName(), "SUCCESS", buildContext(statusConfig));
    }

    @Transactional
    public StatusConfigDto markAsDefault(Long id) {
        StatusConfig statusConfig = statusConfigRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Status not found"));
        if (!statusConfig.isDefault()) {
            statusConfigRepository.clearDefaultForCategoryExcludingId(statusConfig.getCategory(), statusConfig.getId());
            statusConfig.setDefault(true);
            statusConfig = statusConfigRepository.save(statusConfig);
            activityRecorder.record("Configuration", "STATUS_MARKED_DEFAULT",
                    "Marked status " + statusConfig.getName() + " as default", "SUCCESS", buildContext(statusConfig));
        }
        return statusConfigMapper.toDto(statusConfig);
    }

    private void applyRequest(StatusConfig statusConfig, StatusConfigRequest request, boolean creating) {
        String name = normalize(request.getName());
        if (!StringUtils.hasText(name)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Status name is required");
        }
        StatusCategory category = request.getCategory();
        if (category == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Status category is required");
        }
        String color = normalize(request.getColorCode());
        if (!StringUtils.hasText(color)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Color code is required");
        }
        statusConfig.setName(name);
        statusConfig.setCategory(category);
        statusConfig.setColorCode(color.toUpperCase(Locale.ROOT));
        statusConfig.setIcon(trimToNull(request.getIcon()));
        statusConfig.setDescription(trimToNull(request.getDescription()));
        statusConfig.setDefault(Boolean.TRUE.equals(request.getDefaultStatus()));
        Boolean requestedActive = request.getActive();
        if (requestedActive == null) {
            if (creating && !statusConfig.isActive()) {
                statusConfig.setActive(true);
            }
        } else {
            statusConfig.setActive(requestedActive);
        }
    }

    private String normalize(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private String trimToNull(String value) {
        String normalized = normalize(value);
        return StringUtils.hasText(normalized) ? normalized : null;
    }

    private Optional<Long> resolveCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal userPrincipal)) {
            return Optional.empty();
        }
        User user = userPrincipal.getUser();
        if (user == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(user.getId());
    }

    private Map<String, Object> buildContext(StatusConfig statusConfig) {
        Map<String, Object> context = new HashMap<>();
        context.put("statusId", statusConfig.getId());
        context.put("statusName", statusConfig.getName());
        context.put("category", statusConfig.getCategory() != null ? statusConfig.getCategory().name() : null);
        context.put("default", statusConfig.isDefault());
        context.put("active", statusConfig.isActive());
        context.put("colorCode", statusConfig.getColorCode());
        return context;
    }
}
