package com.example.rbac.roles.service;

import com.example.rbac.common.exception.ApiException;
import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.permissions.model.Permission;
import com.example.rbac.permissions.repository.PermissionRepository;
import com.example.rbac.roles.dto.AssignPermissionsRequest;
import com.example.rbac.roles.dto.RoleDto;
import com.example.rbac.roles.dto.RoleRequest;
import com.example.rbac.roles.mapper.RoleMapper;
import com.example.rbac.roles.model.Role;
import com.example.rbac.roles.repository.RoleRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Set;

@Service
public class RoleService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RoleMapper roleMapper;

    public RoleService(RoleRepository roleRepository,
                       PermissionRepository permissionRepository,
                       RoleMapper roleMapper) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.roleMapper = roleMapper;
    }

    @PreAuthorize("hasAuthority('ROLE_VIEW') or hasAuthority('PERMISSION_VIEW')")
    @Transactional(readOnly = true)
    public PageResponse<RoleDto> list(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<RoleDto> result = roleRepository.findAll(pageable).map(roleMapper::toDto);
        return PageResponse.from(result);
    }

    @PreAuthorize("hasAuthority('ROLE_CREATE')")
    public RoleDto create(RoleRequest request) {
        roleRepository.findByKey(request.getKey()).ifPresent(existing -> {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Role key already exists");
        });
        Role role = new Role();
        role.setKey(request.getKey());
        role.setName(request.getName());
        role = roleRepository.save(role);
        return roleMapper.toDto(role);
    }

    @PreAuthorize("hasAuthority('ROLE_VIEW')")
    public RoleDto get(Long id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Role not found"));
        return roleMapper.toDto(role);
    }

    @PreAuthorize("hasAuthority('ROLE_UPDATE')")
    public RoleDto update(Long id, RoleRequest request) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Role not found"));
        role.setKey(request.getKey());
        role.setName(request.getName());
        role = roleRepository.save(role);
        return roleMapper.toDto(role);
    }

    @PreAuthorize("hasAuthority('ROLE_DELETE')")
    public void delete(Long id) {
        if (!roleRepository.existsById(id)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Role not found");
        }
        roleRepository.deleteById(id);
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
        return roleMapper.toDto(role);
    }

    @PreAuthorize("hasAuthority('ROLE_UPDATE') or hasAuthority('PERMISSION_UPDATE')")
    @Transactional
    public RoleDto removePermission(Long roleId, Long permissionId) {
        Role role = roleRepository.findWithPermissionsById(roleId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Role not found"));
        role.getPermissions().removeIf(permission -> permission.getId().equals(permissionId));
        role = roleRepository.save(role);
        return roleMapper.toDto(role);
    }
}
