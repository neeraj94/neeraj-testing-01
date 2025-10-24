package com.example.rbac.admin.users.repository;

import com.example.rbac.admin.users.model.UserRecentView;
import com.example.rbac.admin.users.repository.projection.UserRecentViewSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserRecentViewRepository extends JpaRepository<UserRecentView, Long> {

    List<UserRecentView> findTop20ByUserIdOrderByViewedAtDesc(Long userId);

    List<UserRecentView> findByUserIdOrderByViewedAtDesc(Long userId);

    Optional<UserRecentView> findByUserIdAndProductId(Long userId, Long productId);

    List<UserRecentView> findByUserIdAndProductIdIn(Long userId, Collection<Long> productIds);

    @Query(value = """
            SELECT urv.id          AS id,
                   urv.product_id  AS productId,
                   urv.viewed_at   AS viewedAt
            FROM user_recent_views urv
            WHERE urv.user_id = :userId
            ORDER BY urv.viewed_at DESC
            LIMIT 20
            """, nativeQuery = true)
    List<UserRecentViewSummary> findRecentSummariesByUserId(@Param("userId") Long userId);
}
