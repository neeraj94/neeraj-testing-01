package com.example.rbac.admin.roles.service;

import com.example.rbac.admin.activity.service.ActivityRecorder;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.admin.permissions.model.Permission;
import com.example.rbac.admin.permissions.repository.PermissionRepository;
import com.example.rbac.admin.roles.dto.AssignPermissionsRequest;
import com.example.rbac.admin.roles.dto.RoleDto;
import com.example.rbac.admin.roles.dto.RoleRequest;
import com.example.rbac.admin.roles.mapper.RoleMapper;
import com.example.rbac.admin.roles.model.Role;
import com.example.rbac.admin.roles.repository.RoleRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@Service
public class RoleService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RoleMapper roleMapper;
    private final ActivityRecorder activityRecorder;

    private static final Map<String, String> ROLE_SORT_MAPPING = Map.of(
            "name", "name",
            "key", "key",
            "createdAt", "createdAt"
    );

    public RoleService(RoleRepository roleRepository,
                       PermissionRepository permissionRepository,
                       RoleMapper roleMapper,
                       ActivityRecorder activityRecorder) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.roleMapper = roleMapper;
        this.activityRecorder = activityRecorder;
    }

    @PreAuthorize("hasAuthority('ROLE_VIEW') or hasAuthority('PERMISSION_VIEW')")
    @Transactional(readOnly = true)
    public PageResponse<RoleDto> list(int page, int size, String sort, String direction) {
        Pageable pageable = buildPageable(page, size, sort, direction);
        Page<RoleDto> result = roleRepository.findAll(pageable).map(roleMapper::toDto);
        return PageResponse.from(result);
    }

    private Pageable buildPageable(int page, int size, String sort, String direction) {
        String normalizedSort = sort == null ? "name" : sort.toLowerCase();
        String property = ROLE_SORT_MAPPING.getOrDefault(normalizedSort, ROLE_SORT_MAPPING.get("name"));
        Sort.Direction sortDirection = "desc".equalsIgnoreCase(direction) ? Sort.Direction.DESC : Sort.Direction.ASC;
        return PageRequest.of(page, size, Sort.by(sortDirection, property));
    }

    @PreAuthorize("hasAuthority('ROLE_CREATE')")
    @Transactional
    public RoleDto create(RoleRequest request) {
        roleRepository.findByKey(request.getKey()).ifPresent(existing -> {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Role key already exists");
        });
        Role role = new Role();
        role.setKey(request.getKey());
        role.setName(request.getName());
        role = roleRepository.save(role);
        RoleDto dto = roleMapper.toDto(role);
        activityRecorder.record("Roles", "CREATE", "Created role " + role.getName(), "SUCCESS", buildRoleContext(role));
        return dto;
    }

    @PreAuthorize("hasAuthority('ROLE_VIEW')")
    @Transactional(readOnly = true)
    public RoleDto get(Long id) {
        Role role = roleRepository.findWithPermissionsById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Role not found"));
        return roleMapper.toDto(role);
    }

    @PreAuthorize("hasAuthority('ROLE_UPDATE')")
    @Transactional
    public RoleDto update(Long id, RoleRequest request) {
        Role role = roleRepository.findWithPermissionsById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Role not found"));
        role.setKey(request.getKey());
        role.setName(request.getName());
        role = roleRepository.save(role);
        RoleDto dto = roleMapper.toDto(role);
        activityRecorder.record("Roles", "UPDATE", "Updated role " + role.getName(), "SUCCESS", buildRoleContext(role));
        return dto;
    }

    @PreAuthorize("hasAuthority('ROLE_DELETE')")
    public void delete(Long id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Role not found"));
        roleRepository.delete(role);
        activityRecorder.record("Roles", "DELETE", "Deleted role " + role.getName(), "SUCCESS", buildRoleContext(role));
    }

    @PreAuthorize("hasAuthority('ROLE_UPDATE') or hasAuthority('PERMISSION_UPDATE')")
    @Transactional
    public RoleDto assignPermissions(Long id, AssignPermissionsRequest request) {
        Role role = roleRepository.findWithPermissionsById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Role not found"));
        Set<Permission> permissions = new HashSet<>(permissionRepository.findAllById(request.getPermissionIds()));
        if (permissions.size() != request.getPermissionIds().size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "One or more permissions not found");
        }
        role.getPermissions().clear();
        role.getPermissions().addAll(permissions);
        role = roleRepository.save(role);
        RoleDto dto = roleMapper.toDto(role);
        HashMap<String, Object> context = new HashMap<>(buildRoleContext(role));
        context.put("permissionIds", request.getPermissionIds());
        activityRecorder.record("Roles", "ASSIGN_PERMISSIONS", "Updated permissions for role " + role.getName(), "SUCCESS", context);
        return dto;
    }

    @PreAuthorize("hasAuthority('ROLE_UPDATE') or hasAuthority('PERMISSION_UPDATE')")
    @Transactional
    public RoleDto removePermission(Long roleId, Long permissionId) {
        Role role = roleRepository.findWithPermissionsById(roleId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Role not found"));
        role.getPermissions().removeIf(permission -> permission.getId().equals(permissionId));
        role = roleRepository.save(role);
        RoleDto dto = roleMapper.toDto(role);
        HashMap<String, Object> context = new HashMap<>(buildRoleContext(role));
        context.put("permissionId", permissionId);
        activityRecorder.record("Roles", "REMOVE_PERMISSION", "Removed permission from role " + role.getName(), "SUCCESS", context);
        return dto;
    }

    private HashMap<String, Object> buildRoleContext(Role role) {
        HashMap<String, Object> context = new HashMap<>();
        if (role == null) {
            return context;
        }
        if (role.getId() != null) {
            context.put("roleId", role.getId());
        }
        if (role.getKey() != null) {
            context.put("key", role.getKey());
        }
        if (role.getName() != null) {
            context.put("name", role.getName());
        }
        return context;
    }
}
