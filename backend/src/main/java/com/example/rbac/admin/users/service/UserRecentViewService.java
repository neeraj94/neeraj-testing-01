package com.example.rbac.admin.users.service;

import com.example.rbac.common.exception.ApiException;
import com.example.rbac.admin.products.model.DiscountType;
import com.example.rbac.admin.products.model.MediaAsset;
import com.example.rbac.admin.products.model.Product;
import com.example.rbac.admin.products.model.ProductGalleryImage;
import com.example.rbac.admin.products.model.ProductVariant;
import com.example.rbac.admin.products.repository.ProductRepository;
import com.example.rbac.admin.users.dto.UserRecentViewDto;
import com.example.rbac.admin.users.model.User;
import com.example.rbac.admin.users.model.UserRecentView;
import com.example.rbac.admin.users.repository.UserRecentViewRepository;
import com.example.rbac.admin.users.repository.projection.UserRecentViewSummary;
import jakarta.persistence.EntityNotFoundException;
import org.hibernate.proxy.HibernateProxy;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
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

    @Transactional
    public List<Product> findRecentProductsForUser(Long userId, Long excludeProductId) {
        if (userId == null) {
            return List.of();
        }
        List<UserRecentViewSummary> summaries = recentViewRepository.findRecentSummariesByUserId(userId);
        LinkedHashSet<Long> orderedProductIds = new LinkedHashSet<>();
        List<Long> staleIds = new ArrayList<>();
        for (UserRecentViewSummary summary : summaries) {
            Long productId = summary.getProductId();
            if (productId == null) {
                staleIds.add(summary.getId());
                continue;
            }
            if (Objects.equals(productId, excludeProductId)) {
                continue;
            }
            orderedProductIds.add(productId);
        }
        if (!staleIds.isEmpty()) {
            recentViewRepository.deleteAllByIdInBatch(staleIds);
        }
        if (orderedProductIds.isEmpty()) {
            return List.of();
        }
        List<Product> orderedProducts = fetchProductsInOrder(new ArrayList<>(orderedProductIds));
        if (orderedProducts.size() <= RESPONSE_LIMIT) {
            return orderedProducts;
        }
        return new ArrayList<>(orderedProducts.subList(0, RESPONSE_LIMIT));
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
        Map<Long, UserRecentView> existingByProductId = new HashMap<>();
        for (UserRecentView entry : existingEntries) {
            Long productId = resolveProductId(entry);
            if (productId != null && !existingByProductId.containsKey(productId)) {
                existingByProductId.put(productId, entry);
            }
        }
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

    @Transactional
    public List<UserRecentViewDto> getRecentViewsForUser(Long userId) {
        if (userId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "User id is required");
        }
        List<UserRecentViewSummary> summaries = Optional.ofNullable(
                        recentViewRepository.findRecentSummariesByUserId(userId))
                .orElseGet(List::of);
        Map<Long, UserRecentViewSummary> dedupedByProduct = new LinkedHashMap<>();
        List<Long> staleIds = new ArrayList<>();
        for (UserRecentViewSummary summary : summaries) {
            Long productId = summary.getProductId();
            if (productId == null) {
                staleIds.add(summary.getId());
                continue;
            }
            dedupedByProduct.putIfAbsent(productId, summary);
        }
        if (dedupedByProduct.isEmpty()) {
            if (!staleIds.isEmpty()) {
                recentViewRepository.deleteAllByIdInBatch(staleIds);
            }
            return List.of();
        }

        List<Long> recentProductIds = new ArrayList<>(dedupedByProduct.keySet());
        List<Product> products = fetchProductsInOrder(recentProductIds);
        if (products.isEmpty()) {
            if (!staleIds.isEmpty()) {
                recentViewRepository.deleteAllByIdInBatch(staleIds);
            }
            return List.of();
        }

        LinkedHashSet<Long> availableProductIds = products.stream()
                .map(Product::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        for (Map.Entry<Long, UserRecentViewSummary> entry : dedupedByProduct.entrySet()) {
            Long productId = entry.getKey();
            if (productId == null || availableProductIds.contains(productId)) {
                continue;
            }
            staleIds.add(entry.getValue().getId());
        }

        List<UserRecentViewDto> result = new ArrayList<>();
        for (Product product : products) {
            if (product == null) {
                continue;
            }
            UserRecentViewSummary summary = dedupedByProduct.get(product.getId());
            if (summary == null) {
                continue;
            }
            UserRecentViewDto dto = new UserRecentViewDto();
            dto.setProductId(product.getId());
            dto.setProductName(product.getName());
            dto.setProductSlug(product.getSlug());
            dto.setThumbnailUrl(resolveThumbnailUrl(product, null));
            dto.setSku(product.getSku());
            dto.setLastViewedAt(summary.getViewedAt());
            dto.setUnitPrice(product.getUnitPrice());
            dto.setFinalPrice(computeFinalPrice(product));
            result.add(dto);
        }
        if (!staleIds.isEmpty()) {
            recentViewRepository.deleteAllByIdInBatch(staleIds);
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

    private Long resolveProductId(UserRecentView entry) {
        if (entry == null) {
            return null;
        }
        Long productId = entry.getProductId();
        if (productId != null) {
            return productId;
        }
        return resolveProductIdFromProduct(tryGetProduct(entry));
    }

    private Long resolveProductIdFromProduct(Product productRef) {
        if (productRef == null) {
            return null;
        }
        if (productRef instanceof HibernateProxy proxy) {
            Object identifier = proxy.getHibernateLazyInitializer().getIdentifier();
            if (identifier instanceof Long id) {
                return id;
            }
        }
        return productRef.getId();
    }

    private List<Product> fetchProductsInOrder(List<Long> productIds) {
        if (CollectionUtils.isEmpty(productIds)) {
            return List.of();
        }
        Map<Long, Product> productsById = productRepository.findByIdIn(productIds).stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(Product::getId, product -> product));
        List<Product> orderedProducts = new ArrayList<>();
        for (Long productId : productIds) {
            Product product = productsById.get(productId);
            if (product != null) {
                orderedProducts.add(product);
            }
        }
        return orderedProducts;
    }

    private Product tryGetProduct(UserRecentView entry) {
        if (entry == null) {
            return null;
        }
        try {
            return entry.getProduct();
        } catch (EntityNotFoundException ex) {
            return null;
        } catch (RuntimeException ex) {
            if (!isHibernateException(ex)) {
                throw ex;
            }
            return null;
        }
        return false;
    }

    private boolean isHibernateException(RuntimeException ex) {
        Throwable current = ex;
        while (current != null) {
            Package exceptionPackage = current.getClass().getPackage();
            if (exceptionPackage != null && exceptionPackage.getName().startsWith("org.hibernate")) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private boolean isHibernateException(RuntimeException ex) {
        Throwable current = ex;
        while (current != null) {
            Package exceptionPackage = current.getClass().getPackage();
            if (exceptionPackage != null && exceptionPackage.getName().startsWith("org.hibernate")) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private boolean isHibernateException(RuntimeException ex) {
        Throwable current = ex;
        while (current != null) {
            Package exceptionPackage = current.getClass().getPackage();
            if (exceptionPackage != null && exceptionPackage.getName().startsWith("org.hibernate")) {
                return true;
            }
            current = current.getCause();
        }
        return false;
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
