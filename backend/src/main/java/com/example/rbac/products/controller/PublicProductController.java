package com.example.rbac.products.controller;

import com.example.rbac.products.dto.storefront.PublicProductDetailDto;
import com.example.rbac.products.service.PublicProductService;
import com.example.rbac.users.model.UserPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/public/products")
public class PublicProductController {

    private final PublicProductService publicProductService;

    public PublicProductController(PublicProductService publicProductService) {
        this.publicProductService = publicProductService;
    }

    @GetMapping("/{slug}")
    public PublicProductDetailDto getBySlug(@PathVariable String slug,
                                            @AuthenticationPrincipal UserPrincipal principal,
                                            @RequestParam(name = "recent", required = false) String recentParam) {
        List<Long> guestRecentIds = parseRecentParam(recentParam);
        return publicProductService.getBySlug(slug, principal, guestRecentIds);
    }

    private List<Long> parseRecentParam(String recentParam) {
        if (recentParam == null || recentParam.isBlank()) {
            return List.of();
        }
        return Arrays.stream(recentParam.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .map(this::parseLongSafely)
                .filter(id -> id != null && id > 0)
                .collect(Collectors.toList());
    }

    private Long parseLongSafely(String value) {
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
