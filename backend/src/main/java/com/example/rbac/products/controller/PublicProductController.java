package com.example.rbac.products.controller;

import com.example.rbac.products.dto.storefront.PublicProductDetailDto;
import com.example.rbac.products.service.PublicProductService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/products")
public class PublicProductController {

    private final PublicProductService publicProductService;

    public PublicProductController(PublicProductService publicProductService) {
        this.publicProductService = publicProductService;
    }

    @GetMapping("/{slug}")
    public PublicProductDetailDto getBySlug(@PathVariable String slug) {
        return publicProductService.getBySlug(slug);
    }
}
