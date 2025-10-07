package com.example.rbac.gallery.service;

import com.example.rbac.gallery.model.GalleryFile;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;

public final class GalleryFileSpecifications {

    private GalleryFileSpecifications() {
    }

    public static Specification<GalleryFile> belongsToFolder(Long folderId) {
        if (folderId == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.join("folder", JoinType.LEFT).get("id"), folderId);
    }

    public static Specification<GalleryFile> uploadedBy(Long uploaderId) {
        if (uploaderId == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.join("uploader", JoinType.INNER).get("id"), uploaderId);
    }

    public static Specification<GalleryFile> uploaderEmailContains(String uploaderEmail) {
        if (uploaderEmail == null || uploaderEmail.isBlank()) {
            return null;
        }
        String likeValue = "%" + uploaderEmail.trim().toLowerCase() + "%";
        return (root, query, builder) -> builder.like(builder.lower(root.join("uploader", JoinType.INNER).get("email")), likeValue);
    }

    public static Specification<GalleryFile> search(String term) {
        if (term == null || term.isBlank()) {
            return null;
        }
        String likeValue = "%" + term.trim().toLowerCase() + "%";
        return (root, query, builder) -> builder.or(
                builder.like(builder.lower(root.get("displayName")), likeValue),
                builder.like(builder.lower(root.get("originalFilename")), likeValue),
                builder.like(builder.lower(root.get("extension")), likeValue)
        );
    }

    public static Specification<GalleryFile> and(Specification<GalleryFile> left, Specification<GalleryFile> right) {
        if (left == null) {
            return right;
        }
        if (right == null) {
            return left;
        }
        return left.and(right);
    }
}
