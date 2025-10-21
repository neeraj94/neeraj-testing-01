package com.example.rbac.publicapi.blog.controller;

import com.example.rbac.publicapi.blog.dto.BlogCategoryDto;
import com.example.rbac.publicapi.blog.dto.PublicBlogPostDto;
import com.example.rbac.publicapi.blog.service.PublicBlogCategoryService;
import com.example.rbac.publicapi.blog.service.PublicBlogPostService;
import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.common.security.PublicEndpoint;
import com.example.rbac.common.web.PublicApiPaths;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@PublicEndpoint("Blog content delivery")
@RequestMapping({"/api/v1/blog/public", "/api/v1/client/blog/public"})
public class PublicBlogController {

    private final PublicBlogPostService blogPostService;
    private final PublicBlogCategoryService blogCategoryService;

    public PublicBlogController(PublicBlogPostService blogPostService, PublicBlogCategoryService blogCategoryService) {
        this.blogPostService = blogPostService;
        this.blogCategoryService = blogCategoryService;
    }

    @GetMapping("/posts")
    public PageResponse<PublicBlogPostDto> list(@RequestParam(name = "page", defaultValue = "0") int page,
                                                @RequestParam(name = "size", defaultValue = "12") int size,
                                                @RequestParam(name = "category", required = false) String categorySlug,
                                                @RequestParam(name = "search", required = false) String search) {
        return blogPostService.listPublished(page, size, categorySlug, search);
    }

    @GetMapping("/posts/{slug}")
    public PublicBlogPostDto get(@PathVariable("slug") String slug) {
        return blogPostService.getPublishedPost(slug);
    }

    @GetMapping("/categories")
    public List<BlogCategoryDto> categories() {
        return blogCategoryService.findAll();
    }
}
