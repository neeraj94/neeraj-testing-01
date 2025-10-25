package com.example.rbac.admin.config.status.service;

import com.example.rbac.admin.activity.service.ActivityRecorder;
import com.example.rbac.admin.config.status.dto.*;
import com.example.rbac.admin.config.status.model.Status;
import com.example.rbac.admin.config.status.model.StatusTransition;
import com.example.rbac.admin.config.status.model.StatusType;
import com.example.rbac.admin.config.status.model.StatusTypeKey;
import com.example.rbac.admin.config.status.repository.StatusRepository;
import com.example.rbac.admin.config.status.repository.StatusTransitionRepository;
import com.example.rbac.admin.config.status.repository.StatusTypeRepository;
import com.example.rbac.client.checkout.repository.CheckoutOrderRepository;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.common.pagination.PageResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class StatusService {

    private static final Sort DEFAULT_SORT = Sort.by(Sort.Order.asc("sortOrder"), Sort.Order.asc("name"));

    private final StatusRepository statusRepository;
    private final StatusTypeRepository statusTypeRepository;
    private final StatusTransitionRepository transitionRepository;
    private final CheckoutOrderRepository checkoutOrderRepository;
    private final ActivityRecorder activityRecorder;

    public StatusService(StatusRepository statusRepository,
                         StatusTypeRepository statusTypeRepository,
                         StatusTransitionRepository transitionRepository,
                         CheckoutOrderRepository checkoutOrderRepository,
                         ActivityRecorder activityRecorder) {
        this.statusRepository = statusRepository;
        this.statusTypeRepository = statusTypeRepository;
        this.transitionRepository = transitionRepository;
        this.checkoutOrderRepository = checkoutOrderRepository;
        this.activityRecorder = activityRecorder;
    }

    @Transactional(readOnly = true)
    public PageResponse<StatusSummaryDto> list(String rawType, int page, int size, String search) {
        StatusType type = resolveType(rawType);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), DEFAULT_SORT);
        String normalizedSearch = StringUtils.hasText(search) ? search.trim() : null;
        Page<Status> result = statusRepository.search(type, normalizedSearch, pageable);
        return PageResponse.from(result.map(this::toSummaryDto));
    }

    @Transactional(readOnly = true)
    public StatusDetailDto get(Long id) {
        Status status = getStatusOrThrow(id);
        List<Long> transitionIds = transitionRepository.findByFromStatus(status)
                .stream()
                .map(transition -> transition.getToStatus().getId())
                .collect(Collectors.toList());
        return toDetailDto(status, transitionIds);
    }

    @Transactional
    public StatusDetailDto create(StatusRequest request) {
        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Status payload is required");
        }
        StatusType type = resolveType(request.getType());
        Status status = new Status();
        status.setStatusType(type);
        applyRequest(status, request, true);

        boolean requestedDefault = Boolean.TRUE.equals(request.getDefault());
        long existingDefaults = statusRepository.countByStatusTypeAndDefaultStatusTrue(type);
        if (!requestedDefault && existingDefaults == 0) {
            status.setDefaultStatus(true);
        }

        try {
            status = statusRepository.save(status);
        } catch (DataIntegrityViolationException ex) {
            throw buildConflictException(ex);
        }

        if (status.isDefaultStatus()) {
            statusRepository.clearDefaultForOtherStatuses(type, status.getId());
        }

        if (typeKey(type) == StatusTypeKey.ORDER && !CollectionUtils.isEmpty(request.getAllowedTransitionIds())) {
            updateTransitionsInternal(status, request.getAllowedTransitionIds());
        }

        activityRecorder.record("Configuration", "CONFIG_STATUS_CREATED",
                String.format(Locale.ROOT, "Created %s status %s", type.getKey(), status.getName()),
                "SUCCESS", buildContext(status));

        return get(status.getId());
    }

    @Transactional
    public StatusDetailDto update(Long id, StatusRequest request) {
        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Status payload is required");
        }
        Status status = getStatusOrThrow(id);
        StatusType type = status.getStatusType();
        StatusTypeKey typeKey = typeKey(type);

        if (StringUtils.hasText(request.getType())) {
            StatusTypeKey requested = StatusTypeKey.fromString(request.getType());
            if (requested != typeKey) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Status type cannot be changed");
            }
        }

        if (StringUtils.hasText(request.getCode()) && !Objects.equals(status.getCode(), request.getCode().trim().toUpperCase(Locale.ROOT))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Status code cannot be changed");
        }

        boolean wasDefault = status.isDefaultStatus();
        applyRequest(status, request, false);

        Boolean defaultFlag = request.getDefault();
        if (defaultFlag != null) {
            if (defaultFlag) {
                status.setDefaultStatus(true);
            } else if (wasDefault) {
                ensureAnotherDefaultExists(type);
                status.setDefaultStatus(false);
            }
        }

        try {
            status = statusRepository.save(status);
        } catch (DataIntegrityViolationException ex) {
            throw buildConflictException(ex);
        }

        if (status.isDefaultStatus()) {
            statusRepository.clearDefaultForOtherStatuses(type, status.getId());
        }

        if (typeKey == StatusTypeKey.ORDER && request.getAllowedTransitionIds() != null) {
            updateTransitionsInternal(status, request.getAllowedTransitionIds());
        }

        activityRecorder.record("Configuration", "CONFIG_STATUS_UPDATED",
                String.format(Locale.ROOT, "Updated %s status %s", type.getKey(), status.getName()),
                "SUCCESS", buildContext(status));

        return get(status.getId());
    }

    @Transactional
    public StatusDetailDto patch(Long id, StatusPatchRequest request) {
        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Status payload is required");
        }
        Status status = getStatusOrThrow(id);
        StatusType type = status.getStatusType();
        StatusTypeKey typeKey = typeKey(type);

        if (request.getDefault() != null) {
            if (request.getDefault()) {
                status.setDefaultStatus(true);
                try {
                    status = statusRepository.save(status);
                } catch (DataIntegrityViolationException ex) {
                    throw buildConflictException(ex);
                }
                statusRepository.clearDefaultForOtherStatuses(type, status.getId());
            } else {
                ensureAnotherDefaultExists(type);
                status.setDefaultStatus(false);
            }
        }

        if (request.getActive() != null) {
            boolean targetActive = request.getActive();
            if (!targetActive) {
                ensureCanDeactivate(status);
            }
            status.setActive(targetActive);
        }

        status = statusRepository.save(status);

        activityRecorder.record("Configuration", "CONFIG_STATUS_UPDATED",
                String.format(Locale.ROOT, "%s status %s updated", type.getKey(), status.getName()),
                "SUCCESS", buildContext(status));

        if (!status.isActive() && typeKey == StatusTypeKey.ORDER) {
            // ensure dependent transitions are cleaned up for inactive statuses
            pruneTransitionsForInactiveTarget(status);
        }

        return get(status.getId());
    }

    @Transactional
    public void delete(Long id) {
        Status status = getStatusOrThrow(id);
        StatusType type = status.getStatusType();
        StatusTypeKey typeKey = typeKey(type);

        if (status.isDefaultStatus()) {
            throw new ApiException(HttpStatus.CONFLICT, "Assign a different default before deleting this status");
        }

        if (typeKey == StatusTypeKey.ORDER && checkoutOrderRepository.existsByStatusIgnoreCase(status.getCode())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Status is referenced by existing orders. Deactivate instead of deleting.");
        }

        if (transitionRepository.existsByToStatusId(status.getId())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Status is referenced by workflow transitions. Update transitions before deleting.");
        }

        transitionRepository.deleteByFromStatus(status);
        List<StatusTransition> inbound = transitionRepository.findByToStatus(status);
        if (!CollectionUtils.isEmpty(inbound)) {
            transitionRepository.deleteAll(inbound);
        }

        statusRepository.delete(status);

        activityRecorder.record("Configuration", "CONFIG_STATUS_DELETED",
                String.format(Locale.ROOT, "Deleted %s status %s", type.getKey(), status.getName()),
                "SUCCESS", buildContext(status));
    }

    @Transactional
    public void reorder(StatusReorderRequest request) {
        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Reorder payload is required");
        }
        StatusType type = resolveType(request.getType());
        List<Long> ids = request.getIds();
        if (CollectionUtils.isEmpty(ids)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Provide at least one status id");
        }

        List<Status> statuses = statusRepository.findByStatusTypeOrderBySortOrderAscNameAsc(type);
        Map<Long, Status> byId = statuses.stream().collect(Collectors.toMap(Status::getId, s -> s));

        int order = 10;
        List<Status> reordered = new ArrayList<>(statuses.size());
        for (Long id : ids) {
            Status status = byId.remove(id);
            if (status == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown status id " + id);
            }
            status.setSortOrder(order);
            order += 10;
            reordered.add(status);
        }

        for (Status remaining : byId.values()) {
            remaining.setSortOrder(order);
            order += 10;
            reordered.add(remaining);
        }

        statusRepository.saveAll(reordered);

        activityRecorder.record("Configuration", "CONFIG_STATUS_REORDERED",
                String.format(Locale.ROOT, "Reordered %s statuses", type.getKey()),
                "SUCCESS", Map.of("ids", request.getIds()));
    }

    @Transactional(readOnly = true)
    public List<Long> getTransitions(Long id) {
        Status status = getStatusOrThrow(id);
        return transitionRepository.findByFromStatus(status)
                .stream()
                .map(transition -> transition.getToStatus().getId())
                .collect(Collectors.toList());
    }

    @Transactional
    public List<Long> updateTransitions(Long id, StatusTransitionsRequest request) {
        Status status = getStatusOrThrow(id);
        StatusType type = status.getStatusType();
        if (typeKey(type) != StatusTypeKey.ORDER) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Transitions are only supported for order statuses");
        }
        List<Long> ids = request != null ? request.getToStatusIds() : null;
        updateTransitionsInternal(status, ids);
        activityRecorder.record("Configuration", "CONFIG_STATUS_TRANSITIONS_UPDATED",
                String.format(Locale.ROOT, "Updated transitions for status %s", status.getName()),
                "SUCCESS", buildContext(status));
        return getTransitions(id);
    }

    private void updateTransitionsInternal(Status status, List<Long> toStatusIds) {
        Set<Long> sanitized = CollectionUtils.isEmpty(toStatusIds)
                ? new LinkedHashSet<>()
                : toStatusIds.stream()
                .filter(Objects::nonNull)
                .map(Long::longValue)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        sanitized.remove(status.getId());

        transitionRepository.deleteByFromStatus(status);

        if (sanitized.isEmpty()) {
            return;
        }

        List<Status> targets = statusRepository.findByIdIn(sanitized);
        Map<Long, Status> byId = targets.stream().collect(Collectors.toMap(Status::getId, s -> s));
        StatusType type = status.getStatusType();
        StatusTypeKey typeKey = typeKey(type);

        List<StatusTransition> transitions = new ArrayList<>();
        for (Long id : sanitized) {
            Status target = byId.get(id);
            if (target == null || typeKey(target.getStatusType()) != typeKey) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid transition target " + id);
            }
            StatusTransition transition = new StatusTransition();
            transition.setFromStatus(status);
            transition.setToStatus(target);
            transitions.add(transition);
        }
        if (!transitions.isEmpty()) {
            transitionRepository.saveAll(transitions);
        }
    }

    private void ensureCanDeactivate(Status status) {
        StatusType type = status.getStatusType();
        if (status.isDefaultStatus()) {
            ensureAnotherDefaultExists(type);
        }
        List<StatusTransition> inbound = transitionRepository.findByToStatus(status);
        if (!CollectionUtils.isEmpty(inbound)) {
            for (StatusTransition transition : inbound) {
                Status fromStatus = transition.getFromStatus();
                if (fromStatus != null && fromStatus.isActive()) {
                    long transitionCount = transitionRepository.countByFromStatusId(fromStatus.getId());
                    if (transitionCount <= 1) {
                        throw new ApiException(HttpStatus.CONFLICT,
                                "Status is the only allowed transition target for " + fromStatus.getName());
                    }
                }
            }
        }
    }

    private void pruneTransitionsForInactiveTarget(Status status) {
        List<StatusTransition> inbound = transitionRepository.findByToStatus(status);
        if (!CollectionUtils.isEmpty(inbound)) {
            transitionRepository.deleteAll(inbound);
        }
    }

    private void ensureAnotherDefaultExists(StatusType type) {
        long defaults = statusRepository.countByStatusTypeAndDefaultStatusTrue(type);
        if (defaults <= 1) {
            throw new ApiException(HttpStatus.CONFLICT, "At least one status must remain default");
        }
    }

    private StatusType resolveType(String rawType) {
        StatusTypeKey key;
        try {
            key = StatusTypeKey.fromString(rawType);
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
        return statusTypeRepository.findByKey(key.name())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Status type not found"));
    }

    private Status getStatusOrThrow(Long id) {
        return statusRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Status not found"));
    }

    private void applyRequest(Status status, StatusRequest request, boolean isCreate) {
        if (!StringUtils.hasText(request.getName())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Name is required");
        }
        status.setName(request.getName().trim());

        if (isCreate) {
            if (!StringUtils.hasText(request.getCode())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Code is required");
            }
            status.setCode(request.getCode().trim().toUpperCase(Locale.ROOT));
        }

        status.setIcon(StringUtils.hasText(request.getIcon()) ? request.getIcon().trim() : null);
        status.setColorHex(StringUtils.hasText(request.getColorHex()) ? request.getColorHex().trim().toUpperCase(Locale.ROOT) : null);
        status.setDescription(StringUtils.hasText(request.getDescription()) ? request.getDescription().trim() : null);

        if (request.getActive() != null) {
            if (!request.getActive()) {
                ensureCanDeactivate(status);
            }
            status.setActive(request.getActive());
        } else if (isCreate) {
            status.setActive(true);
        }

        StatusTypeKey typeKey = typeKey(status.getStatusType());
        if (typeKey == StatusTypeKey.ORDER) {
            status.setVisibleToCustomer(request.getVisibleToCustomer() != null ? request.getVisibleToCustomer() : Boolean.TRUE);
        } else {
            status.setVisibleToCustomer(null);
        }

        if (isCreate) {
            Integer maxSort = statusRepository.findMaxSortOrderByStatusType(status.getStatusType());
            int nextOrder = (maxSort != null ? maxSort : 0) + 10;
            status.setSortOrder(nextOrder);
        }
    }

    private StatusSummaryDto toSummaryDto(Status status) {
        return new StatusSummaryDto(
                status.getId(),
                status.getStatusType().getKey(),
                status.getName(),
                status.getCode(),
                status.getIcon(),
                status.getColorHex(),
                status.getDescription(),
                status.isDefaultStatus(),
                status.isActive(),
                status.getVisibleToCustomer(),
                status.getSortOrder()
        );
    }

    private StatusDetailDto toDetailDto(Status status, List<Long> transitionIds) {
        return new StatusDetailDto(
                status.getId(),
                status.getStatusType().getKey(),
                status.getName(),
                status.getCode(),
                status.getIcon(),
                status.getColorHex(),
                status.getDescription(),
                status.isDefaultStatus(),
                status.isActive(),
                status.getVisibleToCustomer(),
                status.getSortOrder(),
                transitionIds
        );
    }

    private StatusTypeKey typeKey(StatusType type) {
        return StatusTypeKey.fromString(type.getKey());
    }

    private ApiException buildConflictException(DataIntegrityViolationException ex) {
        return new ApiException(HttpStatus.CONFLICT, "Status name or code already exists for this type", ex);
    }

    private Map<String, Object> buildContext(Status status) {
        Map<String, Object> context = new HashMap<>();
        context.put("statusId", status.getId());
        context.put("statusType", status.getStatusType().getKey());
        context.put("code", status.getCode());
        context.put("name", status.getName());
        return context;
    }
}
