package com.example.rbac.permissions.repository;

import com.example.rbac.permissions.model.Permission;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface PermissionRepository extends JpaRepository<Permission, Long> {
    Optional<Permission> findByKey(String key);

    List<Permission> findByKeyIn(Set<String> keys);

    List<Permission> findByKeyStartingWithIgnoreCase(String prefix);

    @Query("SELECT p FROM Permission p WHERE LOWER(p.key) NOT LIKE LOWER(CONCAT(:prefix, '%'))")
    Page<Permission> findByKeyNotStartingWithIgnoreCase(@Param("prefix") String prefix, Pageable pageable);
}
