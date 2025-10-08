package com.example.rbac.blog.controller;

import com.example.rbac.blog.dto.BlogPostDto;
import com.example.rbac.blog.dto.BlogPostRequest;
import com.example.rbac.blog.service.BlogPostService;
import com.example.rbac.common.pagination.PageResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/blog/posts")
public class BlogPostController {

    private final BlogPostService blogPostService;

    public BlogPostController(BlogPostService blogPostService) {
        this.blogPostService = blogPostService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BLOG_POST_VIEW')")
    public PageResponse<BlogPostDto> list(@RequestParam(name = "page", defaultValue = "0") int page,
                                          @RequestParam(name = "size", defaultValue = "20") int size,
                                          @RequestParam(name = "sort", required = false) String sort,
                                          @RequestParam(name = "direction", required = false) String direction,
                                          @RequestParam(name = "categoryId", required = false) Long categoryId,
                                          @RequestParam(name = "published", required = false) Boolean published,
                                          @RequestParam(name = "search", required = false) String search) {
        return blogPostService.list(page, size, sort, direction, categoryId, published, search);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('BLOG_POST_VIEW')")
    public BlogPostDto get(@PathVariable("id") Long id) {
        return blogPostService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('BLOG_POST_CREATE')")
    public BlogPostDto create(@Valid @RequestBody BlogPostRequest request) {
        return blogPostService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('BLOG_POST_UPDATE')")
    public BlogPostDto update(@PathVariable("id") Long id, @Valid @RequestBody BlogPostRequest request) {
        return blogPostService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('BLOG_POST_DELETE')")
    public void delete(@PathVariable("id") Long id) {
        blogPostService.delete(id);
    }
}
