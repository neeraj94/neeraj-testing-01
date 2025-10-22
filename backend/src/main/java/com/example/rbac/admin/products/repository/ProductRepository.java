package com.example.rbac.admin.products.repository;

import com.example.rbac.admin.products.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    @EntityGraph(attributePaths = {"brand", "categories"})
    Page<Product> findByNameContainingIgnoreCase(String name, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"brand", "categories"})
    Page<Product> findAll(Pageable pageable);

    @EntityGraph(attributePaths = {
            "brand"
    })
    Optional<Product> findDetailedById(Long id);

    @EntityGraph(attributePaths = {"brand", "categories"})
    Optional<Product> findBySkuIgnoreCase(String sku);

    @EntityGraph(attributePaths = {
            "brand",
            "categories",
            "taxRates",
            "variants",
            "variants.values",
            "variants.values.attributeValue",
            "variants.values.attributeValue.attribute"
    })
    Optional<Product> findForAdminOrderComposerById(Long id);

    Optional<Product> findDetailedBySlugIgnoreCase(String slug);

    List<Product> findByIdIn(List<Long> ids);

    boolean existsBySku(String sku);

    boolean existsBySkuIgnoreCase(String sku);

    boolean existsBySkuIgnoreCaseAndIdNot(String sku, Long id);

    boolean existsBySlugIgnoreCase(String slug);

    boolean existsBySlugIgnoreCaseAndIdNot(String slug, Long id);
}
