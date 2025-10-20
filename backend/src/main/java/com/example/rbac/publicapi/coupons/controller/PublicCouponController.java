package com.example.rbac.publicapi.coupons.controller;

import com.example.rbac.common.pagination.PageResponse;
import com.example.rbac.admin.coupons.dto.PublicCouponDto;
import com.example.rbac.admin.coupons.model.CouponType;
import com.example.rbac.admin.coupons.service.CouponService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/coupons")
public class PublicCouponController {

    private final CouponService couponService;

    public PublicCouponController(CouponService couponService) {
        this.couponService = couponService;
    }

    @GetMapping
    public PageResponse<PublicCouponDto> list(@RequestParam(name = "page", defaultValue = "0") int page,
                                              @RequestParam(name = "size", defaultValue = "12") int size,
                                              @RequestParam(name = "type", required = false) CouponType type,
                                              @RequestParam(name = "search", required = false) String search) {
        return couponService.listPublic(page, size, type, search);
    }
}
