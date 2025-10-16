package com.example.rbac.shipping.repository;

import com.example.rbac.shipping.model.ShippingCountry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ShippingCountryRepository extends JpaRepository<ShippingCountry, Long> {
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
    boolean existsByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);
    List<ShippingCountry> findAllByOrderByEnabledDescNameAsc();
    List<ShippingCountry> findAllByOrderByNameAsc();
    List<ShippingCountry> findByEnabledTrueOrderByNameAsc();
    Optional<ShippingCountry> findByCodeIgnoreCase(String code);
}
