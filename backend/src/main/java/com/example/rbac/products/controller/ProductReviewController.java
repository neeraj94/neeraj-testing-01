package com.example.rbac.products.controller;

import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.products.dto.ProductReviewDto;
import com.example.rbac.products.dto.ProductReviewRequest;
import com.example.rbac.products.service.ProductReviewService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/product-reviews")
public class ProductReviewController {

    private final ProductReviewService productReviewService;

    public ProductReviewController(ProductReviewService productReviewService) {
        this.productReviewService = productReviewService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('PRODUCT_VIEW')")
    public PageResponse<ProductReviewDto> list(@RequestParam(name = "page", defaultValue = "0") Integer page,
                                               @RequestParam(name = "size", defaultValue = "20") Integer size,
                                               @RequestParam(name = "productId", required = false) Long productId,
                                               @RequestParam(name = "categoryId", required = false) Long categoryId,
                                               @RequestParam(name = "customerId", required = false) Long customerId,
                                               @RequestParam(name = "ratingMin", required = false) Integer ratingMin,
                                               @RequestParam(name = "ratingMax", required = false) Integer ratingMax) {
        return productReviewService.list(page, size, productId, categoryId, customerId, ratingMin, ratingMax);
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('PRODUCT_CREATE', 'PRODUCT_UPDATE')")
    public ProductReviewDto create(@Valid @RequestBody ProductReviewRequest request) {
        return productReviewService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('PRODUCT_CREATE', 'PRODUCT_UPDATE')")
    public ProductReviewDto update(@PathVariable("id") Long id, @Valid @RequestBody ProductReviewRequest request) {
        return productReviewService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('PRODUCT_CREATE', 'PRODUCT_UPDATE', 'PRODUCT_DELETE')")
    public void delete(@PathVariable("id") Long id) {
        productReviewService.delete(id);
    }
}
