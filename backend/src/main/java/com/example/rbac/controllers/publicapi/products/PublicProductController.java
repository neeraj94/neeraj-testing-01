package com.example.rbac.controllers.publicapi.products;

import com.example.rbac.common.exception.ApiException;
import com.example.rbac.products.dto.storefront.PublicProductAvailability;
import com.example.rbac.products.dto.storefront.PublicProductDetailDto;
import com.example.rbac.products.dto.storefront.PublicProductSearchCriteria;
import com.example.rbac.products.dto.storefront.PublicProductSearchResponse;
import com.example.rbac.products.dto.storefront.PublicProductSort;
import com.example.rbac.products.service.PublicProductService;
import com.example.rbac.users.model.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/publicapi/products")
public class PublicProductController {

    private final PublicProductService publicProductService;

    public PublicProductController(PublicProductService publicProductService) {
        this.publicProductService = publicProductService;
    }

    @GetMapping
    public PublicProductSearchResponse searchProducts(@RequestParam(value = "page", defaultValue = "0") int page,
                                                      @RequestParam(value = "size", defaultValue = "12") int size,
                                                      @RequestParam(value = "categories", required = false) String categories,
                                                      @RequestParam(value = "brands", required = false) String brands,
                                                      @RequestParam(value = "min_price", required = false) String minPriceParam,
                                                      @RequestParam(value = "max_price", required = false) String maxPriceParam,
                                                      @RequestParam(value = "rating", required = false) String ratingParam,
                                                      @RequestParam(value = "availability", required = false) String availabilityParam,
                                                      @RequestParam(value = "sort", required = false) String sortParam) {
        PublicProductSearchCriteria criteria = new PublicProductSearchCriteria();
        criteria.setPage(Math.max(page, 0));
        int safeSize = Math.max(1, Math.min(size, 60));
        criteria.setSize(safeSize);
        criteria.setCategorySlugs(parseStringList(categories));
        criteria.setBrandSlugs(parseStringList(brands));
        BigDecimal minPrice = parseDecimal(minPriceParam);
        BigDecimal maxPrice = parseDecimal(maxPriceParam);
        criteria.setMinimumPrice(minPrice);
        criteria.setMaximumPrice(maxPrice);
        Integer minimumRating = parseInteger(ratingParam);
        if (minimumRating != null) {
            if (minimumRating < 0) {
                minimumRating = 0;
            } else if (minimumRating > 5) {
                minimumRating = 5;
            }
        }
        criteria.setMinimumRating(minimumRating);
        criteria.setAvailability(parseAvailability(availabilityParam));
        criteria.setSort(PublicProductSort.fromKey(sortParam));
        return publicProductService.searchProducts(criteria);
    }

    @GetMapping("/{slug}")
    public PublicProductDetailDto getBySlug(@PathVariable String slug,
                                            @AuthenticationPrincipal UserPrincipal principal,
                                            @RequestParam(name = "recent", required = false) String recentParam) {
        List<Long> guestRecentIds = parseRecentParam(recentParam);
        return publicProductService.getBySlug(slug, principal, guestRecentIds);
    }

    private List<String> parseStringList(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(segment -> !segment.isEmpty())
                .collect(Collectors.toList());
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

    private BigDecimal parseDecimal(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(value.trim());
        } catch (NumberFormatException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid price value: " + value);
        }
    }

    private Integer parseInteger(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid numeric value: " + value);
        }
    }

    private PublicProductAvailability parseAvailability(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase();
        for (PublicProductAvailability option : PublicProductAvailability.values()) {
            if (option.name().equals(normalized)) {
                return option;
            }
        }
        return null;
    }
}
