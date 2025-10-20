package com.example.rbac.client.checkout.dto;

import com.example.rbac.admin.products.model.DiscountType;

import java.math.BigDecimal;
import java.time.Instant;

public class CheckoutCouponDto {

    private Long id;
    private String name;
    private String code;
    private String shortDescription;
    private DiscountType discountType;
    private BigDecimal discountValue;
    private BigDecimal minimumCartValue;
    private Instant startDate;
    private Instant endDate;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getShortDescription() {
        return shortDescription;
    }

    public void setShortDescription(String shortDescription) {
        this.shortDescription = shortDescription;
    }

    public DiscountType getDiscountType() {
        return discountType;
    }

    public void setDiscountType(DiscountType discountType) {
        this.discountType = discountType;
    }

    public BigDecimal getDiscountValue() {
        return discountValue;
    }

    public void setDiscountValue(BigDecimal discountValue) {
        this.discountValue = discountValue;
    }

    public BigDecimal getMinimumCartValue() {
        return minimumCartValue;
    }

    public void setMinimumCartValue(BigDecimal minimumCartValue) {
        this.minimumCartValue = minimumCartValue;
    }

    public Instant getStartDate() {
        return startDate;
    }

    public void setStartDate(Instant startDate) {
        this.startDate = startDate;
    }

    public Instant getEndDate() {
        return endDate;
    }

    public void setEndDate(Instant endDate) {
        this.endDate = endDate;
    }
}

