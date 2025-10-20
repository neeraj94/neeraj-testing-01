package com.example.rbac.admin.coupons.controller;

import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.coupons.dto.*;
import com.example.rbac.coupons.model.CouponType;
import com.example.rbac.coupons.service.CouponService;
import com.example.rbac.products.model.DiscountType;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/coupons")
public class CouponController {

    private final CouponService couponService;

    public CouponController(CouponService couponService) {
        this.couponService = couponService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('COUPON_VIEW_GLOBAL')")
    public PageResponse<CouponSummaryDto> list(@RequestParam(name = "page", defaultValue = "0") int page,
                                               @RequestParam(name = "size", defaultValue = "20") int size,
                                               @RequestParam(name = "type", required = false) CouponType type,
                                               @RequestParam(name = "state", required = false) CouponState state,
                                               @RequestParam(name = "discountType", required = false) DiscountType discountType,
                                               @RequestParam(name = "search", required = false) String search) {
        return couponService.list(page, size, type, state, discountType, search);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('COUPON_VIEW_GLOBAL')")
    public CouponDetailDto get(@PathVariable("id") Long id) {
        return couponService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('COUPON_CREATE')")
    public CouponDetailDto create(@Valid @RequestBody CouponRequest request) {
        return couponService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('COUPON_UPDATE')")
    public CouponDetailDto update(@PathVariable("id") Long id, @Valid @RequestBody CouponRequest request) {
        return couponService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('COUPON_DELETE')")
    public void delete(@PathVariable("id") Long id) {
        couponService.delete(id);
    }

    @GetMapping("/reference/products")
    @PreAuthorize("hasAuthority('COUPON_VIEW_GLOBAL')")
    public List<CouponProductDto> productOptions(@RequestParam(name = "search", required = false) String search,
                                                 @RequestParam(name = "size", defaultValue = "25") int size) {
        return couponService.findProductOptions(search, size);
    }

    @GetMapping("/reference/categories")
    @PreAuthorize("hasAuthority('COUPON_VIEW_GLOBAL')")
    public List<CouponCategoryDto> categoryOptions(@RequestParam(name = "search", required = false) String search,
                                                   @RequestParam(name = "size", defaultValue = "25") int size) {
        return couponService.findCategoryOptions(search, size);
    }

    @GetMapping("/reference/users")
    @PreAuthorize("hasAuthority('COUPON_VIEW_GLOBAL')")
    public List<CouponUserDto> userOptions(@RequestParam(name = "search", required = false) String search,
                                           @RequestParam(name = "size", defaultValue = "25") int size) {
        return couponService.findUserOptions(search, size);
    }
}
