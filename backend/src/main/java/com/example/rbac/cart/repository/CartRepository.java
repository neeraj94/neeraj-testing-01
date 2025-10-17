package com.example.rbac.cart.repository;

import com.example.rbac.cart.model.Cart;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CartRepository extends JpaRepository<Cart, Long> {

    @EntityGraph(attributePaths = {"items", "items.product", "items.product.taxRates", "items.product.galleryImages", "items.variant", "items.variant.media"})
    Optional<Cart> findByUserId(Long userId);

    @EntityGraph(attributePaths = {"items", "items.product", "items.product.taxRates", "items.product.galleryImages", "items.variant", "items.variant.media"})
    Optional<Cart> findById(Long id);
}
