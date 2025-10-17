package com.example.rbac.checkout.repository;

import com.example.rbac.checkout.model.CheckoutOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CheckoutOrderRepository extends JpaRepository<CheckoutOrder, Long> {

    List<CheckoutOrder> findAllByOrderByCreatedAtDesc();

    List<CheckoutOrder> findByUserIdOrderByCreatedAtDesc(Long userId);
}

