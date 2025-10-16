package com.example.rbac.wedges.repository;

import com.example.rbac.wedges.model.Wedge;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface WedgeRepository extends JpaRepository<Wedge, Long> {

    Page<Wedge> findByNameContainingIgnoreCase(String name, Pageable pageable);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    @Modifying(clearAutomatically = true)
    @Query("update Wedge w set w.defaultWedge = false where w.defaultWedge = true and (:id is null or w.id <> :id)")
    void clearDefaultExcept(@Param("id") Long id);

    List<Wedge> findByCategory_NameIgnoreCaseOrderByNameAsc(String categoryName);
}
