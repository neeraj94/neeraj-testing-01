package com.example.rbac.admin.blog.controller;

import com.example.rbac.blog.dto.BlogCategoryDto;
import com.example.rbac.blog.dto.BlogCategoryRequest;
import com.example.rbac.blog.service.BlogCategoryService;
import com.example.rbac.common.pagination.PageResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/blog/categories")
public class BlogCategoryController {

    private final BlogCategoryService blogCategoryService;

    public BlogCategoryController(BlogCategoryService blogCategoryService) {
        this.blogCategoryService = blogCategoryService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BLOG_CATEGORY_VIEW')")
    public PageResponse<BlogCategoryDto> list(@RequestParam(name = "page", defaultValue = "0") int page,
                                              @RequestParam(name = "size", defaultValue = "20") int size,
                                              @RequestParam(name = "search", required = false) String search) {
        return blogCategoryService.list(page, size, search);
    }

    @GetMapping("/all")
    @PreAuthorize("hasAuthority('BLOG_CATEGORY_VIEW')")
    public List<BlogCategoryDto> findAll() {
        return blogCategoryService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('BLOG_CATEGORY_VIEW')")
    public BlogCategoryDto get(@PathVariable("id") Long id) {
        return blogCategoryService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('BLOG_CATEGORY_CREATE')")
    public BlogCategoryDto create(@Valid @RequestBody BlogCategoryRequest request) {
        return blogCategoryService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('BLOG_CATEGORY_UPDATE')")
    public BlogCategoryDto update(@PathVariable("id") Long id, @Valid @RequestBody BlogCategoryRequest request) {
        return blogCategoryService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('BLOG_CATEGORY_DELETE')")
    public void delete(@PathVariable("id") Long id) {
        blogCategoryService.delete(id);
    }
}
