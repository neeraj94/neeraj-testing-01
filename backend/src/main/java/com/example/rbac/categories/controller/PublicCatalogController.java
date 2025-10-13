package com.example.rbac.categories.controller;

import com.example.rbac.categories.dto.PublicCategoryDto;
import com.example.rbac.categories.service.CategoryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/public/catalog")
public class PublicCatalogController {

    private final CategoryService categoryService;

    public PublicCatalogController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping("/categories")
    public List<PublicCategoryDto> listCategories() {
        return categoryService.listPublicCategories();
    }
}
