package com.example.rbac.admin.activity.service;

import com.example.rbac.admin.activity.dto.ActivityFilterOptionsDto;
import com.example.rbac.admin.activity.dto.ActivityLogDetailDto;
import com.example.rbac.admin.activity.dto.ActivityLogDto;
import com.example.rbac.admin.activity.dto.ActivityLogFilter;
import com.example.rbac.admin.activity.mapper.ActivityLogMapper;
import com.example.rbac.admin.activity.model.ActivityLog;
import com.example.rbac.admin.activity.repository.ActivityLogRepository;
import com.example.rbac.admin.activity.spec.ActivityLogSpecifications;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.common.pagination.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
public class ActivityLogService {

    private static final Map<String, String> SORT_MAPPING;

    static {
        SORT_MAPPING = new HashMap<>();
        SORT_MAPPING.put("timestamp", "occurredAt");
        SORT_MAPPING.put("user", "userName");
        SORT_MAPPING.put("activityType", "activityType");
        SORT_MAPPING.put("module", "moduleName");
        SORT_MAPPING.put("status", "status");
    }

    private final ActivityLogRepository activityLogRepository;
    private final ActivityLogMapper activityLogMapper;

    public ActivityLogService(ActivityLogRepository activityLogRepository,
                              ActivityLogMapper activityLogMapper) {
        this.activityLogRepository = activityLogRepository;
        this.activityLogMapper = activityLogMapper;
    }

    @PreAuthorize("hasAuthority('ACTIVITY_VIEW')")
    @Transactional(readOnly = true)
    public PageResponse<ActivityLogDto> search(int page,
                                               int size,
                                               String sort,
                                               String direction,
                                               ActivityLogFilter filter) {
        Pageable pageable = buildPageable(page, size, sort, direction);
        Specification<ActivityLog> specification = buildSpecification(filter);
        Page<ActivityLogDto> result = activityLogRepository.findAll(specification, pageable)
                .map(activityLogMapper::toDto);
        return PageResponse.from(result);
    }

    @PreAuthorize("hasAuthority('ACTIVITY_VIEW')")
    @Transactional(readOnly = true)
    public ActivityLogDetailDto getDetail(Long id) {
        ActivityLog log = activityLogRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Activity not found"));
        return activityLogMapper.toDetail(log);
    }

    @PreAuthorize("hasAuthority('ACTIVITY_VIEW')")
    @Transactional(readOnly = true)
    public ActivityFilterOptionsDto getFilterOptions() {
        return new ActivityFilterOptionsDto(
                activityLogRepository.findDistinctActivityTypes(),
                activityLogRepository.findDistinctModules(),
                activityLogRepository.findDistinctStatuses(),
                activityLogRepository.findDistinctRoles(),
                activityLogRepository.findDistinctDepartments(),
                activityLogRepository.findDistinctIpAddresses(),
                activityLogRepository.findDistinctDevices()
        );
    }

    private Pageable buildPageable(int page, int size, String sort, String direction) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 200);
        String normalizedSort = sort == null ? "timestamp" : sort.toLowerCase();
        String property = SORT_MAPPING.getOrDefault(normalizedSort, SORT_MAPPING.get("timestamp"));
        Sort.Direction sortDirection = "asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return PageRequest.of(safePage, safeSize, Sort.by(sortDirection, property));
    }

    private Specification<ActivityLog> buildSpecification(ActivityLogFilter filter) {
        Specification<ActivityLog> spec = Specification.where(null);
        spec = combine(spec, ActivityLogSpecifications.searchTerm(filter.search()));
        spec = combine(spec, ActivityLogSpecifications.userQuery(filter.user()));
        spec = combine(spec, ActivityLogSpecifications.roles(filter.roles()));
        spec = combine(spec, ActivityLogSpecifications.departments(filter.departments()));
        spec = combine(spec, ActivityLogSpecifications.modules(filter.modules()));
        spec = combine(spec, ActivityLogSpecifications.activityTypes(filter.activityTypes()));
        spec = combine(spec, ActivityLogSpecifications.statuses(filter.statuses()));
        spec = combine(spec, ActivityLogSpecifications.ipAddresses(filter.ipAddresses()));
        spec = combine(spec, ActivityLogSpecifications.devices(filter.devices()));
        spec = combine(spec, ActivityLogSpecifications.occurredAfter(filter.startDate()));
        spec = combine(spec, ActivityLogSpecifications.occurredBefore(filter.endDate()));
        return spec;
    }

    private Specification<ActivityLog> combine(Specification<ActivityLog> base,
                                               Specification<ActivityLog> addition) {
        if (base == null) {
            return addition;
        }
        if (addition == null) {
            return base;
        }
        return base.and(addition);
    }
}
