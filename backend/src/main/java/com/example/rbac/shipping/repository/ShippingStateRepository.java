package com.example.rbac.shipping.repository;

import com.example.rbac.shipping.model.ShippingState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShippingStateRepository extends JpaRepository<ShippingState, Long> {
    boolean existsByCountryIdAndNameIgnoreCase(Long countryId, String name);
    boolean existsByCountryIdAndNameIgnoreCaseAndIdNot(Long countryId, String name, Long id);
    List<ShippingState> findByCountryIdOrderByEnabledDescNameAsc(Long countryId);
    List<ShippingState> findByCountryIdOrderByNameAsc(Long countryId);
}
