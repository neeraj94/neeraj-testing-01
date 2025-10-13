package com.example.rbac.shipping.repository;

import com.example.rbac.shipping.model.ShippingCity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShippingCityRepository extends JpaRepository<ShippingCity, Long> {
    boolean existsByStateIdAndNameIgnoreCase(Long stateId, String name);
    boolean existsByStateIdAndNameIgnoreCaseAndIdNot(Long stateId, String name, Long id);
    @EntityGraph(attributePaths = {"state", "state.country"})
    List<ShippingCity> findByStateIdOrderByEnabledDescNameAsc(Long stateId);

    @EntityGraph(attributePaths = {"state", "state.country"})
    List<ShippingCity> findByStateIdOrderByNameAsc(Long stateId);
}
