package com.example.rbac.shipping.dto;

import java.math.BigDecimal;
import java.util.List;

public class ShippingCountryBulkSettingsRequest {

    private List<Long> ids;
    private Boolean enabled;
    private BigDecimal costValue;
    private Boolean clearCost;

    public List<Long> getIds() {
        return ids;
    }

    public void setIds(List<Long> ids) {
        this.ids = ids;
    }

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
