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
import com.example.rbac.wedges.model.Wedge;
import com.example.rbac.wedges.repository.WedgeRepository;
import com.example.rbac.users.model.User;
import com.example.rbac.users.model.UserPrincipal;
import com.example.rbac.users.service.UserRecentViewService;
import org.hibernate.Hibernate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class PublicProductService {

    private static final Logger log = LoggerFactory.getLogger(PublicProductService.class);

    private final ProductRepository productRepository;
    private final ProductReviewRepository productReviewRepository;
    private final CouponRepository couponRepository;
    private final WedgeRepository wedgeRepository;
    private final PublicProductMapper publicProductMapper;
    private final UserRecentViewService userRecentViewService;
    private final PublicProductSearchRepository publicProductSearchRepository;

    public PublicProductService(ProductRepository productRepository,
                                ProductReviewRepository productReviewRepository,
                                CouponRepository couponRepository,
                                WedgeRepository wedgeRepository,
                                PublicProductMapper publicProductMapper,
                                UserRecentViewService userRecentViewService,
                                PublicProductSearchRepository publicProductSearchRepository) {
        this.productRepository = productRepository;
        this.productReviewRepository = productReviewRepository;
        this.couponRepository = couponRepository;
        this.wedgeRepository = wedgeRepository;
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
        List<Wedge> wedges = fetchWedgesSafely();
        List<Product> recentProducts = resolveRecentlyViewedProducts(principal, guestRecentProductIds, product);
        return publicProductMapper.toDetail(product, reviews, coupons, wedges, recentProducts);
    }

    private List<Wedge> fetchWedgesSafely() {
        try {
            return wedgeRepository.findByCategory_NameIgnoreCaseOrderByNameAsc("Product Description Wedges");
        } catch (DataAccessException ex) {
            if (isMissingWedgeTable(ex)) {
                log.warn("Wedge lookup skipped because the wedges table is missing. Returning an empty list until migrations run.");
                return Collections.emptyList();
            }
            throw ex;
        }
    }

    private boolean isMissingWedgeTable(Throwable ex) {
        Throwable cursor = ex;
        while (cursor != null) {
            if (cursor instanceof SQLException sqlException) {
                String message = sqlException.getMessage();
                String state = sqlException.getSQLState();
                if ((state != null && state.equalsIgnoreCase("42S02"))
                        || (message != null && message.toLowerCase().contains("doesn't exist"))) {
                    return true;
                }
            }
            cursor = cursor.getCause();
        }
        return false;
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
        if (viewer != null && viewer.getId() != null) {
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
