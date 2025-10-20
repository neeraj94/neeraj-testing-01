package com.example.rbac.admin.attributes.repository;

import com.example.rbac.admin.attributes.model.Attribute;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AttributeRepository extends JpaRepository<Attribute, Long> {

    boolean existsBySlugIgnoreCase(String slug);

    boolean existsBySlugIgnoreCaseAndIdNot(String slug, Long id);

    @EntityGraph(attributePaths = "values")
    Optional<Attribute> findWithValuesById(Long id);

    @EntityGraph(attributePaths = "values")
    Page<Attribute> findByNameContainingIgnoreCaseOrSlugContainingIgnoreCase(String name, String slug, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = "values")
    Page<Attribute> findAll(Pageable pageable);
}
