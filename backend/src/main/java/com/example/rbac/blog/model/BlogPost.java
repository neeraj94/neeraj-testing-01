package com.example.rbac.blog.model;

import jakarta.persistence.*;

import java.text.Normalizer;
import java.time.Instant;
import java.util.Locale;

@Entity
@Table(name = "blog_posts")
public class BlogPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private BlogCategory category;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 210, unique = true)
    private String slug;

    @Column(columnDefinition = "text", nullable = false)
    private String description;

    @Column(name = "banner_image", length = 255)
    private String bannerImage;

    @Column(name = "meta_title", length = 200)
    private String metaTitle;

    @Column(name = "meta_description", columnDefinition = "text")
    private String metaDescription;

    @Column(name = "meta_keywords", columnDefinition = "text")
    private String metaKeywords;

    @Column(name = "meta_image", length = 255)
    private String metaImage;

    @Column(nullable = false)
    private boolean published = false;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    public void prePersist() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        sanitize();
        if (published && publishedAt == null) {
            publishedAt = now;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
        sanitize();
        if (published && publishedAt == null) {
            publishedAt = Instant.now();
        }
        if (!published) {
            publishedAt = null;
        }
    }

    private void sanitize() {
        title = title == null ? null : title.trim();
        if (title == null || title.isEmpty()) {
            throw new IllegalStateException("Post title cannot be blank");
        }
        if (slug == null || slug.isBlank()) {
            slug = buildSlug(title);
        } else {
            slug = buildSlug(slug);
        }
        if (description == null || description.isBlank()) {
            throw new IllegalStateException("Post description cannot be blank");
        }
        if (metaTitle != null) {
            metaTitle = metaTitle.trim();
        }
        if (metaDescription != null) {
            metaDescription = metaDescription.trim();
        }
        if (metaKeywords != null) {
            metaKeywords = metaKeywords.trim();
        }
    }

    private String buildSlug(String source) {
        String normalized = Normalizer.normalize(source, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        String cleaned = normalized.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9\\s-_]", "");
        cleaned = cleaned.trim().replaceAll("[\\s-_]+", "-");
        if (cleaned.isEmpty()) {
            cleaned = "post" + Long.toHexString(System.nanoTime());
        }
        return cleaned.length() > 200 ? cleaned.substring(0, 200) : cleaned;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public BlogCategory getCategory() {
        return category;
    }

    public void setCategory(BlogCategory category) {
        this.category = category;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getBannerImage() {
        return bannerImage;
    }

    public void setBannerImage(String bannerImage) {
        this.bannerImage = bannerImage;
    }

    public String getMetaTitle() {
        return metaTitle;
    }

    public void setMetaTitle(String metaTitle) {
        this.metaTitle = metaTitle;
    }

    public String getMetaDescription() {
        return metaDescription;
    }

    public void setMetaDescription(String metaDescription) {
        this.metaDescription = metaDescription;
    }

    public String getMetaKeywords() {
        return metaKeywords;
    }

    public void setMetaKeywords(String metaKeywords) {
        this.metaKeywords = metaKeywords;
    }

    public String getMetaImage() {
        return metaImage;
    }

    public void setMetaImage(String metaImage) {
        this.metaImage = metaImage;
    }

    public boolean isPublished() {
        return published;
    }

    public void setPublished(boolean published) {
        this.published = published;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(Instant publishedAt) {
        this.publishedAt = publishedAt;
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
