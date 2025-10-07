package com.example.rbac.gallery.repository;

import com.example.rbac.gallery.model.GalleryFolder;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GalleryFolderRepository extends JpaRepository<GalleryFolder, Long> {

    Optional<GalleryFolder> findByPath(String path);

    List<GalleryFolder> findByParentId(Long parentId);

    List<GalleryFolder> findByParentIsNull();

    List<GalleryFolder> findByOwnerId(Long ownerId, Sort sort);

    Optional<GalleryFolder> findByOwnerIdAndParentIsNull(Long ownerId);
}
