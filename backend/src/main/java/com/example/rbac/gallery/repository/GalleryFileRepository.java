package com.example.rbac.gallery.repository;

import com.example.rbac.gallery.model.GalleryFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface GalleryFileRepository extends JpaRepository<GalleryFile, Long>, JpaSpecificationExecutor<GalleryFile> {
}
