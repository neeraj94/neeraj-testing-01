package com.example.rbac.badges.repository;

import com.example.rbac.badges.model.Badge;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BadgeRepository extends JpaRepository<Badge, Long> {

    Page<Badge> findByNameContainingIgnoreCase(String name, Pageable pageable);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    @Modifying(clearAutomatically = true)
    @Query("update Badge w set w.defaultBadge = false where w.defaultBadge = true and (:id is null or w.id <> :id)")
    void clearDefaultExcept(@Param("id") Long id);
}
