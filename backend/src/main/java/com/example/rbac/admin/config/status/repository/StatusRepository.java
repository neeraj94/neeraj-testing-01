package com.example.rbac.admin.config.status.repository;

import com.example.rbac.admin.config.status.model.Status;
import com.example.rbac.admin.config.status.model.StatusType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface StatusRepository extends JpaRepository<Status, Long> {

    @Query("select s from Status s where s.statusType = :type and (:search is null or lower(s.name) like lower(concat('%', :search, '%')) or lower(s.code) like lower(concat('%', :search, '%'))) order by s.sortOrder asc, s.name asc")
    Page<Status> search(@Param("type") StatusType type, @Param("search") String search, Pageable pageable);

    List<Status> findByStatusTypeOrderBySortOrderAscNameAsc(StatusType statusType);

    Optional<Status> findByStatusTypeAndCode(StatusType statusType, String code);

    Optional<Status> findByStatusTypeAndNameIgnoreCase(StatusType statusType, String name);

    long countByStatusTypeAndDefaultStatusTrue(StatusType statusType);

    @Query("select coalesce(max(s.sortOrder), 0) from Status s where s.statusType = :type")
    Integer findMaxSortOrderByStatusType(@Param("type") StatusType statusType);

    @Modifying
    @Query("update Status s set s.defaultStatus = false where s.statusType = :type and s.id <> :statusId")
    void clearDefaultForOtherStatuses(@Param("type") StatusType type, @Param("statusId") Long statusId);

    @Modifying
    @Query("update Status s set s.defaultStatus = false where s.statusType = :type")
    void clearDefaultForType(@Param("type") StatusType type);

    List<Status> findByIdIn(Collection<Long> ids);
}
