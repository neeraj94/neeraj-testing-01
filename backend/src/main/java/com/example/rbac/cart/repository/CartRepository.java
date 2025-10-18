package com.example.rbac.cart.repository;

import com.example.rbac.cart.model.Cart;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.QueryHints;
import jakarta.persistence.QueryHint;

import java.util.List;
import java.util.Optional;

public interface CartRepository extends JpaRepository<Cart, Long>, CartRepositoryCustom {

    @EntityGraph(attributePaths = {"items", "items.product", "items.product.taxRates", "items.product.galleryImages", "items.variant", "items.variant.media"})
    Optional<Cart> findByUserId(Long userId);

    @EntityGraph(attributePaths = {"items", "items.product", "items.product.taxRates", "items.product.galleryImages", "items.variant", "items.variant.media"})
    Optional<Cart> findById(Long id);

    @QueryHints(@QueryHint(name = "hibernate.query.passDistinctThrough", value = "false"))
    @Query("select distinct c from Cart c " +
            "left join fetch c.user " +
            "left join fetch c.items i " +
            "left join fetch i.product p " +
            "left join fetch p.taxRates " +
            "left join fetch p.galleryImages gi " +
            "left join fetch i.variant v " +
            "left join fetch v.media vm " +
            "where c.id in :ids")
    List<Cart> findDetailedByIds(@Param("ids") List<Long> ids);
}
