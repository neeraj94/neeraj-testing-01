package com.example.rbac.shipping.controller;

import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.shipping.dto.ShippingAreaRateDto;
import com.example.rbac.shipping.dto.ShippingAreaRateRequest;
import com.example.rbac.shipping.service.ShippingAreaRateService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/shipping/area-rates")
public class ShippingAreaRateController {

    private final ShippingAreaRateService shippingAreaRateService;

    public ShippingAreaRateController(ShippingAreaRateService shippingAreaRateService) {
        this.shippingAreaRateService = shippingAreaRateService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('SHIPPING_AREA_VIEW')")
    public PageResponse<ShippingAreaRateDto> list(@RequestParam(defaultValue = "0") int page,
                                                  @RequestParam(defaultValue = "10") int size,
                                                  @RequestParam(required = false) String search) {
        return shippingAreaRateService.list(page, size, search);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('SHIPPING_AREA_VIEW')")
    public ShippingAreaRateDto get(@PathVariable Long id) {
        return shippingAreaRateService.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('SHIPPING_AREA_CREATE')")
    public ShippingAreaRateDto create(@RequestBody ShippingAreaRateRequest request) {
        return shippingAreaRateService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('SHIPPING_AREA_UPDATE')")
    public ShippingAreaRateDto update(@PathVariable Long id, @RequestBody ShippingAreaRateRequest request) {
        return shippingAreaRateService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('SHIPPING_AREA_DELETE')")
    public void delete(@PathVariable Long id) {
        shippingAreaRateService.delete(id);
    }
}
