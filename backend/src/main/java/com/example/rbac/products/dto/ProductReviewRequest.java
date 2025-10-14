package com.example.rbac.products.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class ProductReviewRequest {

    @NotNull
    private Long productId;

    private Long customerId;

    @Size(max = 150, message = "Reviewer name must be at most 150 characters")
    private String reviewerName;

    @Valid
    private MediaSelectionRequest reviewerAvatar;

    @NotNull
    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating must be at most 5")
    private Integer rating;

    @Size(max = 10000, message = "Comment must be at most 10000 characters")
    private String comment;

    private Instant reviewedAt;

    @Valid
    private List<MediaSelectionRequest> media = new ArrayList<>();

    private Boolean published = Boolean.TRUE;

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public Long getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }

    public String getReviewerName() {
        return reviewerName;
    }

    public void setReviewerName(String reviewerName) {
        this.reviewerName = reviewerName;
    }

    public MediaSelectionRequest getReviewerAvatar() {
        return reviewerAvatar;
    }

    public void setReviewerAvatar(MediaSelectionRequest reviewerAvatar) {
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

    public List<MediaSelectionRequest> getMedia() {
        return media;
    }

    public void setMedia(List<MediaSelectionRequest> media) {
        this.media = media;
    }

    public Boolean getPublished() {
        return published;
    }

    public void setPublished(Boolean published) {
        this.published = published;
    }
}
