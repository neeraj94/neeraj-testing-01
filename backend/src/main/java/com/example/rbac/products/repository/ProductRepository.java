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
            "brand",
            "categories",
            "taxRates",
            "attributeValues",
            "attributeValues.attribute",
            "galleryImages",
            "galleryImages.media",
            "variants",
            "variants.values",
            "variants.values.attributeValue",
            "variants.values.attributeValue.attribute",
            "variants.media",
            "variants.media.media",
            "infoSections",
            "infoSections.bulletPoints"
    })
    Optional<Product> findDetailedById(Long id);

    boolean existsBySku(String sku);
}
