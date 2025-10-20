package com.example.rbac.client.cart.repository;

import com.example.rbac.client.cart.model.Cart;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface CartRepository extends JpaRepository<Cart, Long>, CartRepositoryCustom {

    @EntityGraph(attributePaths = {"items", "items.product", "items.variant"})
    Optional<Cart> findByUserId(Long userId);

    @EntityGraph(attributePaths = {"items", "items.product", "items.variant"})
    Optional<Cart> findById(Long id);

    @EntityGraph(attributePaths = {"items", "items.product", "items.variant"})
    List<Cart> findByIdIn(Collection<Long> ids);
}
