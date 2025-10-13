package com.example.rbac.products.controller;

import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.products.dto.CreateProductRequest;
import com.example.rbac.products.dto.ProductDto;
import com.example.rbac.products.dto.ProductSummaryDto;
import com.example.rbac.products.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('PRODUCT_VIEW')")
    public PageResponse<ProductSummaryDto> list(@RequestParam(name = "page", defaultValue = "0") int page,
                                                @RequestParam(name = "size", defaultValue = "20") int size,
                                                @RequestParam(name = "search", required = false) String search) {
        return productService.list(page, size, search);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('PRODUCT_VIEW')")
    public ProductDto get(@PathVariable("id") Long id) {
        return productService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PRODUCT_CREATE')")
    public ProductDto create(@Valid @RequestBody CreateProductRequest request) {
        return productService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PRODUCT_UPDATE')")
    public ProductDto update(@PathVariable("id") Long id, @Valid @RequestBody CreateProductRequest request) {
        return productService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PRODUCT_DELETE')")
    public void delete(@PathVariable("id") Long id) {
        productService.delete(id);
    }
}
