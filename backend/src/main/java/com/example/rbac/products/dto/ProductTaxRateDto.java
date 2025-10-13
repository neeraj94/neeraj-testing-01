package com.example.rbac.products.dto;

import com.example.rbac.finance.taxrate.model.TaxRateType;

import java.math.BigDecimal;

public class ProductTaxRateDto {

    private Long id;
    private String name;
    private TaxRateType rateType;
    private BigDecimal rateValue;

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

    public TaxRateType getRateType() {
        return rateType;
    }

    public void setRateType(TaxRateType rateType) {
        this.rateType = rateType;
    }

    public BigDecimal getRateValue() {
        return rateValue;
    }

    public void setRateValue(BigDecimal rateValue) {
        this.rateValue = rateValue;
    }
}
