package com.example.rbac.permissions.repository;

import com.example.rbac.permissions.model.Permission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface PermissionRepository extends JpaRepository<Permission, Long> {
    Optional<Permission> findByKey(String key);

    List<Permission> findByKeyIn(Set<String> keys);
}
