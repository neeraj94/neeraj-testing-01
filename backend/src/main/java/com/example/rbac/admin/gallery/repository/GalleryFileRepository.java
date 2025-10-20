package com.example.rbac.admin.gallery.repository;

import com.example.rbac.admin.gallery.model.GalleryFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface GalleryFileRepository extends JpaRepository<GalleryFile, Long>, JpaSpecificationExecutor<GalleryFile> {

    long countByFolderId(Long folderId);
}
