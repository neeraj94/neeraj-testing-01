package com.example.rbac.admin.setup.repository;

import com.example.rbac.admin.setup.model.MenuLayout;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MenuLayoutRepository extends JpaRepository<MenuLayout, Long> {
    Optional<MenuLayout> findByLayoutKeyAndUserId(String layoutKey, Long userId);

    Optional<MenuLayout> findByLayoutKeyAndUserIdIsNull(String layoutKey);
}
