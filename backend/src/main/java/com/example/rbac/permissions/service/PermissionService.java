package com.example.rbac.permissions.service;

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

@Service
public class PermissionService {

    private final PermissionRepository permissionRepository;
    private final PermissionMapper permissionMapper;

    public PermissionService(PermissionRepository permissionRepository,
                             PermissionMapper permissionMapper) {
        this.permissionRepository = permissionRepository;
        this.permissionMapper = permissionMapper;
    }

    @PreAuthorize("hasAuthority('PERMISSION_VIEW')")
    public PageResponse<PermissionDto> list(int page, int size, String sort, String direction) {
        Pageable pageable = buildPageable(page, size, sort, direction);
        Page<PermissionDto> result = permissionRepository.findAll(pageable).map(permissionMapper::toDto);
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
        return permissionMapper.toDto(permission);
    }

    @PreAuthorize("hasAuthority('PERMISSION_UPDATE')")
    public PermissionDto update(Long id, PermissionRequest request) {
        Permission permission = permissionRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Permission not found"));
        permission.setKey(request.getKey());
        permission.setName(request.getName());
        permission = permissionRepository.save(permission);
        return permissionMapper.toDto(permission);
    }

    @PreAuthorize("hasAuthority('PERMISSION_DELETE')")
    public void delete(Long id) {
        if (!permissionRepository.existsById(id)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Permission not found");
        }
        permissionRepository.deleteById(id);
    }
}
