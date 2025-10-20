<<<<<<<< HEAD:backend/src/main/java/com/example/rbac/client/checkout/repository/CheckoutOrderRepository.java
package com.example.rbac.client.checkout.repository;

import com.example.rbac.client.checkout.model.CheckoutOrder;
========
package com.example.rbac.admin.checkout.repository;

import com.example.rbac.admin.checkout.model.CheckoutOrder;
>>>>>>>> origin/main:backend/src/main/java/com/example/rbac/admin/checkout/repository/CheckoutOrderRepository.java
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CheckoutOrderRepository extends JpaRepository<CheckoutOrder, Long> {

    List<CheckoutOrder> findAllByOrderByCreatedAtDesc();

    List<CheckoutOrder> findByUserIdOrderByCreatedAtDesc(Long userId);
}

