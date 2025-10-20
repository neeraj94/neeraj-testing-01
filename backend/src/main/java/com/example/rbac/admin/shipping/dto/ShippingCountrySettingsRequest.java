package com.example.rbac.admin.shipping.dto;

import java.math.BigDecimal;

public class ShippingCountrySettingsRequest {
    private Boolean enabled;
    private BigDecimal costValue;
    private Boolean clearCost;

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public BigDecimal getCostValue() {
        return costValue;
    }

    public void setCostValue(BigDecimal costValue) {
        this.costValue = costValue;
    }

    public Boolean getClearCost() {
        return clearCost;
    }

    public void setClearCost(Boolean clearCost) {
        this.clearCost = clearCost;
    }
}
