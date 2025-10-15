package com.example.rbac.coupons.dto;

import com.example.rbac.coupons.model.CouponStatus;
import com.example.rbac.coupons.model.CouponType;
import com.example.rbac.products.model.DiscountType;

import java.math.BigDecimal;
import java.time.Instant;

public class CouponSummaryDto {

    private Long id;
    private CouponType type;
    private String name;
    private String code;
    private String shortDescription;
    private String longDescription;
    private DiscountType discountType;
    private BigDecimal discountValue;
    private BigDecimal minimumCartValue;
    private Instant startDate;
    private Instant endDate;
    private CouponStatus status;
    private CouponState state;
    private String imageUrl;
    private boolean applyToAllNewUsers;
    private Instant createdAt;
    private Instant updatedAt;
    private Integer productCount;
    private Integer categoryCount;
    private Integer userCount;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public CouponType getType() {
        return type;
    }

    public void setType(CouponType type) {
        this.type = type;
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

    public String getLongDescription() {
        return longDescription;
    }

    public void setLongDescription(String longDescription) {
        this.longDescription = longDescription;
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

    public CouponStatus getStatus() {
        return status;
    }

    public void setStatus(CouponStatus status) {
        this.status = status;
    }

    public CouponState getState() {
        return state;
    }

    public void setState(CouponState state) {
        this.state = state;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public boolean isApplyToAllNewUsers() {
        return applyToAllNewUsers;
    }

    public void setApplyToAllNewUsers(boolean applyToAllNewUsers) {
        this.applyToAllNewUsers = applyToAllNewUsers;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Integer getProductCount() {
        return productCount;
    }

    public void setProductCount(Integer productCount) {
        this.productCount = productCount;
    }

    public Integer getCategoryCount() {
        return categoryCount;
    }

    public void setCategoryCount(Integer categoryCount) {
        this.categoryCount = categoryCount;
    }

    public Integer getUserCount() {
        return userCount;
    }

    public void setUserCount(Integer userCount) {
        this.userCount = userCount;
    }
}
