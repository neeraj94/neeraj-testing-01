package com.example.rbac.admin.blog.model;

import jakarta.persistence.*;

import java.text.Normalizer;
import java.time.Instant;
import java.util.Locale;

@Entity
@Table(name = "blog_categories")
public class BlogCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 160, unique = true)
    private String slug;

    @Column(columnDefinition = "text")
    private String description;

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
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
        sanitize();
    }

    private void sanitize() {
        name = name == null ? null : name.trim();
        if (name == null || name.isEmpty()) {
            throw new IllegalStateException("Category name cannot be blank");
        }
        if (slug == null || slug.isBlank()) {
            slug = buildSlug(name);
        } else {
            slug = buildSlug(slug);
        }
        if (description != null) {
            description = description.trim();
        }
    }

    private String buildSlug(String source) {
        String normalized = Normalizer.normalize(source, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        String cleaned = normalized.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9\\s-_]", "");
        cleaned = cleaned.trim().replaceAll("[\\s-_]+", "-");
        if (cleaned.isEmpty()) {
            cleaned = "category" + Long.toHexString(System.nanoTime());
        }
        return cleaned.length() > 150 ? cleaned.substring(0, 150) : cleaned;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
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
