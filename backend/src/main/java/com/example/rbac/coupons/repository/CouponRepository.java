package com.example.rbac.coupons.repository;

import com.example.rbac.coupons.model.Coupon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface CouponRepository extends JpaRepository<Coupon, Long>, JpaSpecificationExecutor<Coupon> {

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

    @Query("""
            select distinct c from Coupon c
            join c.products p
            where c.status = com.example.rbac.coupons.model.CouponStatus.ENABLED
              and c.type = com.example.rbac.coupons.model.CouponType.PRODUCT
              and c.startDate <= :now
              and c.endDate >= :now
              and p.id = :productId
            """)
    List<Coupon> findActiveProductCoupons(@Param("productId") Long productId, @Param("now") Instant now);

    @Query("""
            select distinct c from Coupon c
            join c.categories category
            where c.status = com.example.rbac.coupons.model.CouponStatus.ENABLED
              and c.type = com.example.rbac.coupons.model.CouponType.PRODUCT
              and c.startDate <= :now
              and c.endDate >= :now
              and category.id in :categoryIds
            """)
    List<Coupon> findActiveCategoryCoupons(@Param("categoryIds") Collection<Long> categoryIds, @Param("now") Instant now);
}
