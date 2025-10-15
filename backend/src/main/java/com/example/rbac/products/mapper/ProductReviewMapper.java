package com.example.rbac.products.mapper;

import com.example.rbac.products.dto.MediaAssetDto;
import com.example.rbac.products.dto.ProductCategoryDto;
import com.example.rbac.products.dto.ProductReviewDto;
import com.example.rbac.products.model.MediaAsset;
import com.example.rbac.products.model.ProductReview;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Component
public class ProductReviewMapper {

    public ProductReviewDto toDto(ProductReview review) {
        if (review == null) {
            return null;
        }
        ProductReviewDto dto = new ProductReviewDto();
        dto.setId(review.getId());
        dto.setProductId(review.getProduct() != null ? review.getProduct().getId() : null);
        dto.setProductName(review.getProduct() != null ? review.getProduct().getName() : null);
        dto.setProductCategories(mapCategories(review));
        dto.setCustomerId(review.getCustomer() != null ? review.getCustomer().getId() : null);
        dto.setCustomerName(review.getCustomer() != null ? review.getCustomer().getName() : null);
        dto.setReviewerName(review.getReviewerName());
        dto.setReviewerAvatar(mapMedia(review.getReviewerAvatar()));
        dto.setRating(review.getRating());
        dto.setComment(review.getComment());
        dto.setReviewedAt(review.getReviewedAt());
        dto.setMedia(mapMediaList(review.getMedia()));
        dto.setCreatedAt(review.getCreatedAt());
        dto.setUpdatedAt(review.getUpdatedAt());
        dto.setPublished(review.isPublished());
        return dto;
    }

    public List<ProductReviewDto> toDtoList(List<ProductReview> reviews) {
        if (CollectionUtils.isEmpty(reviews)) {
            return List.of();
        }
        return reviews.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private List<ProductCategoryDto> mapCategories(ProductReview review) {
        if (review.getProduct() == null || CollectionUtils.isEmpty(review.getProduct().getCategories())) {
            return List.of();
        }
        return review.getProduct().getCategories().stream()
                .sorted(Comparator.comparing(category -> category.getName() != null ? category.getName().toLowerCase() : ""))
                .map(category -> {
                    ProductCategoryDto dto = new ProductCategoryDto();
                    dto.setId(category.getId());
                    dto.setName(category.getName());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    private List<MediaAssetDto> mapMediaList(List<MediaAsset> media) {
        if (CollectionUtils.isEmpty(media)) {
            return List.of();
        }
        return media.stream()
                .filter(Objects::nonNull)
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
}
