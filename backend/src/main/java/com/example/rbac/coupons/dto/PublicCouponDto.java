package com.example.rbac.coupons.dto;

import com.example.rbac.coupons.model.CouponType;
import com.example.rbac.products.model.DiscountType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class PublicCouponDto {

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
    private String imageUrl;
    private boolean applyToAllNewUsers;
    private List<CouponProductDto> products;
    private List<CouponCategoryDto> categories;

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

    public List<CouponProductDto> getProducts() {
        return products;
    }

    public void setProducts(List<CouponProductDto> products) {
        this.products = products;
    }

    public List<CouponCategoryDto> getCategories() {
        return categories;
    }

    public void setCategories(List<CouponCategoryDto> categories) {
        this.categories = categories;
    }
}
