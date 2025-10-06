package com.example.rbac.permissions.service;

import com.example.rbac.activity.service.ActivityRecorder;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.permissions.dto.PermissionDto;
import com.example.rbac.permissions.dto.PermissionRequest;
import com.example.rbac.permissions.mapper.PermissionMapper;
import com.example.rbac.permissions.model.Permission;
import com.example.rbac.permissions.repository.PermissionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class PermissionService {

    private static final String CUSTOMER_PERMISSION_PREFIX = "CUSTOMER_";

    private final PermissionRepository permissionRepository;
    private final PermissionMapper permissionMapper;
    private final ActivityRecorder activityRecorder;

    public PermissionService(PermissionRepository permissionRepository,
                             PermissionMapper permissionMapper,
                             ActivityRecorder activityRecorder) {
        this.permissionRepository = permissionRepository;
        this.permissionMapper = permissionMapper;
        this.activityRecorder = activityRecorder;
    }

    @PreAuthorize("hasAuthority('PERMISSION_VIEW')")
    public PageResponse<PermissionDto> list(int page, int size, String sort, String direction) {
        Pageable pageable = buildPageable(page, size, sort, direction);
        Page<PermissionDto> result = permissionRepository
                .findByKeyNotStartingWithIgnoreCase(CUSTOMER_PERMISSION_PREFIX, pageable)
                .map(permissionMapper::toDto);
        return PageResponse.from(result);
    }

    private Pageable buildPageable(int page, int size, String sort, String direction) {
        String normalizedSort = sort == null ? "key" : sort.toLowerCase();
        String property;
        switch (normalizedSort) {
            case "name" -> property = "name";
            case "createdat" -> property = "createdAt";
            default -> property = "key";
        }
        Sort.Direction sortDirection = "desc".equalsIgnoreCase(direction) ? Sort.Direction.DESC : Sort.Direction.ASC;
        return PageRequest.of(page, size, Sort.by(sortDirection, property));
    }

    @PreAuthorize("hasAuthority('PERMISSION_CREATE')")
    public PermissionDto create(PermissionRequest request) {
        permissionRepository.findByKey(request.getKey()).ifPresent(existing -> {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Permission key already exists");
        });
        Permission permission = new Permission();
        permission.setKey(request.getKey());
        permission.setName(request.getName());
        permission = permissionRepository.save(permission);
        PermissionDto dto = permissionMapper.toDto(permission);
        activityRecorder.record("Permissions", "CREATE", "Created permission " + permission.getKey(), "SUCCESS", buildContext(permission));
        return dto;
    }

    @PreAuthorize("hasAuthority('PERMISSION_UPDATE')")
    public PermissionDto update(Long id, PermissionRequest request) {
        Permission permission = permissionRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Permission not found"));
        permission.setKey(request.getKey());
        permission.setName(request.getName());
        permission = permissionRepository.save(permission);
        PermissionDto dto = permissionMapper.toDto(permission);
        activityRecorder.record("Permissions", "UPDATE", "Updated permission " + permission.getKey(), "SUCCESS", buildContext(permission));
        return dto;
    }

    @PreAuthorize("hasAuthority('PERMISSION_DELETE')")
    public void delete(Long id) {
        Permission permission = permissionRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Permission not found"));
        permissionRepository.delete(permission);
        activityRecorder.record("Permissions", "DELETE", "Deleted permission " + permission.getKey(), "SUCCESS", buildContext(permission));
    }

    private Map<String, Object> buildContext(Permission permission) {
        HashMap<String, Object> context = new HashMap<>();
        if (permission == null) {
            return context;
        }
        if (permission.getId() != null) {
            context.put("permissionId", permission.getId());
        }
        if (permission.getKey() != null) {
            context.put("key", permission.getKey());
        }
        if (permission.getName() != null) {
            context.put("name", permission.getName());
        }
        return context;
    }
}
