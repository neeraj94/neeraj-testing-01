package com.example.rbac.cart.repository;

import com.example.rbac.cart.model.Cart;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.domain.Specification;

import java.util.Optional;

public interface CartRepository extends JpaRepository<Cart, Long>, JpaSpecificationExecutor<Cart> {

    @EntityGraph(attributePaths = {"items", "items.product", "items.product.taxRates", "items.product.galleryImages", "items.variant", "items.variant.media"})
    Optional<Cart> findByUserId(Long userId);

    @EntityGraph(attributePaths = {"items", "items.product", "items.product.taxRates", "items.product.galleryImages", "items.variant", "items.variant.media"})
    Optional<Cart> findById(Long id);

    @Override
    @EntityGraph(attributePaths = {"user", "items", "items.product", "items.variant"})
    Page<Cart> findAll(Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"user", "items", "items.product", "items.variant"})
    Page<Cart> findAll(Specification<Cart> spec, Pageable pageable);
}
