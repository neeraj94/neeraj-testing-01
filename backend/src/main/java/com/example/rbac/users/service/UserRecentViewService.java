package com.example.rbac.users.service;

import com.example.rbac.common.exception.ApiException;
import com.example.rbac.products.model.DiscountType;
import com.example.rbac.products.model.MediaAsset;
import com.example.rbac.products.model.Product;
import com.example.rbac.products.model.ProductGalleryImage;
import com.example.rbac.products.model.ProductVariant;
import com.example.rbac.products.repository.ProductRepository;
import com.example.rbac.users.dto.UserRecentViewDto;
import com.example.rbac.users.model.User;
import com.example.rbac.users.model.UserRecentView;
import com.example.rbac.users.repository.UserRecentViewRepository;
import org.hibernate.Hibernate;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UserRecentViewService {

    private static final int MAX_RECENTS = 20;
    private static final int RESPONSE_LIMIT = 10;

    private final UserRecentViewRepository recentViewRepository;
    private final ProductRepository productRepository;

    public UserRecentViewService(UserRecentViewRepository recentViewRepository,
                                 ProductRepository productRepository) {
        this.recentViewRepository = recentViewRepository;
        this.productRepository = productRepository;
    }

    @Transactional
    public void recordView(User user, Product product) {
        if (user == null || user.getId() == null || product == null || product.getId() == null) {
            return;
        }
        Optional<UserRecentView> existing = recentViewRepository.findByUserIdAndProductId(user.getId(), product.getId());
        UserRecentView entry = existing.orElseGet(UserRecentView::new);
        entry.setUser(user);
        entry.setProduct(product);
        entry.setViewedAt(Instant.now());
        recentViewRepository.save(entry);
        pruneExcessEntries(user.getId());
    }

    @Transactional(readOnly = true)
    public List<Product> findRecentProductsForUser(Long userId, Long excludeProductId) {
        if (userId == null) {
            return List.of();
        }
        List<UserRecentView> entries = recentViewRepository.findTop20ByUserIdOrderByViewedAtDesc(userId);
        return entries.stream()
                .map(UserRecentView::getProduct)
                .filter(Objects::nonNull)
                .filter(product -> !Objects.equals(product.getId(), excludeProductId))
                .distinct()
                .limit(RESPONSE_LIMIT)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Product> findRecentProductsForGuest(List<Long> productIds, Long excludeProductId) {
        List<Long> sanitized = sanitizeRecentProductIds(productIds, excludeProductId);
        if (sanitized.isEmpty()) {
            return List.of();
        }
        List<Long> limited = sanitized.stream().limit(RESPONSE_LIMIT).collect(Collectors.toList());
        List<Product> products = productRepository.findByIdIn(limited);
        Map<Long, Product> byId = products.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(Product::getId, product -> product));
        List<Product> ordered = new ArrayList<>();
        for (Long id : limited) {
            Product product = byId.get(id);
            if (product != null) {
                ordered.add(product);
            }
        }
        return ordered;
    }

    @Transactional
    public void synchronizeGuestRecentViews(User user, List<Long> productIds, Long excludeProductId) {
        if (user == null || user.getId() == null) {
            return;
        }
        List<Long> sanitized = sanitizeRecentProductIds(productIds, excludeProductId);
        if (sanitized.isEmpty()) {
            return;
        }
        List<UserRecentView> existingEntries = recentViewRepository.findByUserIdAndProductIdIn(user.getId(), sanitized);
        Map<Long, UserRecentView> existingByProductId = existingEntries.stream()
                .filter(entry -> entry.getProduct() != null && entry.getProduct().getId() != null)
                .collect(Collectors.toMap(entry -> entry.getProduct().getId(), entry -> entry));
        List<Product> products = productRepository.findByIdIn(sanitized);
        Map<Long, Product> productsById = products.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(Product::getId, product -> product));
        Instant baseTime = Instant.now();
        for (int index = 0; index < sanitized.size(); index++) {
            Long productId = sanitized.get(index);
            Product product = productsById.get(productId);
            if (product == null) {
                continue;
            }
            UserRecentView entry = existingByProductId.get(productId);
            if (entry == null) {
                entry = new UserRecentView();
            }
            entry.setUser(user);
            entry.setProduct(product);
            entry.setViewedAt(baseTime.minusSeconds(index + 1L));
            recentViewRepository.save(entry);
        }
        pruneExcessEntries(user.getId());
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('USER_VIEW','USER_VIEW_GLOBAL','USER_VIEW_OWN')")
    public List<UserRecentViewDto> getRecentViewsForUser(Long userId) {
        if (userId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "User id is required");
        }
        List<UserRecentView> entries = recentViewRepository.findTop20ByUserIdOrderByViewedAtDesc(userId);
        List<Long> productIds = entries.stream()
                .map(UserRecentView::getProduct)
                .filter(Objects::nonNull)
                .map(Product::getId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());

        Map<Long, Product> productsById = productIds.isEmpty()
                ? Collections.emptyMap()
                : productRepository.findByIdIn(productIds).stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(Product::getId, product -> product, (existing, replacement) -> existing));

        Set<Long> emittedProductIds = new LinkedHashSet<>();
        List<UserRecentViewDto> result = new ArrayList<>();
        for (UserRecentView entry : entries) {
            Product productRef = entry.getProduct();
            Long productId = productRef != null ? productRef.getId() : null;
            if (productId == null) {
                continue;
            }
            if (!emittedProductIds.add(productId)) {
                continue;
            }
            Product product = productsById.getOrDefault(productId, productRef);
            if (product == null) {
                continue;
            }
            Hibernate.initialize(product);
            initializeRecommendationAssociations(product);
            UserRecentViewDto dto = new UserRecentViewDto();
            dto.setProductId(product.getId());
            dto.setProductName(product.getName());
            dto.setProductSlug(product.getSlug());
            dto.setThumbnailUrl(resolveThumbnailUrl(product, null));
            dto.setSku(product.getSku());
            dto.setLastViewedAt(entry.getViewedAt());
            dto.setUnitPrice(product.getUnitPrice());
            dto.setFinalPrice(computeFinalPrice(product));
            result.add(dto);
            if (result.size() >= RESPONSE_LIMIT) {
                break;
            }
        }
        return result;
    }

    private void pruneExcessEntries(Long userId) {
        List<UserRecentView> entries = recentViewRepository.findByUserIdOrderByViewedAtDesc(userId);
        if (entries.size() <= MAX_RECENTS) {
            return;
        }
        for (int index = MAX_RECENTS; index < entries.size(); index++) {
            recentViewRepository.delete(entries.get(index));
        }
    }

    private List<Long> sanitizeRecentProductIds(Collection<Long> productIds, Long excludeProductId) {
        if (CollectionUtils.isEmpty(productIds)) {
            return List.of();
        }
        return productIds.stream()
                .filter(Objects::nonNull)
                .map(Math::abs)
                .filter(id -> !Objects.equals(id, excludeProductId))
                .distinct()
                .limit(MAX_RECENTS)
                .collect(Collectors.toList());
    }

    private void initializeRecommendationAssociations(Product product) {
        Hibernate.initialize(product.getGalleryImages());
        Hibernate.initialize(product.getVariants());
        if (product.getVariants() != null) {
            product.getVariants().forEach(variant -> Hibernate.initialize(variant.getMedia()));
        }
    }

    private String resolveThumbnailUrl(Product product, ProductVariant variant) {
        if (variant != null && variant.getMedia() != null) {
            return variant.getMedia().stream()
                    .map(media -> media.getMedia())
                    .filter(Objects::nonNull)
                    .map(MediaAsset::getUrl)
                    .filter(url -> url != null && !url.isBlank())
                    .findFirst()
                    .orElse(null);
        }
        if (product.getThumbnail() != null && product.getThumbnail().getUrl() != null
                && !product.getThumbnail().getUrl().isBlank()) {
            return product.getThumbnail().getUrl();
        }
        if (product.getGalleryImages() != null) {
            return product.getGalleryImages().stream()
                    .map(ProductGalleryImage::getMedia)
                    .filter(Objects::nonNull)
                    .map(MediaAsset::getUrl)
                    .filter(url -> url != null && !url.isBlank())
                    .findFirst()
                    .orElse(null);
        }
        return null;
    }

    private BigDecimal computeFinalPrice(Product product) {
        BigDecimal unitPrice = Optional.ofNullable(product.getUnitPrice()).orElse(BigDecimal.ZERO);
        BigDecimal finalPrice = unitPrice;
        if (product.getDiscountType() != null && product.getDiscountValue() != null) {
            if (product.getDiscountType() == DiscountType.FLAT) {
                finalPrice = unitPrice.subtract(product.getDiscountValue());
            } else if (product.getDiscountType() == DiscountType.PERCENTAGE) {
                BigDecimal percentage = product.getDiscountValue().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
                finalPrice = unitPrice.subtract(unitPrice.multiply(percentage));
            }
        }
        if (finalPrice.compareTo(BigDecimal.ZERO) < 0) {
            finalPrice = BigDecimal.ZERO;
        }
        return finalPrice.setScale(2, RoundingMode.HALF_UP);
    }
}
