package com.example.rbac.coupons.dto;

import com.example.rbac.coupons.model.CouponStatus;
import com.example.rbac.coupons.model.CouponType;
import com.example.rbac.products.model.DiscountType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class CouponRequest {

    @NotNull
    private CouponType type;

    @NotBlank
    @Size(max = 200)
    private String name;

    @NotBlank
    @Size(max = 80)
    private String code;

    @Size(max = 4000)
    private String shortDescription;

    private String longDescription;

    @NotNull
    private DiscountType discountType;

    @NotNull
    @DecimalMin(value = "0.0", inclusive = false)
    @Digits(integer = 10, fraction = 2)
    private BigDecimal discountValue;

    @Digits(integer = 10, fraction = 2)
    @PositiveOrZero
    private BigDecimal minimumCartValue;

    @NotNull
    private Instant startDate;

    @NotNull
    private Instant endDate;

    @NotNull
    private CouponStatus status;

    @Size(max = 500)
    private String imageUrl;

    private Boolean applyToAllNewUsers;

    private List<Long> productIds;

    private List<Long> categoryIds;

    private List<Long> userIds;

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

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public Boolean getApplyToAllNewUsers() {
        return applyToAllNewUsers;
    }

    public void setApplyToAllNewUsers(Boolean applyToAllNewUsers) {
        this.applyToAllNewUsers = applyToAllNewUsers;
    }

    public List<Long> getProductIds() {
        return productIds;
    }

    public void setProductIds(List<Long> productIds) {
        this.productIds = productIds;
    }

    public List<Long> getCategoryIds() {
        return categoryIds;
    }

    public void setCategoryIds(List<Long> categoryIds) {
        this.categoryIds = categoryIds;
    }

    public List<Long> getUserIds() {
        return userIds;
    }

    public void setUserIds(List<Long> userIds) {
        this.userIds = userIds;
    }
}
