package com.example.rbac.products.mapper;

import com.example.rbac.categories.model.Category;
import com.example.rbac.coupons.model.Coupon;
import com.example.rbac.products.dto.MediaAssetDto;
import com.example.rbac.products.dto.storefront.*;
import com.example.rbac.products.model.DiscountType;
import com.example.rbac.products.model.MediaAsset;
import com.example.rbac.products.model.Product;
import com.example.rbac.products.model.ProductExpandableSection;
import com.example.rbac.products.model.ProductGalleryImage;
import com.example.rbac.products.model.ProductInfoSection;
import com.example.rbac.products.model.ProductReview;
import com.example.rbac.products.model.ProductVariant;
import com.example.rbac.products.model.ProductVariantMedia;
import com.example.rbac.products.model.ProductVariantValue;
import com.example.rbac.wedges.model.Wedge;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
public class PublicProductMapper {

    public PublicProductDetailDto toDetail(Product product,
                                           List<ProductReview> reviews,
                                           List<Coupon> coupons,
                                           List<Wedge> wedges,
                                           List<Product> recentlyViewed) {
        PublicProductDetailDto dto = new PublicProductDetailDto();
        dto.setId(product.getId());
        dto.setName(product.getName());
        dto.setSlug(product.getSlug());
        dto.setBrandName(product.getBrand() != null ? product.getBrand().getName() : null);
        dto.setShortDescription(product.getShortDescription());
        dto.setDescription(product.getDescription());
        dto.setGallery(mapGallery(product.getGalleryImages()));
        dto.setPrimaryImage(resolvePrimaryMedia(product));
        dto.setPricing(mapPricing(product));
        dto.setStock(mapStock(product));
        dto.setMinPurchaseQuantity(product.getMinPurchaseQuantity());
        dto.setMaxPurchaseQuantity(product.getDiscountMaxQuantity());
        dto.setSku(product.getSku());
        dto.setCategoryNames(product.getCategories() == null ? List.of() : product.getCategories().stream()
                .filter(Objects::nonNull)
                .map(Category::getName)
                .filter(StringUtils::hasText)
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .collect(Collectors.toList()));
        dto.setOffers(mapOffers(coupons));
        PublicProductPricingDto pricing = dto.getPricing();
        dto.setVariantAttributes(mapVariantAttributes(product));
        dto.setVariants(mapVariants(product, pricing != null ? pricing.getFinalPrice() : null));
        dto.setExpandableSections(mapExpandableSections(product.getExpandableSections()));
        dto.setInfoSections(mapInfoSections(product.getInfoSections()));
        dto.setReviewSummary(mapReviewSummary(reviews));
        dto.setReviews(mapReviews(reviews));
        dto.setWedges(mapWedges(wedges));
        dto.setFrequentlyBought(mapRecommendations(product.getFrequentlyBoughtProducts()));
        dto.setRecentlyViewed(mapRecommendations(recentlyViewed));
        return dto;
    }

    private List<PublicProductOfferDto> mapOffers(List<Coupon> coupons) {
        if (coupons == null || coupons.isEmpty()) {
            return List.of();
        }
        return coupons.stream()
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(Coupon::getEndDate))
                .map(coupon -> {
                    PublicProductOfferDto dto = new PublicProductOfferDto();
                    dto.setId(coupon.getId());
                    dto.setName(coupon.getName());
                    dto.setCode(coupon.getCode());
                    dto.setShortDescription(coupon.getShortDescription());
                    dto.setDiscountType(coupon.getDiscountType());
                    dto.setDiscountValue(coupon.getDiscountValue());
                    dto.setMinimumCartValue(coupon.getMinimumCartValue());
                    dto.setStartDate(coupon.getStartDate());
                    dto.setEndDate(coupon.getEndDate());
                    dto.setImageUrl(coupon.getImageUrl());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    private List<PublicProductVariantAttributeDto> mapVariantAttributes(Product product) {
        if (product.getVariants() == null || product.getVariants().isEmpty()) {
            return List.of();
        }
        Map<Long, PublicProductVariantAttributeDto> attributeMap = new LinkedHashMap<>();
        for (ProductVariant variant : product.getVariants()) {
            if (variant.getValues() == null) {
                continue;
            }
            for (ProductVariantValue value : variant.getValues()) {
                if (value.getAttributeValue() == null || value.getAttributeValue().getAttribute() == null) {
                    continue;
                }
                Long attributeId = value.getAttributeValue().getAttribute().getId();
                if (attributeId == null) {
                    continue;
                }
                PublicProductVariantAttributeDto attributeDto = attributeMap.computeIfAbsent(attributeId, id -> {
                    PublicProductVariantAttributeDto created = new PublicProductVariantAttributeDto();
                    created.setAttributeId(id);
                    created.setAttributeName(value.getAttributeValue().getAttribute().getName());
                    created.setDisplayType(resolveDisplayType(value.getAttributeValue().getAttribute().getName()));
                    created.setValues(new ArrayList<>());
                    return created;
                });
                if (attributeDto.getValues().stream().noneMatch(existing -> existing.getId().equals(value.getAttributeValue().getId()))) {
                    PublicProductVariantAttributeValueDto valueDto = new PublicProductVariantAttributeValueDto();
                    valueDto.setId(value.getAttributeValue().getId());
                    valueDto.setLabel(value.getAttributeValue().getValue());
                    valueDto.setSwatchColor(resolveSwatchColor(value.getAttributeValue().getValue()));
                    attributeDto.getValues().add(valueDto);
                }
            }
        }
        attributeMap.values().forEach(attribute -> attribute.setValues(attribute.getValues().stream()
                .sorted(Comparator.comparing(PublicProductVariantAttributeValueDto::getLabel, String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList())));
        return new ArrayList<>(attributeMap.values());
    }

    private String resolveDisplayType(String attributeName) {
        if (!StringUtils.hasText(attributeName)) {
            return "choice";
        }
        String lower = attributeName.toLowerCase(Locale.ROOT);
        if (lower.contains("color") || lower.contains("colour")) {
            return "swatch";
        }
        return "choice";
    }

    private String resolveSwatchColor(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.matches("#?[0-9a-fA-F]{6}")) {
            return trimmed.startsWith("#") ? trimmed : "#" + trimmed;
        }
        return null;
    }

    private List<PublicProductVariantDto> mapVariants(Product product, BigDecimal baseFinalPrice) {
        if (product.getVariants() == null || product.getVariants().isEmpty()) {
            return List.of();
        }
        BigDecimal safeBasePrice = Optional.ofNullable(baseFinalPrice).orElse(product.getUnitPrice());
        return product.getVariants().stream()
                .sorted(Comparator.comparing(variant -> variant.getDisplayOrder() != null ? variant.getDisplayOrder() : Integer.MAX_VALUE))
                .map(variant -> mapVariant(variant, product, safeBasePrice))
                .collect(Collectors.toList());
    }

    private PublicProductVariantDto mapVariant(ProductVariant variant, Product product, BigDecimal basePrice) {
        PublicProductVariantDto dto = new PublicProductVariantDto();
        dto.setId(variant.getId());
        dto.setKey(variant.getVariantKey());
        dto.setSku(variant.getSku());
        dto.setQuantity(variant.getQuantity());
        dto.setInStock(resolveVariantStock(variant, product));
        dto.setPriceAdjustment(variant.getPriceAdjustment());
        BigDecimal finalPrice = basePrice;
        if (variant.getPriceAdjustment() != null) {
            finalPrice = (finalPrice != null ? finalPrice : BigDecimal.ZERO).add(variant.getPriceAdjustment());
        }
        if (finalPrice != null && finalPrice.compareTo(BigDecimal.ZERO) < 0) {
            finalPrice = BigDecimal.ZERO;
        }
        dto.setFinalPrice(finalPrice);
        dto.setSelections(mapVariantSelections(variant));
        dto.setMedia(mapVariantMedia(variant.getMedia()));
        return dto;
    }

    private boolean resolveVariantStock(ProductVariant variant, Product product) {
        if (variant.getQuantity() != null) {
            return variant.getQuantity() > 0;
        }
        return product.getStockQuantity() == null || product.getStockQuantity() > 0;
    }

    private List<PublicProductVariantSelectionDto> mapVariantSelections(ProductVariant variant) {
        if (variant.getValues() == null || variant.getValues().isEmpty()) {
            return List.of();
        }
        return variant.getValues().stream()
                .filter(value -> value.getAttributeValue() != null && value.getAttributeValue().getAttribute() != null)
                .sorted(Comparator.comparing(value -> value.getPosition() != null ? value.getPosition() : Integer.MAX_VALUE))
                .map(value -> {
                    PublicProductVariantSelectionDto dto = new PublicProductVariantSelectionDto();
                    dto.setAttributeId(value.getAttributeValue().getAttribute().getId());
                    dto.setAttributeName(value.getAttributeValue().getAttribute().getName());
                    dto.setValueId(value.getAttributeValue().getId());
                    dto.setValue(value.getAttributeValue().getValue());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    private List<MediaAssetDto> mapVariantMedia(List<ProductVariantMedia> media) {
        if (media == null || media.isEmpty()) {
            return List.of();
        }
        return media.stream()
                .sorted(Comparator.comparing(item -> item.getDisplayOrder() != null ? item.getDisplayOrder() : Integer.MAX_VALUE))
                .map(ProductVariantMedia::getMedia)
                .map(this::mapMedia)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    private List<MediaAssetDto> mapGallery(List<ProductGalleryImage> galleryImages) {
        if (galleryImages == null || galleryImages.isEmpty()) {
            return List.of();
        }
        return galleryImages.stream()
                .sorted(Comparator.comparing(image -> image.getDisplayOrder() != null ? image.getDisplayOrder() : Integer.MAX_VALUE))
                .map(ProductGalleryImage::getMedia)
                .map(this::mapMedia)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    private MediaAssetDto resolvePrimaryMedia(Product product) {
        if (product.getThumbnail() != null && StringUtils.hasText(product.getThumbnail().getUrl())) {
            return mapMedia(product.getThumbnail());
        }
        return mapGallery(product.getGalleryImages()).stream().findFirst().orElse(null);
    }

    private MediaAssetDto mapMedia(MediaAsset asset) {
        if (asset == null || !StringUtils.hasText(asset.getUrl())) {
            return null;
        }
        MediaAssetDto dto = new MediaAssetDto();
        dto.setUrl(asset.getUrl());
        dto.setStorageKey(asset.getStorageKey());
        dto.setOriginalFilename(asset.getOriginalFilename());
        dto.setMimeType(asset.getMimeType());
        dto.setSizeBytes(asset.getSizeBytes());
        return dto;
    }

    private PublicProductPricingDto mapPricing(Product product) {
        PublicProductPricingDto dto = new PublicProductPricingDto();
        BigDecimal unitPrice = product.getUnitPrice();
        dto.setUnitPrice(unitPrice);
        dto.setDiscountType(product.getDiscountType());
        dto.setDiscountValue(product.getDiscountValue());
        BigDecimal discountAmount = computeDiscountAmount(unitPrice, product.getDiscountType(), product.getDiscountValue());
        dto.setDiscountAmount(discountAmount);
        dto.setFinalPrice(unitPrice != null && discountAmount != null ? unitPrice.subtract(discountAmount).max(BigDecimal.ZERO) : unitPrice);
        dto.setDiscountPercentage(computeDiscountPercentage(unitPrice, product.getDiscountType(), product.getDiscountValue()));
        return dto;
    }

    private BigDecimal computeDiscountAmount(BigDecimal unitPrice, DiscountType discountType, BigDecimal discountValue) {
        if (unitPrice == null || discountType == null || discountValue == null) {
            return BigDecimal.ZERO;
        }
        if (discountType == DiscountType.FLAT) {
            return discountValue.min(unitPrice);
        }
        return unitPrice.multiply(discountValue).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    private Integer computeDiscountPercentage(BigDecimal unitPrice, DiscountType discountType, BigDecimal discountValue) {
        if (unitPrice == null || unitPrice.compareTo(BigDecimal.ZERO) <= 0 || discountType == null || discountValue == null) {
            return null;
        }
        if (discountType == DiscountType.PERCENTAGE) {
            return discountValue.intValue();
        }
        BigDecimal percentage = discountValue.multiply(BigDecimal.valueOf(100)).divide(unitPrice, 0, RoundingMode.HALF_UP);
        return percentage.intValue();
    }

    private PublicProductStockDto mapStock(Product product) {
        PublicProductStockDto dto = new PublicProductStockDto();
        Integer stockQuantity = product.getStockQuantity();
        boolean inStock = stockQuantity == null || stockQuantity > 0;
        dto.setInStock(inStock);
        dto.setAvailableQuantity(stockQuantity);
        dto.setStatusLabel(inStock ? "In stock" : "Out of stock");
        return dto;
    }

    private List<PublicProductSectionDto> mapExpandableSections(List<ProductExpandableSection> sections) {
        if (sections == null || sections.isEmpty()) {
            return List.of();
        }
        return sections.stream()
                .map(section -> {
                    PublicProductSectionDto dto = new PublicProductSectionDto();
                    dto.setTitle(section.getTitle());
                    dto.setContent(section.getContent());
                    dto.setBulletPoints(List.of());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    private List<PublicProductSectionDto> mapInfoSections(List<ProductInfoSection> sections) {
        if (sections == null || sections.isEmpty()) {
            return List.of();
        }
        return sections.stream()
                .map(section -> {
                    PublicProductSectionDto dto = new PublicProductSectionDto();
                    dto.setTitle(section.getTitle());
                    dto.setContent(section.getContent());
                    dto.setBulletPoints(section.getBulletPoints() != null ? new ArrayList<>(section.getBulletPoints()) : List.of());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    private PublicProductReviewSummaryDto mapReviewSummary(List<ProductReview> reviews) {
        PublicProductReviewSummaryDto summary = new PublicProductReviewSummaryDto();
        if (reviews == null || reviews.isEmpty()) {
            summary.setAverageRating(0);
            summary.setTotalReviews(0);
            return summary;
        }
        double average = reviews.stream()
                .map(ProductReview::getRating)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0);
        summary.setAverageRating(Math.round(average * 10.0) / 10.0);
        summary.setTotalReviews((int) reviews.stream().filter(review -> review.getRating() != null).count());
        return summary;
    }

    private List<PublicProductReviewDto> mapReviews(List<ProductReview> reviews) {
        if (reviews == null || reviews.isEmpty()) {
            return List.of();
        }
        return reviews.stream()
                .sorted(Comparator.comparing(ProductReview::getReviewedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(review -> {
                    PublicProductReviewDto dto = new PublicProductReviewDto();
                    dto.setId(review.getId());
                    dto.setReviewerName(resolveReviewerName(review));
                    dto.setCustomerAddress(review.getCustomer() != null ? review.getCustomer().getAddress() : null);
                    dto.setRating(review.getRating());
                    dto.setComment(review.getComment());
                    dto.setReviewedAt(review.getReviewedAt());
                    dto.setReviewerAvatar(mapMedia(review.getReviewerAvatar()));
                    dto.setMedia(mapReviewMedia(review));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    private String resolveReviewerName(ProductReview review) {
        if (StringUtils.hasText(review.getReviewerName())) {
            return review.getReviewerName();
        }
        if (review.getCustomer() != null && StringUtils.hasText(review.getCustomer().getName())) {
            return review.getCustomer().getName();
        }
        return "Verified shopper";
    }

    private List<MediaAssetDto> mapReviewMedia(ProductReview review) {
        if (review.getMedia() == null || review.getMedia().isEmpty()) {
            return List.of();
        }
        return review.getMedia().stream()
                .map(this::mapMedia)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    private List<PublicProductWedgeDto> mapWedges(List<Wedge> wedges) {
        if (wedges == null || wedges.isEmpty()) {
            return List.of();
        }
        return wedges.stream()
                .filter(Objects::nonNull)
                .map(wedge -> {
                    PublicProductWedgeDto dto = new PublicProductWedgeDto();
                    dto.setId(wedge.getId());
                    dto.setName(wedge.getName());
                    dto.setIconUrl(wedge.getIconUrl());
                    dto.setShortDescription(wedge.getShortDescription());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    private List<PublicProductRecommendationDto> mapRecommendations(Iterable<Product> products) {
        if (products == null) {
            return List.of();
        }
        List<PublicProductRecommendationDto> recommendations = new ArrayList<>();
        for (Product product : products) {
            if (product != null) {
                recommendations.add(mapRecommendation(product));
            }
        }
        return recommendations;
    }

    private PublicProductRecommendationDto mapRecommendation(Product product) {
        PublicProductRecommendationDto dto = new PublicProductRecommendationDto();
        dto.setId(product.getId());
        dto.setName(product.getName());
        dto.setSlug(product.getSlug());
        MediaAssetDto media = resolvePrimaryMedia(product);
        dto.setImageUrl(media != null ? media.getUrl() : null);
        PublicProductPricingDto pricing = mapPricing(product);
        dto.setOriginalPrice(pricing.getUnitPrice());
        dto.setFinalPrice(pricing.getFinalPrice());
        return dto;
    }
}
