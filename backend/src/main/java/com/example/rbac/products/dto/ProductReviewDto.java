package com.example.rbac.products.dto;

import java.time.Instant;
import java.util.List;

public class ProductReviewDto {

    private Long id;
    private Long productId;
    private String productName;
    private List<ProductCategoryDto> productCategories;
    private Long customerId;
    private String customerName;
    private String reviewerName;
    private MediaAssetDto reviewerAvatar;
    private Integer rating;
    private String comment;
    private Instant reviewedAt;
    private List<MediaAssetDto> media;
    private Instant createdAt;
    private Instant updatedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public List<ProductCategoryDto> getProductCategories() {
        return productCategories;
    }

    public void setProductCategories(List<ProductCategoryDto> productCategories) {
        this.productCategories = productCategories;
    }

    public Long getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getReviewerName() {
        return reviewerName;
    }

    public void setReviewerName(String reviewerName) {
        this.reviewerName = reviewerName;
    }

    public MediaAssetDto getReviewerAvatar() {
        return reviewerAvatar;
    }

    public void setReviewerAvatar(MediaAssetDto reviewerAvatar) {
        this.reviewerAvatar = reviewerAvatar;
    }

    public Integer getRating() {
        return rating;
    }

    public void setRating(Integer rating) {
        this.rating = rating;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(Instant reviewedAt) {
        this.reviewedAt = reviewedAt;
    }

    public List<MediaAssetDto> getMedia() {
        return media;
    }

    public void setMedia(List<MediaAssetDto> media) {
        this.media = media;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
