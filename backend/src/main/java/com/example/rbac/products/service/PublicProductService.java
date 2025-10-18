package com.example.rbac.products.service;

import com.example.rbac.common.exception.ApiException;
import com.example.rbac.coupons.model.Coupon;
import com.example.rbac.coupons.repository.CouponRepository;
import com.example.rbac.products.dto.storefront.PublicProductDetailDto;
import com.example.rbac.products.dto.storefront.PublicProductSearchCriteria;
import com.example.rbac.products.dto.storefront.PublicProductSearchResponse;
import com.example.rbac.products.mapper.PublicProductMapper;
import com.example.rbac.products.model.Product;
import com.example.rbac.products.model.ProductReview;
import com.example.rbac.products.repository.ProductRepository;
import com.example.rbac.products.repository.ProductReviewRepository;
import com.example.rbac.products.repository.PublicProductSearchRepository;
import com.example.rbac.users.model.User;
import com.example.rbac.users.model.UserPrincipal;
import com.example.rbac.users.service.UserRecentViewService;
import org.hibernate.Hibernate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class PublicProductService {

    private final ProductRepository productRepository;
    private final ProductReviewRepository productReviewRepository;
    private final CouponRepository couponRepository;
    private final PublicProductMapper publicProductMapper;
    private final UserRecentViewService userRecentViewService;
    private final PublicProductSearchRepository publicProductSearchRepository;

    public PublicProductService(ProductRepository productRepository,
                                ProductReviewRepository productReviewRepository,
                                CouponRepository couponRepository,
                                PublicProductMapper publicProductMapper,
                                UserRecentViewService userRecentViewService,
                                PublicProductSearchRepository publicProductSearchRepository) {
        this.productRepository = productRepository;
        this.productReviewRepository = productReviewRepository;
        this.couponRepository = couponRepository;
        this.publicProductMapper = publicProductMapper;
        this.userRecentViewService = userRecentViewService;
        this.publicProductSearchRepository = publicProductSearchRepository;
    }

    @Transactional(readOnly = true)
    public PublicProductSearchResponse searchProducts(PublicProductSearchCriteria criteria) {
        return publicProductSearchRepository.search(criteria);
    }

    @Transactional(readOnly = true)
    public PublicProductDetailDto getBySlug(String slug, UserPrincipal principal, List<Long> guestRecentProductIds) {
        Product product = productRepository.findDetailedBySlugIgnoreCase(slug)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
        initializeAssociations(product);
        List<ProductReview> reviews = productReviewRepository.findByProductIdAndPublishedTrueOrderByReviewedAtDesc(product.getId());
        Instant now = Instant.now();
        List<Coupon> productCoupons = couponRepository.findActiveProductCoupons(product.getId(), now);
        List<Long> categoryIds = product.getCategories() == null ? List.of()
                : product.getCategories().stream()
                .filter(Objects::nonNull)
                .map(category -> category.getId())
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        List<Coupon> categoryCoupons = categoryIds.isEmpty()
                ? List.of()
                : couponRepository.findActiveCategoryCoupons(categoryIds, now);
        List<Coupon> coupons = mergeCoupons(productCoupons, categoryCoupons);
        List<Product> recentProducts = resolveRecentlyViewedProducts(principal, guestRecentProductIds, product);
        return publicProductMapper.toDetail(product, reviews, coupons, recentProducts);
    }

    private void initializeAssociations(Product product) {
        Hibernate.initialize(product.getCategories());
        Hibernate.initialize(product.getAttributeValues());
        if (product.getAttributeValues() != null) {
            product.getAttributeValues().forEach(value -> {
                if (value != null) {
                    Hibernate.initialize(value.getAttribute());
                }
            });
        }
        Hibernate.initialize(product.getGalleryImages());
        Hibernate.initialize(product.getVariants());
        if (product.getVariants() != null) {
            product.getVariants().forEach(variant -> {
                Hibernate.initialize(variant.getValues());
                if (variant.getValues() != null) {
                    variant.getValues().forEach(variantValue -> {
                        if (variantValue != null && variantValue.getAttributeValue() != null) {
                            Hibernate.initialize(variantValue.getAttributeValue());
                            if (variantValue.getAttributeValue().getAttribute() != null) {
                                Hibernate.initialize(variantValue.getAttributeValue().getAttribute());
                            }
                        }
                    });
                }
                Hibernate.initialize(variant.getMedia());
            });
        }
        Hibernate.initialize(product.getExpandableSections());
        Hibernate.initialize(product.getInfoSections());
        Hibernate.initialize(product.getFrequentlyBoughtProducts());
    }

    private List<Product> resolveRecentlyViewedProducts(UserPrincipal principal,
                                                        List<Long> guestRecentProductIds,
                                                        Product currentProduct) {
        User viewer = principal != null ? principal.getUser() : null;
        List<Product> recentProducts;
        if (viewer != null && viewer.getId() != null && hasAuthority(principal, "CUSTOMER_RECENTLY_VIEWED")) {
            userRecentViewService.synchronizeGuestRecentViews(viewer, guestRecentProductIds, currentProduct.getId());
            userRecentViewService.recordView(viewer, currentProduct);
            recentProducts = userRecentViewService.findRecentProductsForUser(viewer.getId(), currentProduct.getId());
        } else {
            List<Long> guestIds = guestRecentProductIds == null ? List.of() : guestRecentProductIds;
            recentProducts = userRecentViewService.findRecentProductsForGuest(guestIds, currentProduct.getId());
        }
        recentProducts.forEach(this::initializeRecommendationAssociations);
        return recentProducts;
    }

    private boolean hasAuthority(UserPrincipal principal, String authority) {
        if (principal == null || authority == null) {
            return false;
        }
        return principal.getAuthorities().stream()
                .anyMatch(granted -> authority.equalsIgnoreCase(granted.getAuthority()));
    }

    private void initializeRecommendationAssociations(Product product) {
        Hibernate.initialize(product.getGalleryImages());
        Hibernate.initialize(product.getVariants());
        if (product.getVariants() != null) {
            product.getVariants().forEach(variant -> Hibernate.initialize(variant.getMedia()));
        }
    }

    private List<Coupon> mergeCoupons(List<Coupon> productCoupons, List<Coupon> categoryCoupons) {
        Map<Long, Coupon> unique = new LinkedHashMap<>();
        Stream.concat(productCoupons.stream(), categoryCoupons.stream())
                .filter(Objects::nonNull)
                .forEach(coupon -> unique.putIfAbsent(coupon.getId(), coupon));
        return new ArrayList<>(unique.values());
    }
}
