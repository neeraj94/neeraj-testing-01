package com.example.rbac.products.dto.storefront;

import com.example.rbac.products.dto.MediaAssetDto;

import java.time.Instant;
import java.util.List;

public class PublicProductReviewDto {

    private Long id;
    private String reviewerName;
    private String customerAddress;
    private Integer rating;
    private String comment;
    private Instant reviewedAt;
    private MediaAssetDto reviewerAvatar;
    private List<MediaAssetDto> media;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getReviewerName() {
        return reviewerName;
    }

    public void setReviewerName(String reviewerName) {
        this.reviewerName = reviewerName;
    }

    public String getCustomerAddress() {
        return customerAddress;
    }

    public void setCustomerAddress(String customerAddress) {
        this.customerAddress = customerAddress;
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

    public MediaAssetDto getReviewerAvatar() {
        return reviewerAvatar;
    }

    public void setReviewerAvatar(MediaAssetDto reviewerAvatar) {
        this.reviewerAvatar = reviewerAvatar;
    }

    public List<MediaAssetDto> getMedia() {
        return media;
    }

    public void setMedia(List<MediaAssetDto> media) {
        this.media = media;
    }
}
