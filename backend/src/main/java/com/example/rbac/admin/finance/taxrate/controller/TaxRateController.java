package com.example.rbac.admin.finance.taxrate.controller;

import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.admin.finance.taxrate.dto.TaxRateDto;
import com.example.rbac.admin.finance.taxrate.dto.TaxRateRequest;
import com.example.rbac.admin.finance.taxrate.service.TaxRateService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/tax-rates")
public class TaxRateController {

    private final TaxRateService taxRateService;

    public TaxRateController(TaxRateService taxRateService) {
        this.taxRateService = taxRateService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('TAX_RATE_VIEW')")
    public PageResponse<TaxRateDto> list(@RequestParam(name = "page", defaultValue = "0") int page,
                                         @RequestParam(name = "size", defaultValue = "20") int size,
                                         @RequestParam(name = "search", required = false) String search) {
        return taxRateService.list(page, size, search);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('TAX_RATE_VIEW')")
    public TaxRateDto get(@PathVariable("id") Long id) {
        return taxRateService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('TAX_RATE_CREATE')")
    public TaxRateDto create(@Valid @RequestBody TaxRateRequest request) {
        return taxRateService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('TAX_RATE_UPDATE')")
    public TaxRateDto update(@PathVariable("id") Long id, @Valid @RequestBody TaxRateRequest request) {
        return taxRateService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('TAX_RATE_DELETE')")
    public void delete(@PathVariable("id") Long id) {
        taxRateService.delete(id);
    }
}
