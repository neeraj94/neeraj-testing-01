package com.example.rbac.client.checkout.repository;

import com.example.rbac.client.checkout.model.CheckoutOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CheckoutOrderRepository extends JpaRepository<CheckoutOrder, Long> {

    List<CheckoutOrder> findAllByOrderByCreatedAtDesc();

    List<CheckoutOrder> findByUserIdOrderByCreatedAtDesc(Long userId);

    boolean existsByStatusIgnoreCase(String status);
}

