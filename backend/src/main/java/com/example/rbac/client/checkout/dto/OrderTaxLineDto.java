<<<<<<<< HEAD:backend/src/main/java/com/example/rbac/client/checkout/dto/OrderTaxLineDto.java
package com.example.rbac.client.checkout.dto;
========
package com.example.rbac.admin.checkout.dto;
>>>>>>>> origin/main:backend/src/main/java/com/example/rbac/admin/checkout/dto/OrderTaxLineDto.java

import java.math.BigDecimal;

public class OrderTaxLineDto {

    private Long productId;
    private String productName;
    private BigDecimal taxableAmount;
    private BigDecimal taxRate;
    private BigDecimal taxAmount;

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public BigDecimal getTaxableAmount() {
        return taxableAmount;
    }

    public void setTaxableAmount(BigDecimal taxableAmount) {
        this.taxableAmount = taxableAmount;
    }

    public BigDecimal getTaxRate() {
        return taxRate;
    }

    public void setTaxRate(BigDecimal taxRate) {
        this.taxRate = taxRate;
    }

    public BigDecimal getTaxAmount() {
        return taxAmount;
    }

    public void setTaxAmount(BigDecimal taxAmount) {
        this.taxAmount = taxAmount;
    }
}
