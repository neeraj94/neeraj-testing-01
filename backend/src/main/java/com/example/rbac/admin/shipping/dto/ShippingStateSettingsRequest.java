package com.example.rbac.admin.shipping.dto;

import java.math.BigDecimal;

public class ShippingStateSettingsRequest {
    private Boolean enabled;
    private BigDecimal overrideCost;
    private Boolean clearOverride;

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public BigDecimal getOverrideCost() {
        return overrideCost;
    }

    public void setOverrideCost(BigDecimal overrideCost) {
        this.overrideCost = overrideCost;
    }

    public Boolean getClearOverride() {
        return clearOverride;
    }

    public void setClearOverride(Boolean clearOverride) {
        this.clearOverride = clearOverride;
    }
}
