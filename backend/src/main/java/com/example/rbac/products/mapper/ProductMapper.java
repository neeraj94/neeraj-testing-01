package com.example.rbac.products.mapper;

import com.example.rbac.attributes.model.AttributeValue;
import com.example.rbac.products.dto.*;
import com.example.rbac.products.model.MediaAsset;
import com.example.rbac.products.model.Product;
import com.example.rbac.products.model.ProductExpandableSection;
import com.example.rbac.products.model.ProductGalleryImage;
import com.example.rbac.products.model.ProductReview;
import com.example.rbac.products.model.ProductVariant;
import com.example.rbac.products.model.ProductVariantMedia;
import com.example.rbac.products.model.ProductVariantValue;
import com.example.rbac.products.model.ProductInfoSection;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Component
public class ProductMapper {

    private final ProductReviewMapper productReviewMapper;

    public ProductMapper(ProductReviewMapper productReviewMapper) {
        this.productReviewMapper = productReviewMapper;
    }

    public ProductSummaryDto toSummary(Product product) {
        ProductSummaryDto dto = new ProductSummaryDto();
        dto.setId(product.getId());
        dto.setName(product.getName());
        dto.setUnit(product.getUnit());
        dto.setUnitPrice(product.getUnitPrice());
        dto.setSku(product.getSku());
        dto.setFeatured(product.isFeatured());
        dto.setTodaysDeal(product.isTodaysDeal());
        dto.setBrandName(product.getBrand() != null ? product.getBrand().getName() : null);
        dto.setCategoryCount(product.getCategories() != null ? product.getCategories().size() : 0);
        dto.setVariantCount(product.getVariants() != null ? product.getVariants().size() : 0);
        dto.setCreatedAt(product.getCreatedAt());
        dto.setUpdatedAt(product.getUpdatedAt());
        return dto;
    }

    public ProductDto toDto(Product product) {
        return toDto(product, List.of());
    }

    public ProductDto toDto(Product product, List<ProductReview> reviews) {
        ProductDto dto = new ProductDto();
        dto.setId(product.getId());
        dto.setName(product.getName());
        dto.setUnit(product.getUnit());
        dto.setWeightKg(product.getWeightKg());
        dto.setMinPurchaseQuantity(product.getMinPurchaseQuantity());
        dto.setFeatured(product.isFeatured());
        dto.setTodaysDeal(product.isTodaysDeal());
        dto.setShortDescription(product.getShortDescription());
        dto.setDescription(product.getDescription());
        dto.setVideoProvider(product.getVideoProvider());
        dto.setVideoUrl(product.getVideoUrl());
        dto.setGallery(mapGallery(product.getGalleryImages()));
        dto.setThumbnail(mapMedia(product.getThumbnail()));
        dto.setPdfSpecification(mapMedia(product.getPdfSpecification()));
        dto.setSeo(mapSeo(product));
        dto.setCategories(mapCategories(product));
        dto.setTaxRates(mapTaxRates(product));
        dto.setAttributes(mapAttributes(product));
        dto.setPricing(mapPricing(product));
        dto.setVariants(mapVariants(product.getVariants()));
        dto.setExpandableSections(mapExpandableSections(product.getExpandableSections()));
        dto.setInfoSections(mapInfoSections(product.getInfoSections()));
        dto.setReviews(productReviewMapper.toDtoList(reviews));
        dto.setCreatedAt(product.getCreatedAt());
        dto.setUpdatedAt(product.getUpdatedAt());
        if (product.getBrand() != null) {
            ProductBrandDto brand = new ProductBrandDto();
            brand.setId(product.getBrand().getId());
            brand.setName(product.getBrand().getName());
            brand.setLogoUrl(product.getBrand().getLogoUrl());
            dto.setBrand(brand);
        }
        return dto;
    }

    private List<MediaAssetDto> mapGallery(List<ProductGalleryImage> galleryImages) {
        if (galleryImages == null) {
            return List.of();
        }
        return galleryImages.stream()
                .sorted(Comparator.comparing(image -> image.getDisplayOrder() != null ? image.getDisplayOrder() : Integer.MAX_VALUE))
                .map(ProductGalleryImage::getMedia)
                .map(this::mapMedia)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    private MediaAssetDto mapMedia(MediaAsset asset) {
        if (asset == null || asset.getUrl() == null) {
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

    private ProductSeoDto mapSeo(Product product) {
        ProductSeoDto seo = new ProductSeoDto();
        seo.setTitle(product.getMetaTitle());
        seo.setDescription(product.getMetaDescription());
        seo.setKeywords(product.getMetaKeywords());
        seo.setCanonicalUrl(product.getMetaCanonicalUrl());
        seo.setImage(mapMedia(product.getMetaImage()));
        return seo;
    }

    private List<ProductExpandableSectionDto> mapExpandableSections(List<ProductExpandableSection> sections) {
        if (sections == null || sections.isEmpty()) {
            return List.of();
        }
        return sections.stream()
                .map(section -> {
                    ProductExpandableSectionDto dto = new ProductExpandableSectionDto();
                    dto.setTitle(section.getTitle());
                    dto.setContent(section.getContent());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    private List<ProductCategoryDto> mapCategories(Product product) {
        if (product.getCategories() == null) {
            return List.of();
        }
        return product.getCategories().stream()
                .sorted(Comparator.comparing(category -> category.getName() != null ? category.getName().toLowerCase() : ""))
                .map(category -> {
                    ProductCategoryDto dto = new ProductCategoryDto();
                    dto.setId(category.getId());
                    dto.setName(category.getName());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    private List<ProductInfoSectionDto> mapInfoSections(List<ProductInfoSection> sections) {
        if (sections == null || sections.isEmpty()) {
            return List.of();
        }
        return sections.stream()
                .map(section -> {
                    ProductInfoSectionDto dto = new ProductInfoSectionDto();
                    dto.setId(section.getId());
                    dto.setTitle(section.getTitle());
                    dto.setContent(section.getContent());
                    dto.setBulletPoints(section.getBulletPoints() != null ? List.copyOf(section.getBulletPoints()) : List.of());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    private List<ProductTaxRateDto> mapTaxRates(Product product) {
        if (product.getTaxRates() == null) {
            return List.of();
        }
        return product.getTaxRates().stream()
                .sorted(Comparator.comparing(rate -> rate.getName() != null ? rate.getName().toLowerCase() : ""))
                .map(rate -> {
                    ProductTaxRateDto dto = new ProductTaxRateDto();
                    dto.setId(rate.getId());
                    dto.setName(rate.getName());
                    dto.setRateType(rate.getRateType());
                    dto.setRateValue(rate.getRateValue());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    private List<ProductAttributeDto> mapAttributes(Product product) {
        if (product.getAttributeValues() == null || product.getAttributeValues().isEmpty()) {
            return List.of();
        }
        Map<Long, List<AttributeValue>> grouped = product.getAttributeValues().stream()
                .filter(value -> value.getAttribute() != null)
                .collect(Collectors.groupingBy(value -> value.getAttribute().getId()));

        return grouped.entrySet().stream()
                .sorted(Comparator.comparing(entry -> {
                    AttributeValue sample = entry.getValue().get(0);
                    String attributeName = sample.getAttribute().getName();
                    return attributeName != null ? attributeName : "";
                }, String.CASE_INSENSITIVE_ORDER))
                .map(entry -> {
                    ProductAttributeDto attributeDto = new ProductAttributeDto();
                    AttributeValue sample = entry.getValue().get(0);
                    attributeDto.setAttributeId(sample.getAttribute().getId());
                    attributeDto.setAttributeName(sample.getAttribute().getName());
                    attributeDto.setValues(entry.getValue().stream()
                            .sorted(Comparator.comparing(value -> value.getSortOrder() != null ? value.getSortOrder() : Integer.MAX_VALUE))
                            .map(value -> {
                                ProductAttributeValueDto valueDto = new ProductAttributeValueDto();
                                valueDto.setId(value.getId());
                                valueDto.setValue(value.getValue());
                                valueDto.setSortOrder(value.getSortOrder());
                                return valueDto;
                            })
                            .collect(Collectors.toList()));
                    return attributeDto;
                })
                .collect(Collectors.toList());
    }

    private ProductPricingDto mapPricing(Product product) {
        ProductPricingDto pricing = new ProductPricingDto();
        pricing.setUnitPrice(product.getUnitPrice());
        pricing.setDiscountType(product.getDiscountType());
        pricing.setDiscountValue(product.getDiscountValue());
        pricing.setDiscountMinQuantity(product.getDiscountMinQuantity());
        pricing.setDiscountMaxQuantity(product.getDiscountMaxQuantity());
        pricing.setDiscountStartAt(product.getDiscountStartAt());
        pricing.setDiscountEndAt(product.getDiscountEndAt());
        List<String> tags = product.getTags() == null
                ? List.of()
                : product.getTags().stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(StringUtils::hasText)
                .collect(Collectors.toList());
        pricing.setTags(tags);
        pricing.setStockQuantity(product.getStockQuantity());
        pricing.setSku(product.getSku());
        pricing.setExternalLink(product.getExternalLink());
        pricing.setExternalLinkButton(product.getExternalLinkButton());
        pricing.setLowStockWarning(product.getLowStockWarning());
        pricing.setStockVisibility(product.getStockVisibility());
        return pricing;
    }

    private List<ProductVariantDto> mapVariants(List<ProductVariant> variants) {
        if (variants == null || variants.isEmpty()) {
            return List.of();
        }
        return variants.stream()
                .sorted(Comparator.comparing(variant -> variant.getDisplayOrder() != null ? variant.getDisplayOrder() : Integer.MAX_VALUE))
                .map(this::mapVariant)
                .collect(Collectors.toList());
    }

    private ProductVariantDto mapVariant(ProductVariant variant) {
        ProductVariantDto dto = new ProductVariantDto();
        dto.setId(variant.getId());
        dto.setKey(variant.getVariantKey());
        dto.setPriceAdjustment(variant.getPriceAdjustment());
        dto.setSku(variant.getSku());
        dto.setQuantity(variant.getQuantity());
        dto.setValues(mapVariantValues(variant.getValues()));
        dto.setMedia(mapVariantMedia(variant.getMedia()));
        return dto;
    }

    private List<ProductVariantValueDto> mapVariantValues(List<ProductVariantValue> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        return values.stream()
                .sorted(Comparator.comparing(value -> value.getPosition() != null ? value.getPosition() : Integer.MAX_VALUE))
                .map(value -> {
                    ProductVariantValueDto dto = new ProductVariantValueDto();
                    if (value.getAttributeValue() != null) {
                        dto.setValueId(value.getAttributeValue().getId());
                        dto.setValue(value.getAttributeValue().getValue());
                        if (value.getAttributeValue().getAttribute() != null) {
                            dto.setAttributeId(value.getAttributeValue().getAttribute().getId());
                            dto.setAttributeName(value.getAttributeValue().getAttribute().getName());
                        }
                    }
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
}
