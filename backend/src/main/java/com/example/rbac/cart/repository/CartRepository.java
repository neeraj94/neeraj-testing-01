package com.example.rbac.cart.repository;

import com.example.rbac.cart.model.Cart;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CartRepository extends JpaRepository<Cart, Long>, CartRepositoryCustom {

    @EntityGraph(attributePaths = {"items", "items.product", "items.product.taxRates", "items.product.galleryImages", "items.variant", "items.variant.media"})
    Optional<Cart> findByUserId(Long userId);

    @EntityGraph(attributePaths = {"items", "items.product", "items.product.taxRates", "items.product.galleryImages", "items.variant", "items.variant.media"})
    Optional<Cart> findById(Long id);

    @EntityGraph(attributePaths = {
            "user",
            "items",
            "items.product",
            "items.product.taxRates",
            "items.product.thumbnail",
            "items.product.galleryImages",
            "items.product.galleryImages.media",
            "items.variant",
            "items.variant.media",
            "items.variant.media.media"
    })
    @Query("select distinct c from Cart c where c.id in :ids")
    List<Cart> findDetailedByIds(@Param("ids") List<Long> ids);
}
