package com.example.rbac.admin.products.repository;

import com.example.rbac.admin.products.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    @EntityGraph(attributePaths = {"brand"})
    Page<Product> findByNameContainingIgnoreCase(String name, Pageable pageable);

    @Query("""
            SELECT DISTINCT p FROM Product p
            WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :term, '%'))
               OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :term, '%'))
            """)
    @EntityGraph(attributePaths = {"brand"})
    Page<Product> searchByNameOrSku(@Param("term") String term, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"brand"})
    Page<Product> findAll(Pageable pageable);

    @EntityGraph(attributePaths = {
            "brand"
    })
    Optional<Product> findDetailedById(Long id);

    Optional<Product> findDetailedBySlugIgnoreCase(String slug);

    List<Product> findByIdIn(List<Long> ids);

    boolean existsBySku(String sku);

    boolean existsBySkuIgnoreCase(String sku);

    boolean existsBySkuIgnoreCaseAndIdNot(String sku, Long id);

    boolean existsBySlugIgnoreCase(String slug);

    boolean existsBySlugIgnoreCaseAndIdNot(String slug, Long id);
}
