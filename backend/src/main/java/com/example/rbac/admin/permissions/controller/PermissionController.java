package com.example.rbac.admin.permissions.controller;

import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.admin.permissions.dto.PermissionDto;
import com.example.rbac.admin.permissions.dto.PermissionRequest;
import com.example.rbac.admin.permissions.service.PermissionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/permissions")
public class PermissionController {

    private final PermissionService permissionService;

    public PermissionController(PermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @GetMapping
    public PageResponse<PermissionDto> list(@RequestParam(name = "page", defaultValue = "0") int page,
                                            @RequestParam(name = "size", defaultValue = "20") int size,
                                            @RequestParam(name = "sort", defaultValue = "key") String sort,
                                            @RequestParam(name = "direction", defaultValue = "asc") String direction) {
        return permissionService.list(page, size, sort, direction);
    }

    @GetMapping("/defaults")
    public List<PermissionDto> listDefaults() {
        return permissionService.listDefaultPermissions();
    }

    @PostMapping
    public PermissionDto create(@Valid @RequestBody PermissionRequest request) {
        return permissionService.create(request);
    }

    @PutMapping("/{id}")
    public PermissionDto update(@PathVariable("id") Long id, @Valid @RequestBody PermissionRequest request) {
        return permissionService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable("id") Long id) {
        permissionService.delete(id);
    }
}
