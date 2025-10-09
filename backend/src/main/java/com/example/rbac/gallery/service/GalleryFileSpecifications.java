package com.example.rbac.gallery.service;

import com.example.rbac.gallery.model.GalleryFile;
import com.example.rbac.gallery.model.GalleryFolder;
import com.example.rbac.users.model.User;
import jakarta.persistence.criteria.Join;
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

    public static Specification<GalleryFile> ownedByOrUploadedBy(Long userId) {
        if (userId == null) {
            return null;
        }
        return (root, query, builder) -> {
            query.distinct(true);
            Join<GalleryFile, User> uploaderJoin = root.join("uploader", JoinType.LEFT);
            Join<GalleryFile, GalleryFolder> folderJoin = root.join("folder", JoinType.LEFT);
            Join<GalleryFolder, User> ownerJoin = folderJoin.join("owner", JoinType.LEFT);
            return builder.or(
                    builder.equal(ownerJoin.get("id"), userId),
                    builder.equal(uploaderJoin.get("id"), userId)
            );
        };
    }

    public static Specification<GalleryFile> none() {
        return (root, query, builder) -> builder.disjunction();
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
