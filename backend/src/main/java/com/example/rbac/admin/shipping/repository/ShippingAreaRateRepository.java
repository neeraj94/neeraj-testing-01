package com.example.rbac.admin.shipping.repository;

import com.example.rbac.admin.shipping.model.ShippingAreaRate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ShippingAreaRateRepository extends JpaRepository<ShippingAreaRate, Long> {

    boolean existsByCountryIdAndStateIdAndCityId(Long countryId, Long stateId, Long cityId);

    boolean existsByCountryIdAndStateIdAndCityIdAndIdNot(Long countryId, Long stateId, Long cityId, Long id);

    boolean existsByCountryId(Long countryId);

    boolean existsByStateId(Long stateId);

    boolean existsByCityId(Long cityId);

    @Query("select rate from ShippingAreaRate rate " +
            "where (:term is null or :term = '' or lower(rate.country.name) like lower(concat('%', :term, '%')) " +
            "or lower(rate.state.name) like lower(concat('%', :term, '%')) " +
            "or lower(rate.city.name) like lower(concat('%', :term, '%')))")
    Page<ShippingAreaRate> search(@Param("term") String term, Pageable pageable);
}
