package com.example.rbac.controllers.publicapi.catalog;

import com.example.rbac.brands.dto.PublicBrandDto;
import com.example.rbac.brands.service.BrandService;
import com.example.rbac.categories.dto.PublicCategoryDto;
import com.example.rbac.categories.service.CategoryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/publicapi/catalog")
public class PublicCatalogController {

    private final CategoryService categoryService;
    private final BrandService brandService;

    public PublicCatalogController(CategoryService categoryService,
                                   BrandService brandService) {
        this.categoryService = categoryService;
        this.brandService = brandService;
    }

    @GetMapping("/categories")
    public List<PublicCategoryDto> listCategories() {
        return categoryService.listPublicCategories();
    }

    @GetMapping("/brands")
    public List<PublicBrandDto> listBrands() {
        return brandService.listPublicBrands();
    }
}
