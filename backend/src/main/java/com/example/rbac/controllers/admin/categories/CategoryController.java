package com.example.rbac.controllers.admin.categories;

import com.example.rbac.categories.dto.CategoryDto;
import com.example.rbac.categories.dto.CategoryOptionDto;
import com.example.rbac.categories.dto.CategoryRequest;
import com.example.rbac.categories.service.CategoryService;
import com.example.rbac.common.pagination.PageResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/categories")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('CATEGORY_VIEW')")
    public PageResponse<CategoryDto> list(@RequestParam(name = "page", defaultValue = "0") int page,
                                          @RequestParam(name = "size", defaultValue = "20") int size,
                                          @RequestParam(name = "search", required = false) String search) {
        return categoryService.list(page, size, search);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('CATEGORY_VIEW')")
    public CategoryDto get(@PathVariable("id") Long id) {
        return categoryService.get(id);
    }

    @GetMapping("/options")
    @PreAuthorize("hasAuthority('CATEGORY_VIEW')")
    public List<CategoryOptionDto> options(@RequestParam(name = "excludeId", required = false) Long excludeId) {
        return categoryService.options(excludeId);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('CATEGORY_CREATE')")
    public CategoryDto create(@Valid @RequestBody CategoryRequest request) {
        return categoryService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('CATEGORY_UPDATE')")
    public CategoryDto update(@PathVariable("id") Long id, @Valid @RequestBody CategoryRequest request) {
        return categoryService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('CATEGORY_DELETE')")
    public void delete(@PathVariable("id") Long id) {
        categoryService.delete(id);
    }
}
