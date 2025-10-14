package com.example.rbac.products.model;

import com.example.rbac.customers.model.Customer;
import jakarta.persistence.*;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "product_reviews")
public class ProductReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @Column(name = "reviewer_name", length = 150)
    private String reviewerName;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "url", column = @Column(name = "reviewer_avatar_url", length = 500)),
            @AttributeOverride(name = "storageKey", column = @Column(name = "reviewer_avatar_storage_key", length = 255)),
            @AttributeOverride(name = "originalFilename", column = @Column(name = "reviewer_avatar_original_filename", length = 255)),
            @AttributeOverride(name = "mimeType", column = @Column(name = "reviewer_avatar_mime_type", length = 150)),
            @AttributeOverride(name = "sizeBytes", column = @Column(name = "reviewer_avatar_size_bytes"))
    })
    private MediaAsset reviewerAvatar;

    @Column(name = "rating", nullable = false)
    private Integer rating;

    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    @Column(name = "reviewed_at", nullable = false)
    private Instant reviewedAt;

    @ElementCollection
    @CollectionTable(name = "product_review_media", joinColumns = @JoinColumn(name = "review_id"))
    @OrderColumn(name = "display_order")
    @AttributeOverrides({
            @AttributeOverride(name = "url", column = @Column(name = "media_url", length = 500)),
            @AttributeOverride(name = "storageKey", column = @Column(name = "media_storage_key", length = 255)),
            @AttributeOverride(name = "originalFilename", column = @Column(name = "media_original_filename", length = 255)),
            @AttributeOverride(name = "mimeType", column = @Column(name = "media_mime_type", length = 150)),
            @AttributeOverride(name = "sizeBytes", column = @Column(name = "media_size_bytes"))
    })
    @Fetch(FetchMode.SUBSELECT)
    private List<MediaAsset> media = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    public void prePersist() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public Customer getCustomer() {
        return customer;
    }

    public void setCustomer(Customer customer) {
        this.customer = customer;
    }

    public String getReviewerName() {
        return reviewerName;
    }

    public void setReviewerName(String reviewerName) {
        this.reviewerName = reviewerName;
    }

    public MediaAsset getReviewerAvatar() {
        return reviewerAvatar;
    }

    public void setReviewerAvatar(MediaAsset reviewerAvatar) {
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

    public List<MediaAsset> getMedia() {
        return media;
    }

    public void setMedia(List<MediaAsset> media) {
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
