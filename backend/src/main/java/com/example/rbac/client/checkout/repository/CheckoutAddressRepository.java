<<<<<<<< HEAD:backend/src/main/java/com/example/rbac/client/checkout/repository/CheckoutAddressRepository.java
package com.example.rbac.client.checkout.repository;

import com.example.rbac.client.checkout.dto.CheckoutAddressType;
import com.example.rbac.client.checkout.model.CheckoutAddress;
========
package com.example.rbac.admin.checkout.repository;

import com.example.rbac.admin.checkout.dto.CheckoutAddressType;
import com.example.rbac.admin.checkout.model.CheckoutAddress;
>>>>>>>> origin/main:backend/src/main/java/com/example/rbac/admin/checkout/repository/CheckoutAddressRepository.java
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CheckoutAddressRepository extends JpaRepository<CheckoutAddress, Long> {

    @EntityGraph(attributePaths = {"country", "state", "city"})
    List<CheckoutAddress> findByUserIdOrderByDefaultAddressDescCreatedAtAsc(Long userId);

    @EntityGraph(attributePaths = {"country", "state", "city"})
    Optional<CheckoutAddress> findByIdAndUserId(Long id, Long userId);

    @Modifying
    @Query("UPDATE CheckoutAddress a SET a.defaultAddress = false WHERE a.user.id = :userId AND a.type = :type AND (:excludeId IS NULL OR a.id <> :excludeId)")
    void clearDefaultForType(@Param("userId") Long userId,
                             @Param("type") CheckoutAddressType type,
                             @Param("excludeId") Long excludeId);

    boolean existsByUserIdAndTypeAndDefaultAddressTrue(Long userId, CheckoutAddressType type);
}
