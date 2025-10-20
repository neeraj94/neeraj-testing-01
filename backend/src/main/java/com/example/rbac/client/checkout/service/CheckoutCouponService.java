package com.example.rbac.client.checkout.service;

import com.example.rbac.client.checkout.dto.AppliedCouponDto;
import com.example.rbac.client.checkout.dto.CheckoutCouponDto;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.admin.coupons.model.Coupon;
import com.example.rbac.admin.coupons.model.CouponStatus;
import com.example.rbac.admin.coupons.repository.CouponRepository;
import com.example.rbac.admin.products.model.DiscountType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class CheckoutCouponService {

    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);

    private final CouponRepository couponRepository;

    public CheckoutCouponService(CouponRepository couponRepository) {
        this.couponRepository = couponRepository;
    }

    @Transactional(readOnly = true)
    public List<CheckoutCouponDto> listActiveCoupons(Long userId) {
        Instant now = Instant.now();
        return couponRepository.findActiveCoupons(now).stream()
                .filter(coupon -> isAccessibleToUser(coupon, userId))
                .sorted(Comparator.comparing(Coupon::getEndDate, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(this::toCheckoutCouponDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AppliedCouponDto applyCoupon(String code, Long userId, BigDecimal subtotal) {
        if (!StringUtils.hasText(code)) {
            return null;
        }
        BigDecimal normalizedSubtotal = Optional.ofNullable(subtotal).orElse(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        Coupon coupon = couponRepository.findByCodeIgnoreCase(code.trim())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Coupon code is invalid"));
        Instant now = Instant.now();
        Instant startDate = Optional.ofNullable(coupon.getStartDate()).orElse(Instant.MIN);
        Instant endDate = Optional.ofNullable(coupon.getEndDate()).orElse(Instant.MAX);
        if (!CouponStatus.ENABLED.equals(coupon.getStatus()) || now.isBefore(startDate) || now.isAfter(endDate)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Coupon is not currently active");
        }
        if (!isAccessibleToUser(coupon, userId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "You are not eligible for this coupon");
        }
        if (coupon.getMinimumCartValue() != null && normalizedSubtotal.compareTo(coupon.getMinimumCartValue()) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cart value does not meet the coupon minimum");
        }
        BigDecimal discountAmount = calculateDiscount(coupon, normalizedSubtotal);
        if (discountAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Coupon cannot be applied to this order");
        }
        AppliedCouponDto dto = new AppliedCouponDto();
        dto.setId(coupon.getId());
        dto.setName(coupon.getName());
        dto.setCode(coupon.getCode());
        dto.setDiscountType(coupon.getDiscountType());
        dto.setDiscountValue(coupon.getDiscountValue());
        dto.setDiscountAmount(discountAmount);
        dto.setDescription(resolveDescription(coupon));
        return dto;
    }

    private String resolveDescription(Coupon coupon) {
        if (coupon == null) {
            return null;
        }
        if (StringUtils.hasText(coupon.getLongDescription())) {
            return coupon.getLongDescription();
        }
        if (StringUtils.hasText(coupon.getShortDescription())) {
            return coupon.getShortDescription();
        }
        return null;
    }

    private boolean isAccessibleToUser(Coupon coupon, Long userId) {
        if (coupon.getUsers() == null || coupon.getUsers().isEmpty()) {
            return true;
        }
        if (userId == null) {
            return false;
        }
        return coupon.getUsers().stream().anyMatch(user -> Objects.equals(user.getId(), userId));
    }

    private BigDecimal calculateDiscount(Coupon coupon, BigDecimal subtotal) {
        DiscountType discountType = coupon.getDiscountType();
        BigDecimal value = Optional.ofNullable(coupon.getDiscountValue()).orElse(BigDecimal.ZERO);
        BigDecimal result;
        if (DiscountType.PERCENTAGE.equals(discountType)) {
            result = subtotal.multiply(value).divide(ONE_HUNDRED, 4, RoundingMode.HALF_UP);
        } else {
            result = value;
        }
        if (result.compareTo(BigDecimal.ZERO) < 0) {
            result = BigDecimal.ZERO;
        }
        if (result.compareTo(subtotal) > 0) {
            result = subtotal;
        }
        return result.setScale(2, RoundingMode.HALF_UP);
    }

    private CheckoutCouponDto toCheckoutCouponDto(Coupon coupon) {
        CheckoutCouponDto dto = new CheckoutCouponDto();
        dto.setId(coupon.getId());
        dto.setName(coupon.getName());
        dto.setCode(coupon.getCode());
        dto.setShortDescription(coupon.getShortDescription());
        dto.setDiscountType(coupon.getDiscountType());
        dto.setDiscountValue(coupon.getDiscountValue());
        dto.setMinimumCartValue(coupon.getMinimumCartValue());
        dto.setStartDate(coupon.getStartDate());
        dto.setEndDate(coupon.getEndDate());
        return dto;
    }
}

