package com.example.rbac.brands.controller;

import com.example.rbac.brands.dto.BrandDto;
import com.example.rbac.brands.dto.BrandRequest;
import com.example.rbac.brands.service.BrandService;
import com.example.rbac.common.pagination.PageResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/brands")
public class BrandController {

    private final BrandService brandService;

    public BrandController(BrandService brandService) {
        this.brandService = brandService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BRAND_VIEW')")
    public PageResponse<BrandDto> list(@RequestParam(name = "page", defaultValue = "0") int page,
                                       @RequestParam(name = "size", defaultValue = "20") int size,
                                       @RequestParam(name = "search", required = false) String search) {
        return brandService.list(page, size, search);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('BRAND_VIEW')")
    public BrandDto get(@PathVariable("id") Long id) {
        return brandService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('BRAND_CREATE')")
    public BrandDto create(@Valid @RequestBody BrandRequest request) {
        return brandService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('BRAND_UPDATE')")
    public BrandDto update(@PathVariable("id") Long id, @Valid @RequestBody BrandRequest request) {
        return brandService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('BRAND_DELETE')")
    public void delete(@PathVariable("id") Long id) {
        brandService.delete(id);
    }
}
