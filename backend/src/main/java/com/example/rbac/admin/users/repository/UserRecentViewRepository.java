package com.example.rbac.admin.users.repository;

import com.example.rbac.admin.users.model.UserRecentView;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserRecentViewRepository extends JpaRepository<UserRecentView, Long> {

    List<UserRecentView> findTop20ByUserIdOrderByViewedAtDesc(Long userId);

    List<UserRecentView> findByUserIdOrderByViewedAtDesc(Long userId);

    Optional<UserRecentView> findByUserIdAndProductId(Long userId, Long productId);

    List<UserRecentView> findByUserIdAndProductIdIn(Long userId, Collection<Long> productIds);
}
