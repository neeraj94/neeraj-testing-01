package com.example.rbac.users.repository;

import com.example.rbac.users.model.UserRecentView;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserRecentViewRepository extends JpaRepository<UserRecentView, Long> {

    @EntityGraph(attributePaths = {"product", "product.galleryImages", "product.variants"})
    List<UserRecentView> findTop20ByUserIdOrderByViewedAtDesc(Long userId);

    @EntityGraph(attributePaths = {"product", "product.galleryImages", "product.variants"})
    List<UserRecentView> findByUserIdOrderByViewedAtDesc(Long userId);

    Optional<UserRecentView> findByUserIdAndProductId(Long userId, Long productId);

    @EntityGraph(attributePaths = {"product"})
    List<UserRecentView> findByUserIdAndProductIdIn(Long userId, Collection<Long> productIds);
}
