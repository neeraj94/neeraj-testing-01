package com.example.rbac.admin.configuration.status.repository;

import com.example.rbac.admin.configuration.status.model.StatusCategory;
import com.example.rbac.admin.configuration.status.model.StatusConfig;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StatusConfigRepository extends JpaRepository<StatusConfig, Long> {

    List<StatusConfig> findByCategory(StatusCategory category, Sort sort);

    List<StatusConfig> findByCategoryAndNameContainingIgnoreCase(StatusCategory category, String name, Sort sort);

    List<StatusConfig> findByNameContainingIgnoreCase(String name, Sort sort);

    @Modifying
    @Query("update StatusConfig s set s.defaultStatus = false where s.category = :category and s.id <> :excludedId")
    void clearDefaultForCategoryExcludingId(@Param("category") StatusCategory category,
                                            @Param("excludedId") Long excludedId);

    @Modifying
    @Query("update StatusConfig s set s.defaultStatus = false where s.category = :category")
    void clearDefaultForCategory(@Param("category") StatusCategory category);
}
