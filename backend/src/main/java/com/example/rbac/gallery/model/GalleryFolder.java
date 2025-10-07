package com.example.rbac.gallery.model;

import com.example.rbac.users.model.User;
import jakarta.persistence.*;

import java.text.Normalizer;
import java.time.Instant;
import java.util.Locale;

@Entity
@Table(name = "gallery_folders")
public class GalleryFolder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 160)
    private String slug;

    @Column(nullable = false, unique = true, length = 500)
    private String path;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private GalleryFolder parent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private User owner;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    public void prePersist() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        refreshComputedFields();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
        refreshComputedFields();
    }

    public void refreshComputedFields() {
        name = name == null ? null : name.trim();
        if (name == null || name.isEmpty()) {
            throw new IllegalStateException("Folder name cannot be blank");
        }
        slug = buildSlug(name);
        path = buildPath();
    }

    private String buildSlug(String source) {
        String normalized = Normalizer.normalize(source, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        String cleaned = normalized.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9\\s-_]", "");
        cleaned = cleaned.trim().replaceAll("[\\s-_]+", "-");
        if (cleaned.isEmpty()) {
            cleaned = "folder" + Long.toHexString(System.nanoTime());
        }
        return cleaned.length() > 150 ? cleaned.substring(0, 150) : cleaned;
    }

    private String buildPath() {
        String parentPath = parent != null ? parent.getPath() : null;
        if (parentPath == null || parentPath.isBlank() || "/".equals(parentPath)) {
            String ownerSegment = buildOwnerSegment();
            if (ownerSegment != null) {
                return "/" + ownerSegment + "/" + slug;
            }
            return "/" + slug;
        }
        if (parentPath.endsWith("/")) {
            return parentPath + slug;
        }
        return parentPath + "/" + slug;
    }

    private String buildOwnerSegment() {
        if (owner == null || owner.getId() == null) {
            return null;
        }
        return "usr-" + owner.getId();
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

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public GalleryFolder getParent() {
        return parent;
    }

    public void setParent(GalleryFolder parent) {
        this.parent = parent;
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

    public User getOwner() {
        return owner;
    }

    public void setOwner(User owner) {
        this.owner = owner;
    }
}
