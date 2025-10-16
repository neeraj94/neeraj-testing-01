package com.example.rbac.shipping.repository;

import com.example.rbac.shipping.model.ShippingState;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ShippingStateRepository extends JpaRepository<ShippingState, Long> {
    boolean existsByCountryIdAndNameIgnoreCase(Long countryId, String name);
    boolean existsByCountryIdAndNameIgnoreCaseAndIdNot(Long countryId, String name, Long id);
    @EntityGraph(attributePaths = "country")
    List<ShippingState> findByCountryIdOrderByEnabledDescNameAsc(Long countryId);

    @EntityGraph(attributePaths = "country")
    List<ShippingState> findByCountryIdOrderByNameAsc(Long countryId);

    @EntityGraph(attributePaths = "country")
    List<ShippingState> findByCountryIdAndEnabledTrueOrderByNameAsc(Long countryId);

    @EntityGraph(attributePaths = "country")
    Optional<ShippingState> findWithCountryById(Long id);

    @EntityGraph(attributePaths = "country")
    List<ShippingState> findByIdIn(List<Long> ids);
}
