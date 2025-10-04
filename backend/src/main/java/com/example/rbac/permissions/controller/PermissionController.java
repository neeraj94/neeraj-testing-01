package com.example.rbac.permissions.controller;

import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.permissions.dto.PermissionDto;
import com.example.rbac.permissions.dto.PermissionRequest;
import com.example.rbac.permissions.service.PermissionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/permissions")
public class PermissionController {

    private final PermissionService permissionService;

    public PermissionController(PermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @GetMapping
    public PageResponse<PermissionDto> list(@RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "20") int size) {
        return permissionService.list(page, size);
    }

    @PostMapping
    public PermissionDto create(@Valid @RequestBody PermissionRequest request) {
        return permissionService.create(request);
    }

    @PutMapping("/{id}")
    public PermissionDto update(@PathVariable Long id, @Valid @RequestBody PermissionRequest request) {
        return permissionService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        permissionService.delete(id);
    }
}
