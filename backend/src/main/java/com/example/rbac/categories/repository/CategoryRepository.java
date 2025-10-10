package com.example.rbac.categories.repository;

import com.example.rbac.categories.model.Category;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    Page<Category> findByNameContainingIgnoreCaseOrSlugContainingIgnoreCase(String name, String slug, Pageable pageable);

    boolean existsBySlugIgnoreCase(String slug);

    boolean existsBySlugIgnoreCaseAndIdNot(String slug, Long id);

    boolean existsByParentId(Long parentId);

    List<Category> findAllByOrderByNameAsc();

    @Query("select c from Category c where c.id <> :excludeId order by c.name asc")
    List<Category> findAllExcept(Long excludeId);
}
