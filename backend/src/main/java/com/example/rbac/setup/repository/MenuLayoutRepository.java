package com.example.rbac.setup.repository;

import com.example.rbac.setup.model.MenuLayout;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MenuLayoutRepository extends JpaRepository<MenuLayout, Long> {
    Optional<MenuLayout> findByLayoutKey(String layoutKey);
}
