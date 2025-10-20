package com.example.rbac.badges.category.controller;

import com.example.rbac.badges.category.dto.BadgeCategoryDto;
import com.example.rbac.badges.category.dto.BadgeCategoryOptionDto;
import com.example.rbac.badges.category.dto.BadgeCategoryRequest;
import com.example.rbac.badges.category.service.BadgeCategoryService;
import com.example.rbac.common.pagination.PageResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/badge-categories")
public class BadgeCategoryController {

    private final BadgeCategoryService service;

    public BadgeCategoryController(BadgeCategoryService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BADGE_CATEGORY_VIEW')")
    public PageResponse<BadgeCategoryDto> list(@RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size,
                                               @RequestParam(required = false) String search) {
        return service.list(page, size, search);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('BADGE_CATEGORY_VIEW')")
    public BadgeCategoryDto get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('BADGE_CATEGORY_CREATE')")
    public BadgeCategoryDto create(@Valid @RequestBody BadgeCategoryRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('BADGE_CATEGORY_UPDATE')")
    public BadgeCategoryDto update(@PathVariable Long id, @Valid @RequestBody BadgeCategoryRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('BADGE_CATEGORY_DELETE')")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    @GetMapping("/options")
    @PreAuthorize("hasAuthority('BADGE_CATEGORY_VIEW')")
    public List<BadgeCategoryOptionDto> options() {
        return service.options();
    }
}
