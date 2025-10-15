package com.example.rbac.products.repository;

import com.example.rbac.products.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    @EntityGraph(attributePaths = {"brand"})
    Page<Product> findByNameContainingIgnoreCase(String name, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"brand"})
    Page<Product> findAll(Pageable pageable);

    @EntityGraph(attributePaths = {
            "brand"
    })
    Optional<Product> findDetailedById(Long id);

    Optional<Product> findDetailedBySlugIgnoreCase(String slug);

    boolean existsBySku(String sku);

    boolean existsBySkuIgnoreCase(String sku);

    boolean existsBySkuIgnoreCaseAndIdNot(String sku, Long id);

    boolean existsBySlugIgnoreCase(String slug);

    boolean existsBySlugIgnoreCaseAndIdNot(String slug, Long id);
}
