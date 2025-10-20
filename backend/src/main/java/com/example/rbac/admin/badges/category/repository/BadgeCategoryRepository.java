package com.example.rbac.admin.badges.category.repository;

import com.example.rbac.admin.badges.category.model.BadgeCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BadgeCategoryRepository extends JpaRepository<BadgeCategory, Long> {

    Page<BadgeCategory> findByTitleContainingIgnoreCase(String title, Pageable pageable);

    boolean existsByTitleIgnoreCase(String title);

    boolean existsByTitleIgnoreCaseAndIdNot(String title, Long id);
}
