package com.example.rbac.products.service;

import com.example.rbac.common.exception.ApiException;
import com.example.rbac.coupons.model.Coupon;
import com.example.rbac.coupons.repository.CouponRepository;
import com.example.rbac.products.dto.storefront.PublicProductDetailDto;
import com.example.rbac.products.mapper.PublicProductMapper;
import com.example.rbac.products.model.Product;
import com.example.rbac.products.model.ProductReview;
import com.example.rbac.products.repository.ProductRepository;
import com.example.rbac.products.repository.ProductReviewRepository;
import com.example.rbac.wedges.model.Wedge;
import com.example.rbac.wedges.repository.WedgeRepository;
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
    private final WedgeRepository wedgeRepository;
    private final PublicProductMapper publicProductMapper;

    public PublicProductService(ProductRepository productRepository,
                                ProductReviewRepository productReviewRepository,
                                CouponRepository couponRepository,
                                WedgeRepository wedgeRepository,
                                PublicProductMapper publicProductMapper) {
        this.productRepository = productRepository;
        this.productReviewRepository = productReviewRepository;
        this.couponRepository = couponRepository;
        this.wedgeRepository = wedgeRepository;
        this.publicProductMapper = publicProductMapper;
    }

    @Transactional(readOnly = true)
    public PublicProductDetailDto getBySlug(String slug) {
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
        List<Wedge> wedges = wedgeRepository.findByCategory_NameIgnoreCaseOrderByNameAsc("Product Description Wedges");
        return publicProductMapper.toDetail(product, reviews, coupons, wedges, List.of());
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

    private List<Coupon> mergeCoupons(List<Coupon> productCoupons, List<Coupon> categoryCoupons) {
        Map<Long, Coupon> unique = new LinkedHashMap<>();
        Stream.concat(productCoupons.stream(), categoryCoupons.stream())
                .filter(Objects::nonNull)
                .forEach(coupon -> unique.putIfAbsent(coupon.getId(), coupon));
        return new ArrayList<>(unique.values());
    }
}
