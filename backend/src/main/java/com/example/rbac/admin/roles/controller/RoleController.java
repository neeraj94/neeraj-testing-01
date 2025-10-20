package com.example.rbac.admin.roles.controller;

import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.admin.roles.dto.AssignPermissionsRequest;
import com.example.rbac.admin.roles.dto.RoleDto;
import com.example.rbac.admin.roles.dto.RoleRequest;
import com.example.rbac.admin.roles.service.RoleService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/roles")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @GetMapping
    public PageResponse<RoleDto> list(@RequestParam(name = "page", defaultValue = "0") int page,
                                      @RequestParam(name = "size", defaultValue = "20") int size,
                                      @RequestParam(name = "sort", defaultValue = "name") String sort,
                                      @RequestParam(name = "direction", defaultValue = "asc") String direction) {
        return roleService.list(page, size, sort, direction);
    }

    @PostMapping
    public RoleDto create(@Valid @RequestBody RoleRequest request) {
        return roleService.create(request);
    }

    @GetMapping("/{id}")
    public RoleDto get(@PathVariable("id") Long id) {
        return roleService.get(id);
    }

    @PutMapping("/{id}")
    public RoleDto update(@PathVariable("id") Long id, @Valid @RequestBody RoleRequest request) {
        return roleService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable("id") Long id) {
        roleService.delete(id);
    }

    @PostMapping("/{id}/permissions")
    public RoleDto assignPermissions(@PathVariable("id") Long id, @Valid @RequestBody AssignPermissionsRequest request) {
        return roleService.assignPermissions(id, request);
    }

    @DeleteMapping("/{id}/permissions/{permissionId}")
    public RoleDto removePermission(@PathVariable("id") Long id, @PathVariable("permissionId") Long permissionId) {
        return roleService.removePermission(id, permissionId);
    }
}
