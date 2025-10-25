package com.example.rbac.admin.config.status.repository;

import com.example.rbac.admin.config.status.model.Status;
import com.example.rbac.admin.config.status.model.StatusTransition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface StatusTransitionRepository extends JpaRepository<StatusTransition, Long> {
    List<StatusTransition> findByFromStatus(Status fromStatus);

    List<StatusTransition> findByToStatus(Status toStatus);

    long countByFromStatusId(Long fromStatusId);

    void deleteByFromStatus(Status status);

    boolean existsByToStatusId(Long statusId);

    List<StatusTransition> findByFromStatusIdIn(Collection<Long> statusIds);
}
