<<<<<<<< HEAD:backend/src/main/java/com/example/rbac/client/checkout/dto/AppliedCouponDto.java
package com.example.rbac.client.checkout.dto;
========
package com.example.rbac.admin.checkout.dto;
>>>>>>>> origin/main:backend/src/main/java/com/example/rbac/admin/checkout/dto/AppliedCouponDto.java

import com.example.rbac.admin.products.model.DiscountType;

import java.math.BigDecimal;

public class AppliedCouponDto {

    private Long id;
    private String name;
    private String code;
    private DiscountType discountType;
    private BigDecimal discountValue;
    private BigDecimal discountAmount;
    private String description;

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

    public BigDecimal getDiscountAmount() {
        return discountAmount;
    }

    public void setDiscountAmount(BigDecimal discountAmount) {
        this.discountAmount = discountAmount;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}

