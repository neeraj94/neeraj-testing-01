package com.example.rbac.checkout.repository;

import com.example.rbac.checkout.model.CheckoutOrder;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface CheckoutOrderRepository extends JpaRepository<CheckoutOrder, Long>, JpaSpecificationExecutor<CheckoutOrder> {

    List<CheckoutOrder> findAllByOrderByCreatedAtDesc();

    List<CheckoutOrder> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Override
    @EntityGraph(attributePaths = {})
    Page<CheckoutOrder> findAll(Pageable pageable);
}

