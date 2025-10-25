package com.example.rbac.admin.config.status.repository;

import com.example.rbac.admin.config.status.model.StatusType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StatusTypeRepository extends JpaRepository<StatusType, Long> {
    Optional<StatusType> findByKey(String key);
}
