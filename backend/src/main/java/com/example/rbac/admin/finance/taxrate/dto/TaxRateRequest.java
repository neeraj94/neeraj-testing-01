package com.example.rbac.admin.finance.taxrate.dto;

import com.example.rbac.admin.finance.taxrate.model.TaxRateType;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

public class TaxRateRequest {

    @NotBlank(message = "Tax name is required")
    private String name;

    @NotNull(message = "Tax rate type is required")
    private TaxRateType rateType;

    @NotNull(message = "Tax rate value is required")
    @PositiveOrZero(message = "Tax rate value must be zero or greater")
    @Digits(integer = 8, fraction = 4, message = "Tax rate value must have at most 8 digits and 4 decimals")
    private BigDecimal rateValue;

    private String description;

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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
